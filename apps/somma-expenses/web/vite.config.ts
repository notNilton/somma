declare const process: { env: Record<string, string | undefined> }

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'somma-expenses',
        short_name: 'somma-expenses',
        description: 'Cadastro simples de gastos no crédito e débito/pix',
        theme_color: '#111827',
        background_color: '#eef2f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/v1\/transactions/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'somma-expenses-transactions',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^\/api\/v1\/dashboard/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'somma-expenses-dashboard',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 4,
            },
          },
        ],
      },
    }),
  ],
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
