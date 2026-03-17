import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const ee3Dir = path.dirname(require.resolve('eventemitter3'));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      events: path.join(ee3Dir, 'index.mjs'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(path.dirname(new URL(import.meta.url).pathname), 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        'zustand/react/shallow',
        'sonner',
        'react-force-graph-2d',
        'd3-force',
        'd3-scale-chromatic',
        '@similar-artists-graph/engine',
      ],
    },
    outDir: 'dist-lib',
  },
});
