import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {}
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  optimizeDeps: {
    include: ['react-pdf', 'pdfjs-dist']
  },
  build: {
    commonjsOptions: {
      include: [/react-pdf/, /pdfjs-dist/]
    }
  }
})
