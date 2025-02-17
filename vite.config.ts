import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'
import tailwindcss from "@tailwindcss/vite"
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
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
  ],
})
