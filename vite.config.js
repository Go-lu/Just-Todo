import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  define: {
    __JUSTTODO_BUILD_TAG__: JSON.stringify(process.env.JUSTTODO_BUILD_TAG || new Date().toISOString())
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('html2canvas')) return 'html2canvas'
          if (id.includes('jspdf')) return 'jspdf'
          if (id.includes('canvas-confetti')) return 'effects'
          if (id.includes('vuedraggable')) return 'drag'
          if (id.includes('dayjs')) return 'dayjs'
          if (id.includes('/vue/') || id.includes('\\vue\\')) return 'vue'
          return 'vendor'
        }
      }
    }
  }
})
