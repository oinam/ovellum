import { defineConfig } from 'tsup';

// ESM-only because build.ts uses `import.meta.url` to locate the bundled
// template directory at runtime.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node20',
  // `sharp` (B9, optional) must NOT be bundled — it's a native CJS module that
  // breaks under esbuild's `require` shim. Lazy-loaded from node_modules instead.
  external: ['sharp'],
});
