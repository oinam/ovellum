import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  sourcemap: true,
  clean: true,
  target: 'node20',
  banner: { js: '#!/usr/bin/env node' },

  // Bundle every internal `@ovellum/*` workspace package into a single
  // self-contained CLI artifact. Those packages are `private: true` and
  // never published to npm, so consumers of `npm install ovellum` cannot
  // resolve them as separate deps. Inlining at build time keeps internal
  // boundaries clean for development while shipping one tarball to users.
  //
  // Third-party deps (shiki, lucide, unified, c12, ts-morph, etc.) stay
  // external — they're real npm packages declared in this package's
  // `dependencies` and npm pulls them in at install time.
  noExternal: [/^@ovellum\//],
});
