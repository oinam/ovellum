import type { OvellumAiConfig } from '@ovellum/core';

/**
 * AI-friendly output for the docs build — three additive artifacts that sit
 * alongside the HTML so coding agents and LLMs can read the docs cleanly:
 *
 *   - `llms.txt`        — a link-first index of every page (llmstxt.org).
 *   - `llms-full.txt`   — the whole corpus concatenated, in sidebar order.
 *   - per-page `.md`    — a raw-Markdown mirror at `<page>.md`.
 *
 * The HTML is never touched; turning the feature off (or leaving it on)
 * changes only which companion files are emitted.
 */

/** A single page's data, as consumed by the `llms.txt` / `llms-full.txt` builders. */
export interface AiDoc {
  /** Page URL (root-relative, locale-prefixed) — used to order docs by the nav. */
  url: string;
  /** Display link for `llms.txt` (the `.md` mirror when enabled, else the page). */
  link?: string;
  title: string;
  description?: string;
  /** Raw Markdown body (frontmatter stripped). */
  markdown: string;
}

export interface ResolvedAiConfig {
  llmsTxt: boolean;
  fullText: boolean;
  mdMirror: boolean;
}

/**
 * Resolve the effective AI-output toggles. Defaults: `llms.txt` and the
 * per-page `.md` mirror are **on**; `llms-full.txt` is **off** (can be large).
 * `enabled: false` forces everything off regardless of the individual flags.
 */
export function resolveAiConfig(ai: OvellumAiConfig | undefined): ResolvedAiConfig {
  const a = ai ?? {};
  const on = a.enabled ?? true;
  return {
    llmsTxt: on && (a.llmsTxt ?? true),
    fullText: on && (a.fullText ?? false),
    mdMirror: on && (a.mdMirror ?? true),
  };
}

/**
 * A default `robots.txt` for sites that emit the llms.txt index. Written only
 * when the user didn't supply their own (via `publicDir`): allow everything,
 * point at the sitemap when absolute URLs exist, and mention the AI-readable
 * index (as comments — ignored by robots parsers, read by people and agents).
 */
export function renderRobotsTxt(baseUrl: string | undefined, basePrefix: string): string {
  const origin = baseUrl ? baseUrl.replace(/\/+$/, '') + basePrefix : basePrefix;
  const lines = ['User-agent: *', 'Allow: /', ''];
  if (baseUrl) lines.push(`Sitemap: ${origin}/sitemap.xml`, '');
  lines.push('# AI-readable index of this site (llms.txt convention):', `# ${origin}/llms.txt`);
  return lines.join('\n') + '\n';
}

/**
 * Output path (relative to the site root, POSIX) for a page's `.md` mirror,
 * or `null` for a page that should not get one (the 404). Convention: append
 * `.md` to the page path with the trailing slash dropped —
 * `/guide/intro/` → `guide/intro.md`, `/` → `index.md`, `/ja/guide/` → `ja/guide.md`.
 */
export function mdMirrorPath(url: string): string | null {
  if (url === '/404/' || url.endsWith('/404/')) return null;
  const trimmed = url.replace(/^\/+/, '').replace(/\/+$/, '');
  return trimmed === '' ? 'index.md' : `${trimmed}.md`;
}

/**
 * The body written to a page's `.md` mirror: an H1 title (only when the body
 * doesn't already open with one) followed by the raw Markdown source.
 */
export function renderPageMarkdown(title: string, markdown: string): string {
  const body = markdown.trim();
  const firstLine = body.split('\n', 1)[0] ?? '';
  const head = /^#\s+/.test(firstLine) ? '' : `# ${title}\n\n`;
  return `${head}${body}\n`;
}

export interface LlmsTxtOptions {
  siteTitle: string;
  siteDescription?: string;
  docs: AiDoc[];
  /** Heading for the link list. Default `'Docs'`. */
  sectionLabel?: string;
}

/**
 * Render `llms.txt` — the site title, an optional blockquote summary, then a
 * flat list of `- [Title](link): description` entries in the order given
 * (callers pass docs pre-sorted into sidebar order).
 */
export function generateLlmsTxt(opts: LlmsTxtOptions): string {
  const lines: string[] = [`# ${opts.siteTitle}`, ''];
  if (opts.siteDescription) lines.push(`> ${opts.siteDescription}`, '');
  lines.push(`## ${opts.sectionLabel ?? 'Docs'}`, '');
  for (const d of opts.docs) {
    const href = d.link ?? d.url;
    const desc = d.description ? `: ${d.description}` : '';
    lines.push(`- [${d.title}](${href})${desc}`);
  }
  lines.push('');
  return lines.join('\n');
}

/**
 * Render `llms-full.txt` — the whole corpus as one Markdown stream: a title
 * banner, then each page as an `# Title` section (optional `> description`)
 * with its raw body, separated by horizontal rules.
 */
export function generateLlmsFullText(siteTitle: string, docs: AiDoc[]): string {
  const parts: string[] = [`# ${siteTitle}`, ''];
  for (const d of docs) {
    parts.push(`# ${d.title}`, '');
    if (d.description) parts.push(`> ${d.description}`, '');
    parts.push(d.markdown.trim(), '', '---', '');
  }
  return parts.join('\n').replace(/\n+$/, '\n');
}
