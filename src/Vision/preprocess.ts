import { type Mat, default as cv } from "@techstark/opencv-js";
// Type definitions
type ImageProcessingFn = (image: Mat) => Mat;
type ProcessedImages = Record<string, Mat>;

// Core processing functions
const original = (image: Mat): Mat => image.clone();

const gray2bgr = (image: Mat): Mat => {
    const result = new cv.Mat();

    cv.cvtColor(image, result, cv.COLOR_GRAY2BGR);
    return result;
};

const bgr2rgb = (image: Mat): Mat => {
    const result = new cv.Mat();

    cv.cvtColor(image, result, cv.COLOR_BGR2RGB);
    return result;
};

const rgb2gray = (image: Mat): Mat => {
    const result = new cv.Mat();
    cv.cvtColor(image, result, cv.COLOR_RGB2GRAY);
    return result;
};

const threshold = (image: Mat): Mat => {
    const result = new cv.Mat();
    cv.threshold(image, result, 0, 255, cv.THRESH_OTSU);
    return result;
};

const denoise = (image: Mat): Mat => {
    const result = new cv.Mat();
    // Note: OpenCV.js doesn't have fastNlMeansDenoising
    // Using alternative denoising method
    cv.medianBlur(image, result, 3);
    return result;
};

const Kernel = () => cv.Mat.ones(3, 3, cv.CV_8U);
const Anchor = () => new cv.Point(-1, -1);
const dilate = (image: Mat): Mat => {
    const result = new cv.Mat();
    cv.dilate(image, result, Kernel(), Anchor(), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    return result;
};


const erode = (image: Mat): Mat => {
    const result = new cv.Mat();
    cv.erode(image, result, Kernel(), Anchor(), 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    return result;
};

const addBorder: ImageProcessingFn = (image: Mat): Mat => {
    const result = new cv.Mat();

    const borderColor = new cv.Scalar(255, 255, 255);
    cv.copyMakeBorder(image, result, 10, 10, 10, 10, cv.BORDER_CONSTANT, borderColor);
    return result;
};

// Pipeline functions
const individualPreprocess = (steps: ImageProcessingFn[], image: Mat): ProcessedImages => {
    const results: ProcessedImages = {};
    steps.forEach(step => {
        const processedImage = step(image);
        results[step.name] = bgr2rgb(processedImage);
    });
    return results;
};

const transformationsPreprocess = (steps: [ImageProcessingFn, ...ImageProcessingFn[]], image: Mat): ProcessedImages => {
    const results: ProcessedImages = {};
    steps.reduce((img, step, index) => {
        const processed = step(img);
        results[`${index}:${step.name}`] = processed;
        return processed;
    }, image);
    return results;
};

const preprocess = (methods: [ImageProcessingFn, ...ImageProcessingFn[]], image: Mat): Mat => {
    return methods.reduce((img, method) => method(img), image);
};

export const preprocessFromImgElement = (methods: [ImageProcessingFn, ...ImageProcessingFn[]], imgElement: HTMLImageElement): Mat => {
    const image = cv.imread(imgElement);
    const processed = preprocess(methods, image);
    // image.delete();
    return processed;
}

// Default preprocessing steps
export const steps: [ImageProcessingFn, ...ImageProcessingFn[]] = [denoise];
// export const steps: [ImageProcessingFn, ...ImageProcessingFn[]] = [original];

// Clean up function
const cleanup = (...mats: Mat[]) => {
    mats.forEach(mat => {
        if (mat) mat.delete();
    });
};

export {
    preprocess,
    individualPreprocess,
    transformationsPreprocess,
    cleanup,
    // Export individual functions for flexibility
    original, gray2bgr, bgr2rgb, rgb2gray,
    threshold, denoise, dilate, erode, addBorder
};
