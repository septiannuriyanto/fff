import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, // naikin batas warning jadi 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          'exceljs': ['exceljs'],
          'qrcode': ['qrcode'],
          'lucide-react': ['lucide-react'],
        },
      },
    },
  },
})
