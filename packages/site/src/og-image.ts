import type { OvellumOgImageConfig } from '@ovellum/core';

// 1200×630 is the de-facto OpenGraph / Twitter "summary_large_image" size.
const WIDTH = 1200;
const HEIGHT = 630;

/** Minimal slice of the sharp API used here (SVG buffer → PNG buffer). */
interface SharpInstance {
  png(): { toBuffer(): Promise<Buffer> };
}
type SharpFactory = (input: Buffer) => SharpInstance;

let sharpPromise: Promise<SharpFactory> | null = null;

/** Lazily load the optional `sharp` peer — same posture as image optimization. */
async function loadSharp(): Promise<SharpFactory> {
  if (!sharpPromise) {
    sharpPromise = import('sharp' as string)
      .then((m) => (m.default ?? m) as SharpFactory)
      .catch((err: unknown) => {
        const code = (err as { code?: string } | undefined)?.code;
        if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
          throw new Error(
            '`site.ogImage` needs the optional `sharp` package. Install it: `npm i sharp` (or remove `site.ogImage`).',
          );
        }
        throw err instanceof Error ? err : new Error(String(err));
      });
  }
  return sharpPromise;
}

export interface ResolvedOgConfig {
  background: string;
  foreground: string;
}

/** Normalise `site.ogImage` (boolean or object) → colors, or `null` when off. */
export function resolveOgConfig(
  cfg: boolean | OvellumOgImageConfig | undefined,
): ResolvedOgConfig | null {
  if (!cfg) return null;
  const obj = typeof cfg === 'object' ? cfg : {};
  return {
    background: obj.background ?? '#0c0c0c',
    foreground: obj.foreground ?? '#f4f4f4',
  };
}

/** A filesystem-safe slug for a page URL (`/guide/intro/` → `guide-intro`, `/` → `index`). */
export function ogSlug(url: string): string {
  const s = url
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return s || 'index';
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === '"' ? '&quot;' : '&#39;',
  );
}

/** Greedy word-wrap to ~`maxChars` per line, capped at `maxLines` (ellipsised). */
function wrapTitle(title: string, maxChars: number, maxLines: number): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const last = lines[maxLines - 1];
  if (last !== undefined && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = last.replace(/\s*\S*$/, '…');
  }
  return lines;
}

/**
 * Render a 1200×630 OpenGraph card as PNG bytes — page title + site name on a
 * flat background with a small accent mark, in the editorial-calm spirit
 * (monochrome, no chrome). Composed as SVG and rasterized by sharp; text uses
 * the build machine's sans-serif (via librsvg/fontconfig).
 */
export async function generateOgCard(opts: {
  title: string;
  siteTitle: string;
  config: ResolvedOgConfig;
}): Promise<Buffer> {
  const { background, foreground } = opts.config;
  const lines = wrapTitle(opts.title, 24, 4);
  const fontSize = lines.length > 2 ? 60 : 72;
  const lineHeight = Math.round(fontSize * 1.18);
  const startY = 250 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="90" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${escapeXml(background)}"/>
  <rect x="90" y="120" width="84" height="7" fill="${escapeXml(foreground)}"/>
  <text font-family="sans-serif" font-weight="700" font-size="${fontSize}" fill="${escapeXml(foreground)}">${tspans}</text>
  <text x="90" y="548" font-family="sans-serif" font-weight="500" font-size="30" fill="${escapeXml(foreground)}" fill-opacity="0.62">${escapeXml(opts.siteTitle)}</text>
</svg>`;

  const sharp = await loadSharp();
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export const OG_WIDTH = WIDTH;
export const OG_HEIGHT = HEIGHT;
