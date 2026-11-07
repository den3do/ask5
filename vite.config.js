import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/ask5/',
  build: {
    rollupOptions: {
      output: {
        // 將大型第三方套件拆開，改善首次載入與快取
        manualChunks: {
          iztro: ['iztro'],
          astronomy: ['astronomy-engine'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
