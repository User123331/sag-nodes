import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  noExternal: ['p-queue', 'graphology', 'graphology-traversal', 'string-similarity'],
});
