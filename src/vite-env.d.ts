/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />
interface ImportMetaEnv {
    readonly VITE_YOLO_MODEL_URL: string
    readonly VITE_WASM_PATH: string
    // more env variables...
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
