#!/usr/bin/env node
/**
 * Copy a template directory while MINIFYING its CSS and JS.
 *
 * The default template's `style.css` / `script.js` are authored for humans
 * (comments, generous whitespace). What ships to a built site should be
 * uglified. We do that here, at package-build time, so:
 *
 *  - the published package carries pre-minified template assets,
 *  - `ovellum build` stays a plain copy into the user's `dist/assets/`,
 *  - and NO minifier is shipped to users (esbuild is a dev/build-time dep only).
 *
 * The source files stay readable; only the copied `dist/templates/**` are
 * minified. Non-CSS/JS files (if any) are copied verbatim.
 *
 * Usage: node scripts/build-templates.mjs <srcDir> <dstDir>
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { transform } from 'esbuild';

/** Minify-copy every file under `srcDir` into `dstDir`. */
export async function buildTemplates(srcDir, dstDir) {
  mkdirSync(dstDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await buildTemplates(src, dst);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.css' || ext === '.js') {
      const code = readFileSync(src, 'utf8');
      // CSS: minify whitespace + identifiers but NOT syntax. esbuild's
      // syntax-level minification rewrites in-gamut `oklch()` colours to their
      // shorter hex equivalents — lossless, but it would smuggle hex back into
      // the shipped stylesheet, against the all-OKLCH design principle
      // (STYLES.md). Skipping minifySyntax keeps every shipped colour in OKLCH
      // for ~1% more bytes (mostly recovered by gzip). JS keeps full minify —
      // there's no colour concern and minifySyntax earns its keep there.
      const opts =
        ext === '.css'
          ? { loader: 'css', minifyWhitespace: true, minifyIdentifiers: true, legalComments: 'none' }
          : { loader: 'js', minify: true, legalComments: 'none' };
      const result = await transform(code, opts);
      writeFileSync(dst, result.code);
    } else {
      cpSync(src, dst);
    }
  }
}

// Run as a CLI when invoked directly (not when imported).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , srcArg, dstArg] = process.argv;
  if (!srcArg || !dstArg) {
    console.error('usage: build-templates.mjs <srcDir> <dstDir>');
    process.exit(1);
  }
  const src = path.resolve(srcArg);
  const dst = path.resolve(dstArg);
  await buildTemplates(src, dst);
  const rel = (p) => path.relative(process.cwd(), p);
  console.log(`build-templates: minified ${rel(src)} → ${rel(dst)}`);
}
