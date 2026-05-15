import type { OvellumSiteConfig } from '@ovellum/core';
import type { Heading } from './markdown.js';
import type { NavNode } from './nav.js';

export interface RenderPageInput {
  site: OvellumSiteConfig & { title: string };
  /** Root nav. Children are rendered as the sidebar tree. */
  nav: NavNode;
  /** Page's site-relative URL (with trailing slash). Used for marking the active link. */
  url: string;
  /** Page title (already resolved upstream — falls back to the site title for the root). */
  title: string;
  /** Optional description for `<meta name="description">`. */
  description?: string;
  /** Rendered body HTML. */
  bodyHtml: string;
  /** Headings extracted from the body for the right-side ToC. */
  headings: Heading[];
  /** Build timestamp (ISO) used in the footer. */
  generatedAt: string;
  /** Path prefix for static assets, defaults to '/'. */
  assetsPrefix?: string;
}

/**
 * Render a full HTML document for one page.
 */
export function renderPage(input: RenderPageInput): string {
  const assets = input.assetsPrefix ?? '/';
  const fullTitle =
    input.title && input.title !== input.site.title
      ? `${input.title} · ${input.site.title}`
      : input.site.title;
  const description = escapeAttr(input.description ?? input.site.description ?? '');

  const sidebar = renderSidebar(input.nav, input.url);
  const toc = renderToc(input.headings);
  const footer = input.site.footer
    ? `<footer class="ov-footer"><span>${escapeHtml(input.site.footer)}</span><span class="ov-footer-sep"> · </span><time datetime="${escapeAttr(input.generatedAt)}">${escapeHtml(input.generatedAt.slice(0, 10))}</time></footer>`
    : '';

  return `<!doctype html>
<html lang="en" data-theme="${escapeAttr(input.site.defaultTheme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  ${description ? `<meta name="description" content="${description}">` : ''}
  ${input.site.baseUrl ? `<link rel="canonical" href="${escapeAttr(join(input.site.baseUrl, input.url))}">` : ''}
  <link rel="stylesheet" href="${escapeAttr(assets)}assets/ovellum.css">
  <script>
    (function () {
      try {
        var t = localStorage.getItem('ovellum-theme');
        if (t === 'light' || t === 'dark' || t === 'auto') {
          document.documentElement.setAttribute('data-theme', t);
        }
      } catch (_) {}
    })();
  </script>
</head>
<body>
  <header class="ov-topbar">
    <a class="ov-brand" href="${escapeAttr(assets)}">${escapeHtml(input.site.title)}</a>
    <button class="ov-theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme" data-ov-theme-toggle></button>
  </header>
  <div class="ov-layout">
    <aside class="ov-sidebar" aria-label="Site navigation">${sidebar}</aside>
    <main class="ov-content">
      <article class="ov-prose">${input.bodyHtml}</article>
    </main>
    <aside class="ov-toc" aria-label="On this page">${toc}</aside>
  </div>
  ${footer}
  <script src="${escapeAttr(assets)}assets/ovellum.js" defer></script>
</body>
</html>
`;
}

function renderSidebar(nav: NavNode, activeUrl: string): string {
  return `<nav class="ov-sidebar-nav"><ul>${navList(nav.children, activeUrl)}</ul></nav>`;
}

function navList(nodes: NavNode[], activeUrl: string): string {
  if (nodes.length === 0) return '';
  return nodes
    .map((node) => {
      const isActive = node.url === activeUrl;
      const hasChildren = node.children.length > 0;
      const link = node.sourcePath
        ? `<a class="ov-nav-link${isActive ? ' is-active' : ''}" href="${escapeAttr(node.url)}">${escapeHtml(node.title)}</a>`
        : `<span class="ov-nav-group">${escapeHtml(node.title)}</span>`;
      const children = hasChildren
        ? `<ul class="ov-nav-children">${navList(node.children, activeUrl)}</ul>`
        : '';
      return `<li>${link}${children}</li>`;
    })
    .join('');
}

function renderToc(headings: Heading[]): string {
  if (headings.length === 0) return '';
  const items = headings
    .map(
      (h) =>
        `<li class="ov-toc-h${h.depth}"><a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a></li>`,
    )
    .join('');
  return `<div class="ov-toc-inner"><p class="ov-toc-title">On this page</p><ul>${items}</ul></div>`;
}

function join(base: string, path: string): string {
  if (!base.endsWith('/')) base += '/';
  return base + path.replace(/^\//, '');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}
