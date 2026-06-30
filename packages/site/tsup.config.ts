import { defineConfig } from 'tsup';

// ESM-only because build.ts uses `import.meta.url` to locate the bundled
// template directory at runtime.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node20',
  // `sharp` (images) + `esbuild` (minify) are optional and native — must NOT be
  // bundled (they break under esbuild's `require` shim). Lazy-loaded at runtime.
  external: ['sharp', 'esbuild'],
});
