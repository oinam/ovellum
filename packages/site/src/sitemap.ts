import type { PageOutput } from './build.js';

export interface GenerateSitemapInput {
  pages: PageOutput[];
  baseUrl: string;
  /** URLs to exclude from the sitemap (e.g. `/404/`). */
  exclude?: string[];
}

/**
 * Generate a `sitemap.xml` body from the list of pages a site build produced.
 *
 * Returns `undefined` when `baseUrl` is missing — without it we can't emit
 * fully-qualified URLs and most sitemap consumers require absolute paths.
 *
 * v1 emits only `<loc>` per URL. `<lastmod>` (from git mtime) and
 * `<changefreq>` / `<priority>` are deferred until a build-time git lookup
 * is wired.
 */
export function generateSitemap(input: GenerateSitemapInput): string | undefined {
  if (!input.baseUrl) return undefined;
  const base = stripTrailingSlash(input.baseUrl);
  const exclude = new Set(input.exclude ?? ['/404/']);

  const entries = input.pages
    .filter((p) => !exclude.has(p.url))
    .map((p) => `  <url>\n    <loc>${escapeXml(base + p.url)}</loc>\n  </url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
