import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react({
    jsxRuntime: 'classic'
  })],
  esbuild: {
    logLevel: 'info',
    logLimit: 0
  },
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
    include: ['react-pdf', 'pdfjs-dist', '@emotion/react', '@emotion/styled']
  },
  build: {
    rollupOptions: {
      // Remove any external dependencies - bundle everything
      external: [],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          emotion: ['@emotion/react', '@emotion/styled']
        }
      },
      onwarn(warning, warn) {
        // Suppress all export-related warnings
        if (warning.message.includes('is not exported by') ||
            warning.message.includes('useContext') ||
            warning.message.includes('useState') ||
            warning.message.includes('forwardRef') ||
            warning.message.includes('createElement')) {
          return;
        }
        warn(warning);
      }
    },
    commonjsOptions: {
      include: [/react-pdf/, /pdfjs-dist/, /node_modules/],
      transformMixedEsModules: true
    }
  }
})
