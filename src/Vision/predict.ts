import { InferenceSession, Tensor } from "onnxruntime-web/webgpu";
import { imageDataToTensor, type JimpInstance, YOLO_SHAPE } from "./helpers";

/**
 * Runs the YOLO model on the given image and returns the predictions and the duration of the inference.
 * 
 * The predictions has the following shape:
 *  [batch size, [x1,y1,x2,y2, confidence, classification], number of detections]
 */
export async function predictWithYolo(j:JimpInstance, session: InferenceSession): Promise<[InferenceSession.OnnxValueMapType, number, Tensor]> {
    // Convert Mat to Jimp
    // const buff = await blob.arrayBuffer();
    // const jimpImg = j;
    const jimpImg = j.resize({
            w: YOLO_SHAPE[2],
            h: YOLO_SHAPE[3],
        })
    console.log("Converting to tensor", jimpImg);
    const imageTensor = imageDataToTensor(jimpImg, YOLO_SHAPE);
    console.log("Starting inference");
    const start = performance.now();
    const feeds: Record<string, Tensor> = {};
    const inputName = session.inputNames[0];
    feeds[inputName] = imageTensor;
    const predictions = await session.run(feeds).catch(console.log);
    const inferenceTime = performance.now() - start;
    return [predictions, inferenceTime, imageTensor];
}

export const OUTPUT_DIM = 6;
