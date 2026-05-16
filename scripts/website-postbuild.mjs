// Post-build fix-ups for the official Ovellum website.
//
// 1. GitHub Pages serves `404.html` (not `404/index.html`) on missing paths.
//    Our build emits the latter; this copies it to the former so the
//    not-found page is reachable on the live site.
//
// Run from the repo root after `ovellum build --cwd website`.

import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const distDir = path.join(repoRoot, 'website', 'dist');

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function ensure404() {
  const src = path.join(distDir, '404', 'index.html');
  const dest = path.join(distDir, '404.html');
  if (!(await exists(src))) {
    console.warn(`[website-postbuild] expected ${src}, skipping 404 fixup.`);
    return;
  }
  await copyFile(src, dest);
  console.log('[website-postbuild] wrote dist/404.html');
}

await ensure404();
