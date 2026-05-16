import type { OvellumLandingConfig, OvellumSiteConfig } from '@ovellum/core';
import type { Heading } from './markdown.js';
import type { NavNode } from './nav.js';
import { assetsPrefix as assetsPrefixFor, normaliseBasePath, siteUrl } from './url.js';

export interface ShellOptions {
  site: OvellumSiteConfig & { title: string };
  /** Full <title> for the page (already composed upstream). */
  fullTitle: string;
  /** Used in <meta name="description"> and the canonical link. */
  description?: string;
  /** Site-relative URL for canonical/OG; empty for landings. */
  url: string;
  /** Path prefix for static assets, defaults to '/'. */
  assetsPrefix?: string;
  /** Optional Docs link added to the topbar (typically only on landing pages). */
  docsHref?: string;
  /** Build timestamp (ISO) used in the footer. */
  generatedAt: string;
  /** Body HTML (already rendered) placed between <header> and <footer>. */
  body: string;
  /** Outer body class — distinguishes landing pages from doc pages. */
  bodyClass?: string;
}

function renderShell(opts: ShellOptions): string {
  const basePath = normaliseBasePath(opts.site.basePath);
  const assets = opts.assetsPrefix ?? assetsPrefixFor(basePath);
  const desc = opts.description ?? opts.site.description ?? '';
  // Optional-chain because `site.search` may be undefined when callers pass a
  // partial site object (template/landing tests cast partial fixtures to the
  // full type). DEFAULT_CONFIG sets `search.enabled: false`.
  const searchEnabled = opts.site.search?.enabled === true;
  const searchHead = searchEnabled
    ? `<link rel="stylesheet" href="${escapeAttr(assets)}pagefind/pagefind-ui.css">`
    : '';
  const searchScripts = searchEnabled
    ? `<script src="${escapeAttr(assets)}pagefind/pagefind-ui.js" defer></script>
  <script>
    window.addEventListener('DOMContentLoaded', function () {
      if (typeof PagefindUI === 'undefined') return;
      new PagefindUI({ element: '#ov-search', showSubResults: true, resetStyles: false });
    });
  </script>`
    : '';
  return `<!doctype html>
<html lang="en" data-theme="${escapeAttr(opts.site.defaultTheme)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(opts.fullTitle)}</title>
  ${desc ? `<meta name="description" content="${escapeAttr(desc)}">` : ''}
  ${opts.site.baseUrl ? `<link rel="canonical" href="${escapeAttr(join(opts.site.baseUrl, basePath + opts.url))}">` : ''}
  <link rel="stylesheet" href="${escapeAttr(assets)}assets/ovellum.css">
  ${searchHead}
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
<body${opts.bodyClass ? ` class="${escapeAttr(opts.bodyClass)}"` : ''}>
  ${renderTopbar(opts.site, assets, opts.docsHref ? siteUrl(opts.docsHref, basePath) : undefined, searchEnabled)}
  ${opts.body}
  ${renderFooter(opts.site, opts.generatedAt)}
  ${searchScripts}
  <script src="${escapeAttr(assets)}assets/ovellum.js" defer></script>
</body>
</html>
`;
}

function renderTopbar(
  site: OvellumSiteConfig & { title: string },
  assets: string,
  docsHref: string | undefined,
  searchEnabled: boolean,
): string {
  const docsLink = docsHref
    ? `<a class="ov-topbar-link" href="${escapeAttr(docsHref)}">Docs</a>`
    : '';
  const search = searchEnabled ? `<div id="ov-search" class="ov-search"></div>` : '';
  return `<header class="ov-topbar">
    <a class="ov-brand" href="${escapeAttr(assets)}">${escapeHtml(site.title)}</a>
    <nav class="ov-topbar-nav">${docsLink}</nav>
    ${search}
    <button class="ov-theme-toggle" type="button" aria-label="Toggle theme" title="Toggle theme" data-ov-theme-toggle></button>
  </header>`;
}

function renderFooter(site: OvellumSiteConfig & { title: string }, generatedAt: string): string {
  if (!site.footer) return '';
  return `<footer class="ov-footer"><span>${escapeHtml(site.footer)}</span><span class="ov-footer-sep"> · </span><time datetime="${escapeAttr(generatedAt)}">${escapeHtml(generatedAt.slice(0, 10))}</time></footer>`;
}

// -- doc pages -----------------------------------------------------------

