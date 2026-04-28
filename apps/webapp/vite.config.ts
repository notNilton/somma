import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const config = defineConfig({
  server: {
    port: 3400,
    proxy: {
      '/api': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
  ],
});

export default config;
