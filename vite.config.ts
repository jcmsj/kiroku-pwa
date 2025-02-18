import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'
import VueRouter from 'unplugin-vue-router/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { nodePolyfills } from "vite-plugin-node-polyfills";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({}),
    vue(),
    Components({
      resolvers: [
        IconsResolver({
          componentPrefix: '',
          enabledCollections: ['material-symbols'],
          alias: {
            'ms': 'material-symbols',
          },
        }),
      ]
    }),
    Icons({
      compiler: 'vue3',
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // https://vite-pwa-org.netlify.app/guide/faq.html#missing-assets-from-sw-precache-manifest
      workbox: {
        maximumFileSizeToCacheInBytes: 30_000_000
      }
     }),
    // Need to polyfill buffer for use by @jimp/wasm-webp
    nodePolyfills({ include: ["buffer"] }),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/onnxruntime-web/dist/*.wasm",
          dest: '.',
        },
      ],
    }),
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ["@jsquash/webp"],
  },
  base: '/kiroku-pwa/',
})
