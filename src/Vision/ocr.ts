import Tesseract, { PSM } from "tesseract.js"
import { type JimpInstance } from "./helpers"

export async function ocr(img: JimpInstance, psm: PSM, worker: Tesseract.Worker): Promise<string> {

    await worker.setParameters({
        tessedit_pageseg_mode: psm,
    })
    img = img.clone().resize({w:img.width * 2, h:img.height * 2});
    const { data: { text } } = await worker.recognize(await img.getBuffer('image/png').catch(console.log));
    return text;
}
