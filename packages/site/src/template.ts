import type { OvellumLandingConfig, OvellumSiteConfig } from '@ovellum/core';
import { ICONS, renderIcon, type IconName } from './icons.js';
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
  ${opts.site.baseUrl ? `<link rel="alternate" type="application/rss+xml" title="${escapeAttr(opts.site.title)}" href="${escapeAttr(join(opts.site.baseUrl, basePath + '/feed.xml'))}">` : ''}
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
  ${renderTopbar(opts.site, assets, opts.docsHref ? siteUrl(opts.docsHref, basePath) : undefined, searchEnabled, basePath)}
  ${opts.body}
  ${renderFooter(opts.site, opts.generatedAt, basePath)}
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
  basePath: string,
): string {
  // Compose the right-side nav: configured items first, then the implicit
  // Docs link (only on the landing page — where docsHref is non-undefined).
  const navItems = site.topbarNav ?? [];
  const items: string[] = navItems.map((item) => {
    const external =
      item.external === true || /^https?:\/\//i.test(item.href);
    const href = external ? item.href : siteUrl(item.href, basePath);
    const rel = external ? ' rel="noopener" target="_blank"' : '';
    const icon = external
      ? ` ${renderIcon('external-link', { class: 'ov-topbar-icon', size: 14 })}`
      : '';
    return `<a class="ov-topbar-link" href="${escapeAttr(href)}"${rel}>${escapeHtml(item.label)}${icon}</a>`;
  });
  if (docsHref) {
    items.push(
      `<a class="ov-topbar-link ov-topbar-link--docs" href="${escapeAttr(docsHref)}">Docs</a>`,
    );
  }
  const navLinks = items.join('\n      ');
  const search = searchEnabled ? `<div id="ov-search" class="ov-search"></div>` : '';
  // The hamburger only appears below the responsive breakpoint via CSS.
  const menuButton = `<button class="ov-topbar-menu" type="button"
      aria-label="Open menu" aria-expanded="false" aria-controls="ov-mobile-nav"
      data-ov-menu-toggle>
      <span class="ov-topbar-menu-open">${renderIcon('menu', { size: 22 })}</span>
      <span class="ov-topbar-menu-close">${renderIcon('close', { size: 22 })}</span>
    </button>`;
  const themeButton = `<button class="ov-theme-toggle" type="button"
      aria-label="Toggle theme" title="Toggle theme" data-ov-theme-toggle>
      <span class="ov-theme-icon ov-theme-icon-auto">${renderIcon('monitor')}</span>
      <span class="ov-theme-icon ov-theme-icon-light">${renderIcon('sun')}</span>
      <span class="ov-theme-icon ov-theme-icon-dark">${renderIcon('moon')}</span>
    </button>`;
  const versionBadge = site.version
    ? `<span class="ov-brand-version" aria-label="Stable version ${escapeAttr(site.version)}">${escapeHtml(site.version)}</span>`
    : '';
  return `<header class="ov-topbar">
    <div class="ov-brand-row">
      <a class="ov-brand" href="${escapeAttr(assets)}">${escapeHtml(site.title)}</a>
      ${versionBadge}
    </div>
    <nav class="ov-topbar-nav" aria-label="Primary">${navLinks}</nav>
    <div class="ov-topbar-right">
      ${search}
      ${themeButton}
      ${menuButton}
    </div>
    <nav id="ov-mobile-nav" class="ov-mobile-nav" aria-label="Mobile">
      ${navLinks}
    </nav>
  </header>`;
}

function renderFooter(
  site: OvellumSiteConfig & { title: string },
  generatedAt: string,
  basePath: string,
): string {
  const items = site.footerNav ?? [];
  const hasItems = items.length > 0;
  if (!site.footer && !hasItems) return '';

  const left = site.footer
    ? `<div class="ov-footer-left"><span>${escapeHtml(site.footer)}</span><span class="ov-footer-sep">·</span><time datetime="${escapeAttr(generatedAt)}">${escapeHtml(generatedAt.slice(0, 10))}</time></div>`
    : '<div class="ov-footer-left"></div>';

  const right = hasItems
    ? `<nav class="ov-footer-right" aria-label="Site links">${items.map((item) => renderFooterNavItem(item, basePath)).join('')}</nav>`
    : '';

  return `<footer class="ov-footer">${left}${right}</footer>`;
}

