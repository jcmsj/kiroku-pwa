import {type Mat } from '@techstark/opencv-js';
import ort, {Tensor} from "onnxruntime-web/webgpu"
import { createJimp } from "@jimp/core";
import { defaultFormats, defaultPlugins } from "jimp";
import webp from "@jimp/wasm-webp";
// import {default as cv} from "@techstark/opencv-js"
// A custom jimp that supports webp
export const Jimp = createJimp({
  formats: [...defaultFormats, webp],
  plugins: defaultPlugins,
});

export type JimpInstance = Awaited<ReturnType<typeof Jimp['read']>>;
/**
 * [batch, channels (r,g,b), height, width], e.g. [1, 3, 864, 864]
 */
export type DetectionShape = [number, number, number, number];
export const PREDICTION_BATCH_SIZE = 1;
export const CHANNELS = 3;
export const INPUT_IMG_HEIGHT = 864;
export const INPUT_IMG_WIDTH = 864;
export const INPUT_IMG_SIZE = 864;
export const YOLO_SHAPE: DetectionShape = [PREDICTION_BATCH_SIZE, CHANNELS, INPUT_IMG_WIDTH, INPUT_IMG_HEIGHT];

export async function getImageTensorFromPath(path: string, dims: DetectionShape = YOLO_SHAPE): Promise<Tensor> {
    // 1. load the image  
    const image = await loadImagefromPath(path, dims[2], dims[3])
    // 2. convert to tensor
    return imageDataToTensor(image, dims);
}

export async function loadImagefromPath(path: string, width: number = 864, height: number = 864) {
    // Use Jimp to load the image and resize it.
    const imageData = await Jimp.read(path)
        .then((imageBuffer) => {
            return imageBuffer.resize({
                h: height,
                w: width,
            });
        });

    return imageData;
}

export function imageDataToTensor(image: JimpInstance, dims: DetectionShape): Tensor {
    // 1. Get buffer data from image and create R, G, and B arrays.
    const imageBufferData = image.bitmap.data;
    const [redArray, greenArray, blueArray]: number[][] = [[], [], []];

    // 2. Loop through the image buffer and extract the R, G, and B channels
    for (let i = 0; i < imageBufferData.length; i += 4) {
        redArray.push(imageBufferData[i]);
        greenArray.push(imageBufferData[i + 1]);
        blueArray.push(imageBufferData[i + 2]);
        // skip data[i + 3] to filter out the alpha channel
    }

    // 3. Concatenate RGB to transpose [224, 224, 3] -> [3, 224, 224] to a number array
    const transposedData = redArray.concat(greenArray).concat(blueArray);

    // 4. convert to float32
    const l = transposedData.length; // length, we need this for the loop
    // create the Float32Array size 3 * 224 * 224 for these dimensions output
    const float32Data = new Float32Array(dims[1] * dims[2] * dims[3]);
    for (let i = 0; i < l; i++) {
        float32Data[i] = transposedData[i] / 255.0; // convert to float
    }
    // 5. create the tensor object from onnxruntime-web.
    return new Tensor("float32", float32Data, dims);
}

export function getIou(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number): number {

    const ax2 = ax + aw;
    const ay2 = ay + ah;
    const bx2 = bx + bw;
    const by2 = by + bh;

    // Test if the boxes intersect
    const x_intersect = (bx < ax && ax < bx2) || (bx < ax2 && ax2 < bx2) || (ax < bx && bx < ax2) || (ax < bx2 && bx2 < ax2);
    const y_intersect = (by < ay && ay < by2) || (by < ay2 && ay2 < by2) || (ay < by && by < ay2) || (ay < by2 && by2 < ay2);

    if (x_intersect && y_intersect) {
        const xs = [ax, bx, ax2, bx2].sort((a, b) => a - b);
        const ys = [ay, by, ay2, by2].sort((a, b) => a - b);
        const ix = xs[1];
        const iy = ys[1];
        const iw = xs[2] - ix;
        const ih = ys[2] - iy;

        const intersection = iw * ih;
        const union = aw * ah + bw * bh - intersection;

        return intersection / union;
    } else {
        return 0;
    }
}

export async function load(model_url: string, wasm_path: string) {
    ort.env.wasm.wasmPaths = wasm_path;
    const bytes = await fetch(model_url, {
        mode: 'cors',
    })
        .then((response) => response.arrayBuffer())
        .catch(console.log);
    const session = await ort.InferenceSession.create(bytes, {
        executionProviders: ["webgpu","wasm"],
        intraOpNumThreads: 2,
    }).catch(console.log);

    return session;
}

export const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";  // Handle CORS issues
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error(`Failed to load image: ${e}`));
        img.src = url;
    });
}

export async function htmlImageElementToBuffer(img: HTMLImageElement): Promise<ArrayBuffer> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error("Could not get 2d context from canvas");
    }
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg');
    const blob = await fetch(dataUrl).then(res => res.blob());
    return await blob.arrayBuffer();
}
type XYXY = [number, number, number, number];
type N_XYXY = [number, number, number, number];

export function norm(x1: number, y1: number, x2: number, y2: number):N_XYXY {
    // normalize by dividing by model input size
    const  nx1 = x1 / INPUT_IMG_SIZE;
    const  ny1 = y1 / INPUT_IMG_SIZE;
    const  nx2 = x2 / INPUT_IMG_SIZE;
    const  ny2 = y2 / INPUT_IMG_SIZE;
    return [
        nx1,
        ny1,
        nx2,
        ny2
    ]
}

export function scale(image:{width:number, height:number}, [nx1, ny1, nx2, ny2]:N_XYXY):XYXY {
    const iw = image.width;
    const ih = image.height;
    const sx1 = nx1 * iw;
    const sy1 = ny1 * ih;
    const sx2 = nx2 * iw;
    const sy2 = ny2 * ih;
    return [sx1, sy1, sx2, sy2];
}

// export function matToElement(mat:Mat):HTMLCanvasElement {
//     const canvas = document.createElement('canvas');
//     cv.imshow(canvas, mat);
//     return canvas;
// }

export function matToBlob(mat: Mat): Blob {
    let blob = new Blob([mat.data], { type: 'image/jpeg' });
    return blob;
}
