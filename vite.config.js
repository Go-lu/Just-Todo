import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  define: {
    __JUSTTODO_BUILD_TAG__: JSON.stringify(process.env.JUSTTODO_BUILD_TAG || new Date().toISOString())
  }
})
