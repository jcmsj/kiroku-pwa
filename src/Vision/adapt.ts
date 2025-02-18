import { load, norm, scale, Jimp } from "./helpers";
import { OUTPUT_DIM, predictWithYolo } from "./predict";
import { ocr } from "./ocr";
import { createWorker, PSM } from "tesseract.js";
import { ANSWER, to_string as funsd_cls_from, QUESTION } from "./funsd";
import type { CocoField, TemplateField, TemplatePage } from "../types";

function randomUUID() {
    // check if window or in worker
    if (typeof window !== 'undefined') {
        return window.crypto.randomUUID();
    }
    return self.crypto.randomUUID();
}

export async function detect(
    imgUrl:string, 
    yolo_funsd: string, 
    wasm_path:string,
    onProgress?: (stage: string, progress: number) => void
): Promise<CocoField[]> {
    onProgress?.('Loading model and image', 10);
    const session = await load(yolo_funsd, wasm_path);
    const j = await Jimp.read(imgUrl)

    onProgress?.('Analyzing document', 30);
    const [predictions] = await predictWithYolo(j, session);
    const { data } = predictions[Object.keys(predictions)[0]];
    const cropped:CocoField[] = [];
    console.log("Processing detections", data);

    onProgress?.('Processing detections', 50);
    for (let i = 0; i < data.length; i += OUTPUT_DIM) {
        // These coordinates are scaled to the input size of the model
        const [x1, y1, x2, y2, confidence, cls_index] = data.slice(i, i + OUTPUT_DIM);
        // check if the coords are number types
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number' || typeof confidence !== 'number' || typeof cls_index !== 'number') {
            continue;
        }

        if (confidence < 0.1) {
            continue;
        }

        const nbbox = norm(x1, y1, x2, y2);
        const bbox = scale(j, nbbox);
        const width = bbox[2] - bbox[0];
        const height = bbox[3] - bbox[1];
        const nwidth = width / j.width;
        const nheight  = height / j.height;
        const nx = bbox[0] / j.width;
        const ny = bbox[1] / j.height;
        // TODO: Adjust PSM based on classification
        cropped.push({
            cls: cls_index,
            // confidence,
            id: randomUUID(),
            width: nwidth,
            height: nheight,
            x: nx,
            y: ny,
        });
        
    }

    return cropped;

}
/**
 * Note: a new template page id is generated, must override this when updating existing ones
 */
export async function make_template(
    imgUrl:string, 
    yolo_funsd: string, 
    wasm_path:string,
    onProgress?: (stage: string, progress: number) => void
): Promise<Pick<TemplatePage, "fields" | "originalWidth" | "originalHeight" | "template_page_id">> {
    onProgress?.('Loading model and image', 10);
    const session = await load(yolo_funsd, wasm_path);
    const j = await Jimp.read(imgUrl)

    onProgress?.('Analyzing document', 30);
    const [predictions] = await predictWithYolo(j, session);
    const { data } = predictions[Object.keys(predictions)[0]];
    const cropped = [];
    console.log("Processing detections", data);

    onProgress?.('Processing detections', 50);
    for (let i = 0; i < data.length; i += OUTPUT_DIM) {
        // These coordinates are scaled to the input size of the model
        const [x1, y1, x2, y2, confidence, cls_index] = data.slice(i, i + OUTPUT_DIM);
        // check if the coords are number types
        if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number' || typeof confidence !== 'number' || typeof cls_index !== 'number') {
            continue;
        }

        if (confidence < 0.1) {
            continue;
        }

        const nbbox = norm(x1, y1, x2, y2);
        const bbox = scale(j, nbbox);
        const width = bbox[2] - bbox[0];
        const height = bbox[3] - bbox[1];
        const nwidth = width / j.width;
        const nheight  = height / j.height;
        // TODO: Adjust PSM based on classification
        const psm = parseInt(PSM.AUTO);
        cropped.push({
            bbox,
            psm,
            cls_index,
            cls: funsd_cls_from(cls_index),
            confidence,
            id: randomUUID(),
            width,
            height,
            nbbox,
            nheight,
            nwidth,
        });
        
    }

    const [questions, answers] = split_detection(cropped);
    const associated_qna = associateQna(questions, answers);
    const paired: TemplateField[] = [];
    const worker = await createWorker("eng");
    
    onProgress?.('Performing OCR', 70);
    const doubled = j.clone().resize({w:j.width * 2, h:j.height * 2});
    await ocr(doubled, PSM.AUTO, worker);

    let processedFields = 0;
    const totalFields = associated_qna.length;

    for (const [q, a, _d] of associated_qna) {
        // The bbox will be the answer, but the field's name will be the ocr result of the question
        // Must clone before cropping, since the crop method modifies the original image
        const croppedQuestionImage = doubled.clone().crop({
            x: q.bbox[0] * 2,
            y: q.bbox[1] * 2,
            w: q.width * 2,
            h: q.height * 2,
        });
        paired.push({
            id: a.id,
            bbox: {
                x: a.nbbox[0],
                y: a.nbbox[1],
                width: a.nwidth,
                height: a.nheight,
            },
            name: await ocr(croppedQuestionImage, q.psm, worker),
            psm: q.psm,
        });
        
        processedFields++;
        onProgress?.('Processing fields', 70 + (processedFields / totalFields) * 25);
    }
    
    await worker.terminate();
    onProgress?.('Complete', 100);
    
    return {
        fields: paired,
        originalWidth: j.width,
        originalHeight: j.height,
        template_page_id: crypto.randomUUID(),
    }
}

function split_detection<T extends { cls_index: number }>(detections: T[]): T[][] {
    const questions = [];
    const answers = [];
    for (let i = 0; i < detections.length; i++) {
        const detection = detections[i];
        if (detection.cls_index === QUESTION) {
            questions.push(detection);
        } else if (detection.cls_index === ANSWER) {
            answers.push(detection);
        }
    }
    return [questions, answers];
}

function dist(a: number, b: number): number {
    // euclidean distance
    return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
}

function getBoxDistance(qbox: number[], abox: number[]): number {
    const [qx1, qy1, qx2, qy2] = qbox;
    const [ax1, ay1, ax2, ay2] = abox;
    const d1 = dist(qx2 - ax1, qy1 - ay1);
    const d2 = dist(qx1 - ax1, qy2 - ay1);
    const d3 = dist((qx1 + qx2) / 2 - (ax1 + ax2) / 2, qy2 - ay1);
    return Math.min(d1, d2, d3);
}

// Added function: associateQna
type BboxId = { bbox: number[]; id: string };
function associateQna<Q extends BboxId, A extends BboxId>(
    questions: Q[],
    answers: A[]
): [Q, A, number][] {
    let qnaDistances: [Q, A, number][] = [];

    for (const q of questions) {
        for (const a of answers) {
            qnaDistances.push([q, a, getBoxDistance(q.bbox, a.bbox)]);
        }
    }

    qnaDistances.sort((a, b) => a[2] - b[2])
    const associatedQna: [typeof questions[number], typeof answers[number], number][] = [];

    while (qnaDistances.length > 0) {
        const [q, a, distance] = qnaDistances.shift()!;
        associatedQna.push([q, a, distance]);

        qnaDistances = qnaDistances.filter(([q1, a1]) => q1.id !== q.id && a1.id !== a.id);
    }

    return associatedQna;
}
