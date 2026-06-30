import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

// Inline the package version at build time so `ovellum --version` reports it
// without a runtime file read. Referenced as `__OVELLUM_VERSION__` in src.
const define = { __OVELLUM_VERSION__: JSON.stringify(version) };

// Bundle every internal `@ovellum/*` workspace package into the artifact. Those
// packages are `private: true` and never published to npm, so consumers cannot
// resolve them as separate deps — inlining keeps internal boundaries clean for
// development while shipping a self-contained package. Third-party deps (shiki,
// lucide, unified, c12, ts-morph, …) stay external; npm pulls them in at install.
const noExternal = [/^@ovellum\//];
// ESM-only: the package is `type: module`, the bin is ESM, and core deps like
// pagefind ship ESM-only — so a CJS build can't even `require()` cleanly. CJS
// consumers can use dynamic `import()`.
const shared = {
  format: ['esm'] as const,
  sourcemap: true,
  target: 'node20' as const,
  define,
  noExternal,
  // `sharp` is an OPTIONAL peer (B9 image optimization) — keep it external even
  // though `@ovellum/site` is inlined, so the lazy `import('sharp')` resolves the
  // real (CJS, native) package from the consumer's node_modules at runtime.
  // Bundling it produces an esbuild `require` shim that throws at load.
  external: ['sharp'],
};

export default defineConfig([
  // CLI binary — gets the shebang; runs the command on execution.
  {
    ...shared,
    entry: ['src/index.ts'],
    banner: { js: '#!/usr/bin/env node' },
    clean: true,
  },
  // Programmatic library entry (D2) — no shebang (it's imported, not executed),
  // and `dts: true` so the declarations are rolled up self-contained (the
  // bundled `@ovellum/*` types are inlined, since those packages aren't published).
  {
    ...shared,
    entry: ['src/api.ts'],
    // `resolve` inlines the bundled `@ovellum/*` types into the declaration so
    // the published package is self-contained (those packages aren't published).
    dts: { resolve: [/^@ovellum\//] },
    // Non-composite tsconfig so the declaration pass can compile the whole src
    // tree (the composite main config requires every file be listed).
    tsconfig: 'tsconfig.dts.json',
    clean: false,
  },
]);
