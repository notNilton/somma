import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3410,
    host: true,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3310',
        changeOrigin: true,
      },
    },
  },
})
