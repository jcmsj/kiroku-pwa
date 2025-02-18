import { detect, make_template } from "./adapt";

// Define message types
type TemplateWorkerMessage = {
    type: 'GENERATE_TEMPLATE';
    payload: {
        imgUrl: string;
        yoloPath: string;
        wasmPath: string;
    };
};

addEventListener('message', async (e: MessageEvent<TemplateWorkerMessage>) => {
    console.log("Worker received message", e.data);
    if (e.data.type === 'GENERATE_TEMPLATE') {
        try {
            const { imgUrl, yoloPath, wasmPath } = e.data.payload;
            const onProgress = (stage: string, progress: number) => {
                postMessage({ 
                    type: 'PROGRESS', 
                    payload: { stage, progress } 
                });
            };
            console.log("Generating template");
            const template = await detect(imgUrl, yoloPath, wasmPath, onProgress).catch(console.log);
            postMessage({ type: 'SUCCESS', payload: template });
        } catch (error) {
            postMessage({ type: 'ERROR', payload: error.message });
        }
    }
});
