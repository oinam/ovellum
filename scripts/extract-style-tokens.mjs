#!/usr/bin/env node
/**
 * Sync CSS custom-property values from `docs/internal/STYLES.md` (the
 * design-system source of truth) into the default template stylesheet.
 *
 * STYLES.md authors values inside fenced ```css blocks. The shipping
 * stylesheet (`packages/site/src/templates/default/style.css`) declares
 * a curated subset of those tokens between
 *
 *   /* @tokens:from-styles-md:start *⁄  …  /* @tokens:from-styles-md:end *⁄
 *
 * Only declarations inside those markers are touched. The script
 * compares each `--name: value;` between the markers against STYLES.md
 * and rewrites the value when it drifts. Tokens outside the markers
 * (Tier 2 remappings, deliberate deviations, layout widths) are left
 * alone — that's where you put values that should NOT track STYLES.md.
 *
 * Usage:
 *   node scripts/extract-style-tokens.mjs           # rewrite in place
 *   node scripts/extract-style-tokens.mjs --check   # exit 1 on drift, no write
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const STYLES_MD = path.join(repoRoot, 'docs', 'internal', 'STYLES.md');
const STYLE_CSS = path.join(
  repoRoot,
  'packages',
  'site',
  'src',
  'templates',
  'default',
  'style.css',
);

const MARKER_START = '/* @tokens:from-styles-md:start */';
const MARKER_END = '/* @tokens:from-styles-md:end */';

const checkMode = process.argv.includes('--check');

const tokens = await loadTokensFromStylesMd(STYLES_MD);
const original = await readFile(STYLE_CSS, 'utf8');
const { content: updated, changes } = syncTokens(original, tokens);

if (checkMode) {
  if (changes.length === 0) {
    console.log(`style-tokens: in sync (${tokens.size} sourced tokens checked).`);
    process.exit(0);
  }
  console.error(`style-tokens: ${changes.length} drift(s) detected:`);
  for (const c of changes) console.error(`  ${c.name}: '${c.before}' → '${c.after}'`);
  console.error('Run `pnpm extract-tokens` to sync, or update STYLES.md.');
  process.exit(1);
}

if (changes.length === 0) {
  console.log(`style-tokens: already in sync (${tokens.size} sourced tokens checked).`);
  process.exit(0);
}

await writeFile(STYLE_CSS, updated, 'utf8');
console.log(`style-tokens: synced ${changes.length} token value(s) from STYLES.md.`);
for (const c of changes) console.log(`  ${c.name}: '${c.before}' → '${c.after}'`);

/** Parse all fenced ```css blocks in STYLES.md and harvest literal token values. */
async function loadTokensFromStylesMd(file) {
  const raw = await readFile(file, 'utf8');
  return harvestTokens(raw);
}

export function harvestTokens(markdown) {
  const map = new Map();
  const fences = matchAll(markdown, /```css\s*\n([\s\S]*?)```/g);
  for (const fence of fences) {
    for (const decl of harvestDeclarations(fence[1])) {
      if (isLiteralValue(decl.value)) {
        // Last write wins. STYLES.md orders blocks by tier; later
        // definitions override earlier placeholders.
        map.set(decl.name, decl.value);
      }
    }
  }
  return map;
}

function harvestDeclarations(cssBody) {
  const out = [];
  // Match `--name: value;` where value may span lines (e.g. multi-line
  // font stacks). Stop at the next `;` that isn't inside parens.
  const re = /(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
  for (const m of matchAll(cssBody, re)) {
    out.push({ name: m[1], value: m[2].trim().replace(/\s+/g, ' ') });
  }
  return out;
}

function isLiteralValue(v) {
  // Skip remappings and placeholder syntax. We only sync literals.
  if (/^var\(/.test(v)) return false;
  if (/<[A-Za-z0-9-]+(-[0-9]+)?>/.test(v)) return false;
  return true;
}

export function syncTokens(css, tokens) {
  const startIdx = css.indexOf(MARKER_START);
  const endIdx = css.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `style.css is missing the @tokens:from-styles-md markers. ` +
        `Wrap the auto-synced declarations between '${MARKER_START}' and '${MARKER_END}'.`,
    );
  }
  const head = css.slice(0, startIdx + MARKER_START.length);
  const managed = css.slice(startIdx + MARKER_START.length, endIdx);
  const tail = css.slice(endIdx);

  const changes = [];
  const re = /(--[A-Za-z0-9-]+)\s*:\s*([^;]+);/g;
  const updatedManaged = managed.replace(re, (whole, name, currentValue) => {
    const want = tokens.get(name);
    if (!want) return whole;
    const current = currentValue.trim().replace(/\s+/g, ' ');
    if (current === want) return whole;
    changes.push({ name, before: current, after: want });
    return `${name}: ${want};`;
  });
  return { content: head + updatedManaged + tail, changes };
}

function matchAll(s, re) {
  re.lastIndex = 0;
  const out = [];
  let m;
  while ((m = re.exec(s)) !== null) out.push(m);
  return out;
}