function renderFooterNavItem(
  item: { label: string; href: string; icon?: string; external?: boolean },
  basePath: string,
): string {
  const external = item.external === true || /^https?:\/\//i.test(item.href);
  const href = external ? item.href : siteUrl(item.href, basePath);
  const rel = external ? ' rel="noopener" target="_blank"' : '';
  const iconName = item.icon as IconName | undefined;
  if (iconName && iconName in ICONS) {
    return `<a class="ov-footer-link ov-footer-link--icon" href="${escapeAttr(href)}"${rel} aria-label="${escapeAttr(item.label)}" title="${escapeAttr(item.label)}">${renderIcon(iconName, { class: 'ov-footer-icon', size: 18 })}<span class="ov-sr-only">${escapeHtml(item.label)}</span></a>`;
  }
  return `<a class="ov-footer-link" href="${escapeAttr(href)}"${rel}>${escapeHtml(item.label)}</a>`;
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
  /** Reading-time estimate in whole minutes (already computed and rounded). */
  readingMinutes?: number;
  /** ISO-8601 timestamp of the source file's last modification. */
  lastModified?: string;
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
  const pageMeta = renderPageMeta(input.readingMinutes, input.lastModified);
  const editLink = input.editUrl
    ? `<p class="ov-edit-page"><a class="ov-edit-link" href="${escapeAttr(input.editUrl)}" rel="noopener" target="_blank">Edit this page</a></p>`
    : '';

  const body = `<div class="ov-layout">
    <aside class="ov-sidebar" aria-label="Site navigation">${sidebar}</aside>
    <main class="ov-content">
      ${breadcrumbs}
      ${pageMeta}
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
    input.landing.hero.media,
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
  media: OvellumLandingConfig['hero']['media'],
  basePath: string,
): string {
  const ctaButtons = ctas
    .map((cta, i) => {
      const style = cta.style ?? (i === 0 ? 'primary' : 'secondary');
      return `<a class="ov-cta ov-cta--${escapeAttr(style)}" href="${escapeAttr(siteUrl(cta.href, basePath))}">${escapeHtml(cta.label)}</a>`;
    })
    .join('\n      ');
  const ctaRow = ctas.length > 0 ? `<div class="ov-cta-row">\n      ${ctaButtons}\n    </div>` : '';
  const art = media ? renderHeroArt(media, basePath) : '';
  const sectionAttrs = media ? ' data-media' : '';
  return `<section class="ov-hero"${sectionAttrs}>
    ${art}
    <div class="ov-hero-inner">
      <h1 class="ov-hero-title">${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="ov-hero-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      ${ctaRow}
    </div>
  </section>`;
}

function renderHeroArt(
  media: NonNullable<OvellumLandingConfig['hero']['media']>,
  basePath: string,
): string {
  const alt = media.alt ?? '';
  const lightSrc = escapeAttr(siteUrl(media.light, basePath));
  const darkSrc = media.dark ? escapeAttr(siteUrl(media.dark, basePath)) : lightSrc;
  // Two images stacked; CSS toggles visibility by `[data-theme]`. Both share the
  // same alt so screen readers only announce one decorative scene.
  return `<div class="ov-hero-art" aria-hidden="${alt ? 'false' : 'true'}">
      <img class="ov-hero-art-img ov-hero-art-img--light" src="${lightSrc}" alt="${escapeAttr(alt)}" loading="eager" decoding="async">
      <img class="ov-hero-art-img ov-hero-art-img--dark" src="${darkSrc}" alt="" loading="eager" decoding="async">
    </div>`;
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

function renderPageMeta(
  readingMin: number | undefined,
  lastModifiedISO: string | undefined,
): string {
  const parts: string[] = [];
  if (typeof readingMin === 'number' && readingMin > 0) {
    parts.push(`<span class="ov-page-meta-read">${readingMin} min read</span>`);
  }
  if (lastModifiedISO) {
    const date = lastModifiedISO.slice(0, 10);
    parts.push(
      `<span class="ov-page-meta-updated">Updated <time datetime="${escapeAttr(lastModifiedISO)}">${escapeHtml(date)}</time></span>`,
    );
  }
  if (parts.length === 0) return '';
  return `<p class="ov-page-meta">${parts.join('<span class="ov-page-meta-sep"> · </span>')}</p>`;
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