export interface PrevNextPage {
  title: string;
  url: string;
}

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
  /** Optional Docs link added to the topbar (typically only used when a landing page exists). */
  docsHref?: string;
  /** Previous page in the sidebar's reading order, if any. */
  prev?: PrevNextPage;
  /** Next page in the sidebar's reading order, if any. */
  next?: PrevNextPage;
  /** Resolved "Edit this page" URL (already had `{path}` substituted), if set. */
  editUrl?: string;
  /** Breadcrumb trail, root-first. The current page is the last entry. */
  breadcrumbs?: Array<{ title: string; url: string }>;
  /** Optional class added to `<body>`. Used today for the special 404 layout. */
  bodyClass?: string;
}

/**
 * Render a full HTML document for one doc page (sidebar + content + ToC).
 */
export function renderPage(input: RenderPageInput): string {
  const fullTitle =
    input.title && input.title !== input.site.title
      ? `${input.title} · ${input.site.title}`
      : input.site.title;

  const basePath = normaliseBasePath(input.site.basePath);
  const sidebar = renderSidebar(input.nav, input.url, basePath);
  const toc = renderToc(input.headings);
  const prevNext = renderPrevNext(input.prev, input.next, basePath);
  const breadcrumbs = renderBreadcrumbs(input.breadcrumbs, basePath);
  const editLink = input.editUrl
    ? `<p class="ov-edit-page"><a class="ov-edit-link" href="${escapeAttr(input.editUrl)}" rel="noopener" target="_blank">Edit this page</a></p>`
    : '';

  const body = `<div class="ov-layout">
    <aside class="ov-sidebar" aria-label="Site navigation">${sidebar}</aside>
    <main class="ov-content">
      ${breadcrumbs}
      <article class="ov-prose">${input.bodyHtml}</article>
      ${editLink}
      ${prevNext}
    </main>
    <aside class="ov-toc" aria-label="On this page">${toc}</aside>
  </div>`;

  return renderShell({
    site: input.site,
    fullTitle,
    description: input.description,
    url: input.url,
    assetsPrefix: input.assetsPrefix,
    docsHref: input.docsHref,
    generatedAt: input.generatedAt,
    body,
    bodyClass: input.bodyClass,
  });
}

// -- landing page --------------------------------------------------------

export interface RenderLandingInput {
  site: OvellumSiteConfig & { title: string };
  landing: OvellumLandingConfig;
  /** Optional pitch HTML rendered between the feature grid and the trust strip. */
  pitchHtml?: string;
  generatedAt: string;
  assetsPrefix?: string;
  /** Resolved docs entry URL (landing.docsHref or first-nav fallback). */
  docsHref?: string;
}

/**
 * Render the landing-page document. Sections in order: hero, feature grid,
 * optional pitch (free-form markdown body from `_landing.md`), optional
 * trust strip.
 */
export function renderLanding(input: RenderLandingInput): string {
  const heroTitle = input.landing.hero.title ?? input.site.title;
  const fullTitle = input.site.title;
  const basePath = normaliseBasePath(input.site.basePath);

  const hero = renderHero(
    heroTitle,
    input.landing.hero.subtitle,
    input.landing.hero.ctas,
    basePath,
  );
  const features = renderFeatures(input.landing.features);
  const pitch = input.pitchHtml
    ? `<section class="ov-pitch"><div class="ov-pitch-inner">${input.pitchHtml}</div></section>`
    : '';
  const trust = renderTrustStrip(input.landing.trustStrip);

  const body = `<main class="ov-landing">
    ${hero}
    ${features}
    ${pitch}
    ${trust}
  </main>`;

  return renderShell({
    site: input.site,
    fullTitle,
    description: input.site.description,
    url: '/',
    assetsPrefix: input.assetsPrefix,
    docsHref: input.docsHref ? siteUrl(input.docsHref, basePath) : undefined,
    generatedAt: input.generatedAt,
    body,
    bodyClass: 'ov-body-landing',
  });
}

