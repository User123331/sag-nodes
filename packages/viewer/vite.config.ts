import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const ee3Dir = path.dirname(require.resolve('eventemitter3'));

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/deezer-proxy': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deezer-proxy/, ''),
      },
    },
  },
  resolve: {
    alias: {
      events: path.join(ee3Dir, 'index.mjs'),
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle the workspace engine package through esbuild.
    // Without this, Vite serves the pre-built dist directly and the resolve.alias
    // for 'events' (Node built-in used by graphology) is never applied — the import
    // gets stubbed as __vite-browser-external and the whole module silently breaks.
    include: ['@similar-artists-graph/engine'],
  },
});
