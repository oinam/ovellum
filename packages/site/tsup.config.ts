import { defineConfig } from 'tsup';

// ESM-only because build.ts uses `import.meta.url` to locate the bundled
// template directory at runtime.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node20',
});