function renderHero(
  title: string,
  subtitle: string | undefined,
  ctas: OvellumLandingConfig['hero']['ctas'],
  basePath: string,
): string {
  const ctaButtons = ctas
    .map((cta, i) => {
      const style = cta.style ?? (i === 0 ? 'primary' : 'secondary');
      return `<a class="ov-cta ov-cta--${escapeAttr(style)}" href="${escapeAttr(siteUrl(cta.href, basePath))}">${escapeHtml(cta.label)}</a>`;
    })
    .join('\n      ');
  const ctaRow = ctas.length > 0 ? `<div class="ov-cta-row">\n      ${ctaButtons}\n    </div>` : '';
  return `<section class="ov-hero">
    <h1 class="ov-hero-title">${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="ov-hero-subtitle">${escapeHtml(subtitle)}</p>` : ''}
    ${ctaRow}
  </section>`;
}

function renderFeatures(features: OvellumLandingConfig['features']): string {
  if (features.length === 0) return '';
  const cards = features
    .map((f) => {
      const icon = f.icon ? `<div class="ov-feature-icon" aria-hidden="true">${f.icon}</div>` : '';
      return `<article class="ov-feature-card">
        ${icon}
        <h3 class="ov-feature-title">${escapeHtml(f.title)}</h3>
        <p class="ov-feature-description">${escapeHtml(f.description)}</p>
      </article>`;
    })
    .join('\n      ');
  return `<section class="ov-feature-grid-wrap">
    <div class="ov-feature-grid">
      ${cards}
    </div>
  </section>`;
}

function renderTrustStrip(trust: OvellumLandingConfig['trustStrip']): string {
  if (!trust || trust.items.length === 0) return '';
  const items = trust.items
    .map((it) => {
      const inner = it.image
        ? `<img class="ov-trust-image" src="${escapeAttr(it.image)}" alt="${escapeAttr(it.name)}">`
        : `<span class="ov-trust-name">${escapeHtml(it.name)}</span>`;
      return it.href
        ? `<a class="ov-trust-item" href="${escapeAttr(it.href)}">${inner}</a>`
        : `<span class="ov-trust-item">${inner}</span>`;
    })
    .join('\n      ');
  return `<section class="ov-trust">
    ${trust.label ? `<p class="ov-trust-label">${escapeHtml(trust.label)}</p>` : ''}
    <div class="ov-trust-items">
      ${items}
    </div>
  </section>`;
}

// -- shared helpers ------------------------------------------------------

function renderSidebar(nav: NavNode, activeUrl: string, basePath: string): string {
  return `<nav class="ov-sidebar-nav"><ul>${navList(nav.children, activeUrl, basePath)}</ul></nav>`;
}

function navList(nodes: NavNode[], activeUrl: string, basePath: string): string {
  if (nodes.length === 0) return '';
  return nodes
    .map((node) => {
      const isActive = node.url === activeUrl;
      const hasChildren = node.children.length > 0;
      const link = node.sourcePath
        ? `<a class="ov-nav-link${isActive ? ' is-active' : ''}" href="${escapeAttr(siteUrl(node.url, basePath))}">${escapeHtml(node.title)}</a>`
        : `<span class="ov-nav-group">${escapeHtml(node.title)}</span>`;
      const children = hasChildren
        ? `<ul class="ov-nav-children">${navList(node.children, activeUrl, basePath)}</ul>`
        : '';
      return `<li>${link}${children}</li>`;
    })
    .join('');
}

function renderBreadcrumbs(
  trail: Array<{ title: string; url: string }> | undefined,
  basePath: string,
): string {
  // The trail includes the synthetic root node, so a top-level page like
  // /getting-started/ has length 2. Only render when there's at least one
  // real group between the root and the current page.
  if (!trail || trail.length < 3) return '';
  const visible = trail.slice(1);
  const items = visible
    .map((node, i) => {
      const isLast = i === visible.length - 1;
      if (isLast) {
        return `<li class="ov-crumb is-current" aria-current="page">${escapeHtml(node.title)}</li>`;
      }
      return `<li class="ov-crumb"><a href="${escapeAttr(siteUrl(node.url, basePath))}">${escapeHtml(node.title)}</a></li>`;
    })
    .join('\n      ');
  return `<nav class="ov-breadcrumbs" aria-label="Breadcrumb">
    <ol>
      ${items}
    </ol>
  </nav>`;
}

function renderPrevNext(
  prev: PrevNextPage | undefined,
  next: PrevNextPage | undefined,
  basePath: string,
): string {
  if (!prev && !next) return '';
  const prevHtml = prev
    ? `<a class="ov-prevnext-link ov-prevnext-prev" href="${escapeAttr(siteUrl(prev.url, basePath))}">
         <span class="ov-prevnext-label">Previous</span>
         <span class="ov-prevnext-title">${escapeHtml(prev.title)}</span>
       </a>`
    : '<span class="ov-prevnext-spacer" aria-hidden="true"></span>';
  const nextHtml = next
    ? `<a class="ov-prevnext-link ov-prevnext-next" href="${escapeAttr(siteUrl(next.url, basePath))}">
         <span class="ov-prevnext-label">Next</span>
         <span class="ov-prevnext-title">${escapeHtml(next.title)}</span>
       </a>`
    : '<span class="ov-prevnext-spacer" aria-hidden="true"></span>';
  return `<nav class="ov-prevnext" aria-label="Page navigation">
    ${prevHtml}
    ${nextHtml}
  </nav>`;
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
