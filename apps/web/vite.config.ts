declare const process: { env: Record<string, string | undefined> }

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3400,
    proxy: {
      '/api': {
        target: process.env.API_URL ?? 'http://localhost:3300',
        changeOrigin: true,
      },
    },
  },
  build: { outDir: 'dist' },
})
