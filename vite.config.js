import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/web-ifc/')) return 'web-ifc';
          if (id.includes('/node_modules/three/')) return 'three';
        },
      },
    },
  },
  server: {
    port: 5173,
    host: false,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
    watch: {
      ignored: ['**/backend/.data/**'],
    },
  },
});
