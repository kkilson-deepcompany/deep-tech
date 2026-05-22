import { defineConfig, type UserConfig } from 'vite';
import type { InlineConfig } from 'vitest/node';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// vite (directo) y vitest resuelven versiones distintas de vite en este
// monorepo; intersectar el tipo deja declarar `test` sin choque de tipos.
const config: UserConfig & { test: InlineConfig } = {
  plugins: [react()],
  // El .env.local vive en la raíz del monorepo, no en apps/web.
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // `/mnt/c` (FS de Windows vía WSL) no emite eventos inotify fiables: sin
  // polling, el HMR de Vite nunca detecta los cambios de archivos.
  server: { port: 5173, watch: { usePolling: true, interval: 300 } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
};

export default defineConfig(config);
