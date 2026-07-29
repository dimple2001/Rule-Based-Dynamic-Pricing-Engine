import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/auth': {
        target: 'http://localhost:5002',
        changeOrigin: true
      },
      '/api/reviews': {
        target: 'http://localhost:5002',
        changeOrigin: true
      },
      '/api/calculate-price': {
        target: 'http://localhost:5001',
        changeOrigin: true
      },
      '/api/calculate-prices-batch': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})
