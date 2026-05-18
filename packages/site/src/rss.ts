import type { PageOutput } from './build.js';

export interface GenerateRssInput {
  pages: PageOutput[];
  baseUrl: string;
  /** Site-prefix path (e.g. `/ovellum`). Prepended to each page URL. */
  basePath?: string;
  /** Channel title — `site.title`. */
  title: string;
  /** Channel description — `site.description`, optional. */
  description?: string;
  /** URLs to exclude from the feed (e.g. `/404/`, `/`). */
  exclude?: string[];
  /** Cap on the number of items emitted. Defaults to 20. */
  limit?: number;
  /** Build timestamp used for the channel's `<lastBuildDate>`. */
  generatedAt?: Date;
}

/**
 * Generate an RSS 2.0 feed body from the pages a site build produced.
 *
 * Returns `undefined` when `baseUrl` is missing — RSS items require
 * absolute URLs and the channel `<link>` is required.
 *
 * Items are sorted by `lastModified` (newest first); pages with no
 * `lastModified` fall to the end in their original order. Pages without
 * a `description` emit an empty `<description>` element, which is valid
 * RSS 2.0.
 */
export function generateRss(input: GenerateRssInput): string | undefined {
  if (!input.baseUrl) return undefined;
  const base = stripTrailingSlash(input.baseUrl);
  const prefix = input.basePath ? stripTrailingSlash(input.basePath) : '';
  const exclude = new Set(input.exclude ?? ['/404/']);
  const limit = input.limit ?? 20;
  const generatedAt = input.generatedAt ?? new Date();

  const homeLink = base + (prefix || '/');
  const selfLink = base + prefix + '/feed.xml';

  const items = input.pages
    .filter((p) => !exclude.has(p.url))
    .sort((a, b) => compareLastMod(a.lastModified, b.lastModified))
    .slice(0, limit)
    .map((p) => renderItem(p, base + prefix));

  const channelDesc = input.description ? escapeXml(input.description) : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(input.title)}</title>
    <link>${escapeXml(homeLink)}</link>
    <description>${channelDesc}</description>
    <atom:link href="${escapeXml(selfLink)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${toRfc822(generatedAt)}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>
`;
}

function renderItem(page: PageOutput, baseWithPrefix: string): string {
  const link = baseWithPrefix + page.url;
  const pubDate = page.lastModified ? toRfc822(new Date(page.lastModified)) : undefined;
  const lines = [
    '    <item>',
    `      <title>${escapeXml(page.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <description>${page.description ? escapeXml(page.description) : ''}</description>`,
  ];
  if (pubDate) lines.push(`      <pubDate>${pubDate}</pubDate>`);
  lines.push('    </item>');
  return lines.join('\n');
}

function compareLastMod(a: string | undefined, b: string | undefined): number {
  if (a && b) return b.localeCompare(a);
  if (a && !b) return -1;
  if (!a && b) return 1;
  return 0;
}

function toRfc822(d: Date): string {
  return d.toUTCString();
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
