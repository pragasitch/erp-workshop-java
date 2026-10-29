import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  // No `clean`: the running apps watch dist/, so files are overwritten in place instead.
});
