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
    include: ['react-pdf', 'pdfjs-dist']
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Externalize problematic dependencies
        return id.includes('hoist-non-react-statics') || 
               id.includes('@emotion/react');
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
