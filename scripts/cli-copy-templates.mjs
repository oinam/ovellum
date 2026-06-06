#!/usr/bin/env node
/**
 * Copy the bundled @ovellum/site default template into the CLI's dist
 * directory, MINIFYING its CSS/JS on the way (see build-templates.mjs).
 *
 * Why this exists:
 *
 *  - tsup with `noExternal: [/^@ovellum\//]` inlines @ovellum/site's JS
 *    into packages/cli/dist/index.js. Great for shipping one tarball.
 *  - But @ovellum/site reads its template files at runtime, via
 *    `path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates')`.
 *    After bundling, `import.meta.url` resolves to the CLI's dist, where
 *    `templates/` doesn't exist by default.
 *
 * Solution: copy `packages/site/src/templates/` to
 * `packages/cli/dist/templates/` so the runtime resolver finds them at the
 * same relative path it expects — minified, so `ovellum build` emits compact
 * `dist/assets/ovellum.{css,js}` with no runtime tooling.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTemplates } from './build-templates.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const src = path.join(repoRoot, 'packages', 'site', 'src', 'templates');
const dst = path.join(repoRoot, 'packages', 'cli', 'dist', 'templates');

if (!existsSync(src)) {
  console.error(`cli-copy-templates: source dir missing: ${src}`);
  process.exit(1);
}

await buildTemplates(src, dst);
console.log(
  `cli-copy-templates: minified ${path.relative(repoRoot, src)} → ${path.relative(repoRoot, dst)}`,
);
