import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(rootDir, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    host: true, // also reachable from your phone on the same Wi-Fi: http://<your-computer-IP>:5173
  },
});
