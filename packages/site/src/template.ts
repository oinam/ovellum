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
  // Server-rendered appearance defaults; localStorage overrides pre-paint via
  // the boot script. A configured `site.accent` rides in as the same inline
  // custom property the runtime picker sets, so one CSS override serves both.
  const palette = opts.site.palette ?? 'default';
  const accentAttrs = opts.site.accent
    ? ` data-accent="custom" style="--ov-accent: ${escapeAttr(opts.site.accent)}"`
    : '';
  return `<!doctype html>
<html lang="en" data-theme="${escapeAttr(opts.site.defaultTheme)}" data-palette="${escapeAttr(palette)}" data-font="${escapeAttr(opts.site.font ?? 'sans')}"${accentAttrs}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Drives Safari's URL bar tint and the top-of-page rubber-band area.
       data-light / data-dark are the DEFAULT palette's --color-bg (body)
       in light + dark, in OKLCH like the rest of the theme — the topbar
       reads as a continuation of the body, so the URL bar matches body,
       not chrome. These are only the fallback; the boot script's per-palette
       bgs map below is the live source and must move with --color-bg. The
       script picks the right value before paint, and script.js keeps it in
       sync with the appearance control + OS changes. Note: theme-color is
       UA-parsed; a browser that can't read oklch simply drops the tint
       (no page impact) — an accepted tradeoff for staying all-OKLCH. -->
  <meta name="theme-color" id="ov-theme-color" data-light="oklch(97% 0 0)" data-dark="oklch(20.5% 0 0)" content="oklch(97% 0 0)">
  <title>${escapeHtml(opts.fullTitle)}</title>
  ${desc ? `<meta name="description" content="${escapeAttr(desc)}">` : ''}
  ${opts.site.baseUrl ? `<link rel="canonical" href="${escapeAttr(join(opts.site.baseUrl, basePath + opts.url))}">` : ''}
  ${opts.site.baseUrl ? `<link rel="alternate" type="application/rss+xml" title="${escapeAttr(opts.site.title)}" href="${escapeAttr(join(opts.site.baseUrl, basePath + '/feed.xml'))}">` : ''}
  <link rel="stylesheet" href="${escapeAttr(assets)}assets/ovellum.css">
  ${searchHead}
  ${opts.site.headExtra ?? ''}
  <script>
    (function () {
      try {
        var d = document.documentElement;
        var t = localStorage.getItem('ovellum-theme');
        if (t === 'light' || t === 'dark' || t === 'auto') {
          d.setAttribute('data-theme', t);
        } else {
          t = d.getAttribute('data-theme') || 'auto';
        }
        // [light, dark] --color-bg hex per palette. Single source for the
        // theme-color meta — script.js reads it back via window.__OV_PALETTE_BG__.
        // Keep in sync with the palette ramps in style.css.
        // [light, dark] = each palette's resolved --color-bg (gray-100 / gray-900).
        var bgs = {
          'default': ['oklch(97% 0 0)', 'oklch(20.5% 0 0)'],
          nord: ['oklch(95.1% 0.007 261)', 'oklch(32.4% 0.023 264)'],
          flexoki: ['oklch(95.4% 0.015 98)', 'oklch(22.3% 0.002 68)'],
          solarized: ['oklch(97.4% 0.026 90)', 'oklch(26.7% 0.049 220)'],
          eink: ['oklch(95.2% 0.019 91)', 'oklch(22.3% 0.014 88)']
        };
        window.__OV_PALETTE_BG__ = bgs;
        var p = localStorage.getItem('ovellum-palette');
        if (p && bgs[p]) {
          d.setAttribute('data-palette', p);
        } else {
          p = d.getAttribute('data-palette') || 'default';
        }
        var a = localStorage.getItem('ovellum-accent');
        if (a) {
          d.style.setProperty('--ov-accent', a);
          d.setAttribute('data-accent', 'custom');
        }
        var effective = t;
        if (t === 'auto') {
          effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        var meta = document.getElementById('ov-theme-color');
        if (meta) {
          var pair = bgs[p] || bgs['default'];
          meta.setAttribute('content', pair[effective === 'dark' ? 1 : 0]);
        }
      } catch (_) {}
    })();
  </script>
</head>
<body${opts.bodyClass ? ` class="${escapeAttr(opts.bodyClass)}"` : ''}>
  ${renderFrame()}
  ${renderTopbar(opts.site, assets, opts.docsHref ? siteUrl(opts.docsHref, basePath) : undefined, searchEnabled, basePath)}
  ${opts.body}
  <div class="ov-to-top-anchor"><button class="ov-to-top" type="button" aria-label="Back to top" data-ov-to-top>${renderIcon('arrow-up', { size: 18 })}</button></div>
  ${renderFooter(opts.site, opts.generatedAt, basePath)}
  ${searchScripts}
  <script src="${escapeAttr(assets)}assets/ovellum.js" defer></script>
</body>
</html>
`;
}

/**
 * The faint editorial page-frame: two full-viewport vertical rules hugging
 * the content edges, pinned at the header baseline by small square corner
 * nodes. Purely decorative (aria-hidden; pointer-events:none in CSS), styled
 * entirely via `.ov-frame*` in the stylesheet.
 */
function renderFrame(): string {
  return `<div class="ov-frame" aria-hidden="true"><div class="ov-frame-inner"><span class="ov-frame-node ov-frame-node--tl"></span><span class="ov-frame-node ov-frame-node--tr"></span></div></div>`;
}

// Ovellum wordmark glyph. Source of truth lives at
// `website/brand/ovellum-logo.afdesign`; the canonical export sits at
// `website/content/public/ovellum-logo.svg`. Inlined here (stripped of the
// XML prolog and editor-specific namespaces, `fill="currentColor"` set) so
// the mark follows light/dark theme alongside the wordmark beside it.
// Decorative: the adjacent text "Ovellum" carries the accessible name.
const BRAND_MARK = `<svg class="ov-brand-mark" width="24" height="24" viewBox="0 0 3334 3334" fill="currentColor" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path d="M1610.79,192.942l-603.283,-0.069c-72.722,290.674 -294.48,871.657 -294.48,871.657c-53.158,128.398 -37.404,275.067 41.795,389.217l743.687,1149.95l0,233.06c-42.509,41.505 -68.98,99.335 -68.98,163.352c-0.069,126.096 102.07,228.236 228.167,228.167c126.096,0.069 228.308,-102.144 228.235,-228.236c-0,-64.017 -26.471,-121.847 -68.985,-163.21l0,-233.06l743.765,-1150.03c79.122,-114.228 94.806,-260.819 41.722,-389.143c0,-0 -221.472,-580.983 -294.052,-871.652l-603.352,0l-94.239,-0.005Zm323.188,921.357c0,140.409 -104.731,256.078 -240.177,273.7l0,1386.96c-11.868,-1.795 -23.809,-3.093 -36.036,-3.093c-12.375,-0 -24.243,1.224 -36.037,3.093l-0,-1386.97c-135.593,-17.623 -240.251,-133.218 -240.251,-273.627c0,-152.635 123.652,-276.287 276.288,-276.287c152.635,0 276.282,123.656 276.213,276.223Z"/></svg>`;

interface ResolvedTopbarItem {
  label: string;
  href: string;
  external: boolean;
  icon?: IconName;
}

/** Resolve each configured item's href once so the auto-Docs link can dedupe. */
function resolveTopbarItems(
  site: OvellumSiteConfig & { title: string },
  basePath: string,
): ResolvedTopbarItem[] {
  return (site.topbarNav ?? []).map((item) => {
    const external = item.external === true || /^https?:\/\//i.test(item.href);
    const icon = item.icon && item.icon in ICONS ? (item.icon as IconName) : undefined;
    return {
      label: item.label,
      href: external ? item.href : siteUrl(item.href, basePath),
      external,
      icon,
    };
  });
}

/**
 * Render the topbar nav links. `compact` collapses icon items to icon-only
 * (desktop); otherwise the icon sits beside its visible label (mobile sheet).
 * The implicit "Docs" link is appended only when nothing already points there.
 */
function renderTopbarLinks(
  items: ResolvedTopbarItem[],
  docsHref: string | undefined,
  compact: boolean,
  only?: 'text' | 'icon',
): string {
  const subset =
    only === 'text'
      ? items.filter((it) => !it.icon)
      : only === 'icon'
        ? items.filter((it) => it.icon)
        : items;
  const links = subset.map(({ label, href, external, icon }) => {
    const rel = external ? ' rel="noopener" target="_blank"' : '';
    if (icon && compact) {
      return `<a class="ov-topbar-link ov-topbar-link--icon" href="${escapeAttr(href)}"${rel} aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">${renderIcon(icon, { class: 'ov-topbar-glyph', size: 18 })}<span class="ov-sr-only">${escapeHtml(label)}</span></a>`;
    }
    const glyph = icon ? `${renderIcon(icon, { class: 'ov-topbar-glyph', size: 18 })}` : '';
    const ext =
      external && !icon
        ? ` ${renderIcon('external-link', { class: 'ov-topbar-icon', size: 14 })}`
        : '';
    return `<a class="ov-topbar-link" href="${escapeAttr(href)}"${rel}>${glyph}${escapeHtml(label)}${ext}</a>`;
  });
  // The implicit Docs link is a text link — skip it for the icon-only group.
  if (only !== 'icon' && docsHref && !items.some((it) => it.href === docsHref)) {
    links.push(
      `<a class="ov-topbar-link ov-topbar-link--docs" href="${escapeAttr(docsHref)}">Docs</a>`,
    );
  }
  return links.join('\n        ');
}

/**
 * Appearance panel body: mode segmented control, theme list, colour
 * swatches. Pure markup — script.js wires the behaviour, CSS carries the
 * pressed/active states off aria attributes so every instance stays in sync.
 */
function renderAppearancePanel(): string {
  const modes = [
    { id: 'auto', label: 'Auto', icon: 'monitor' as IconName },
    { id: 'light', label: 'Light', icon: 'sun' as IconName },
    { id: 'dark', label: 'Dark', icon: 'moon' as IconName },
  ];
  // Ovellum (the monochrome base, id 'default') pinned first; the rest
  // alphabetical. Each carries a crisp monochrome line glyph that quietly
  // evokes the palette (pen-tool = Ovellum's nib, echoing the brand mark;
  // book = e-reader E-ink; feather = inky Flexoki; snowflake = arctic Nord;
  // sun-dim = desaturated Solarized).
  const palettes = [
    { id: 'default', label: 'Ovellum', icon: 'pen-tool' as IconName },
    { id: 'eink', label: 'E-ink', icon: 'book-open' as IconName },
    { id: 'flexoki', label: 'Flexoki', icon: 'feather' as IconName },
    { id: 'nord', label: 'Nord', icon: 'snowflake' as IconName },
    { id: 'solarized', label: 'Solarized', icon: 'sun-dim' as IconName },
  ];
  // Mid-tone presets that hold up on both light and dark backgrounds and read
  // as a legible button fill with near-white text. Selecting one drives the
  // PRIMARY role (CTA buttons) and links/focus together. The leading "Default"
  // swatch clears the override back to the theme's own primary (monochrome for
  // Ovellum); the trailing custom swatch wraps a native colour input.
  const accents = [
    { value: 'oklch(57% 0.16 255)', label: 'Blue' },
    { value: 'oklch(56% 0.18 295)', label: 'Violet' },
    { value: 'oklch(56% 0.14 150)', label: 'Green' },
    { value: 'oklch(66% 0.13 65)', label: 'Amber' },
    { value: 'oklch(60% 0.17 15)', label: 'Rose' },
    { value: 'oklch(60% 0.11 200)', label: 'Teal' },
  ];
  const modeButtons = modes
    .map(
      (m) => `<button type="button" class="ov-appearance-mode" data-ov-mode="${m.id}"
            aria-pressed="false" aria-label="${m.label}" title="${m.label}">${renderIcon(m.icon, { size: 14 })}<span>${m.label}</span></button>`,
    )
    .join('\n          ');
  const paletteButtons = palettes
    .map(
      (p) => `<button type="button" class="ov-appearance-palette" data-ov-palette="${p.id}"
            aria-pressed="false">${renderIcon(p.icon, { size: 16, class: 'ov-appearance-glyph' })}<span class="ov-appearance-palette-name">${p.label}</span>${renderIcon('check', { size: 14, class: 'ov-appearance-check' })}</button>`,
    )
    .join('\n          ');
  const accentButtons = accents
    .map(
      (a) => `<button type="button" class="ov-appearance-accent" data-ov-accent="${escapeAttr(a.value)}"
            style="--swatch: ${escapeAttr(a.value)}" aria-pressed="false" aria-label="${a.label}" title="${a.label}"></button>`,
    )
    .join('\n          ');
  return `<div class="ov-appearance-panel" data-ov-appearance-panel hidden>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">Mode</span>
          <div class="ov-appearance-modes" role="group" aria-label="Colour mode">
          ${modeButtons}
          </div>
        </div>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">Theme</span>
          <div class="ov-appearance-palettes" role="group" aria-label="Theme">
          ${paletteButtons}
          </div>
        </div>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">Color</span>
          <div class="ov-appearance-accents" role="group" aria-label="Primary colour">
          <button type="button" class="ov-appearance-accent ov-appearance-accent--default" data-ov-accent=""
            aria-pressed="false" aria-label="Default" title="Default"></button>
          ${accentButtons}
          <span class="ov-appearance-accent ov-appearance-accent--custom" title="Custom colour"><input type="color" data-ov-accent-custom aria-label="Custom colour" value="#3b82f6"></span>
          </div>
        </div>
      </div>`;
}

function renderTopbar(
  site: OvellumSiteConfig & { title: string },
  assets: string,
  docsHref: string | undefined,
  searchEnabled: boolean,
  basePath: string,
): string {
  const items = resolveTopbarItems(site, basePath);
  // Desktop splits text links from icon links so a divider can sit between
  // them; the mobile sheet keeps them in one labelled list.
  const desktopTextLinks = renderTopbarLinks(items, docsHref, true, 'text');
  const desktopIconLinks = renderTopbarLinks(items, docsHref, true, 'icon');
  const mobileLinks = renderTopbarLinks(items, docsHref, false);
  const search = searchEnabled ? `<div id="ov-search" class="ov-search"></div>` : '';
  // The hamburger only appears below the responsive breakpoint via CSS.
  const menuButton = `<button class="ov-topbar-menu" type="button"
      aria-label="Open menu" aria-expanded="false" aria-controls="ov-mobile-nav"
      data-ov-menu-toggle>
      <span class="ov-topbar-menu-open">${renderIcon('menu', { size: 22 })}</span>
      <span class="ov-topbar-menu-close">${renderIcon('close', { size: 22 })}</span>
    </button>`;
  // Appearance control — mode (auto/light/dark), palette, and accent in one
  // panel. Two instances: a popover in the desktop icon cluster, the panel
  // inlined in the mobile sheet. State lives on <html> (data-theme /
  // data-palette / --ov-accent); script.js wires every instance and keeps
  // their pressed states in sync, so duplicates can't drift.
  const appearancePopover = `<div class="ov-appearance" data-ov-appearance>
      <button class="ov-theme-toggle" type="button"
        aria-label="Appearance" title="Appearance"
        aria-haspopup="true" aria-expanded="false" data-ov-appearance-toggle>
        ${renderIcon('palette', { size: 18 })}
      </button>
      ${renderAppearancePanel()}
    </div>`;
  const versionBadge = site.version
    ? `<span class="ov-brand-version" aria-label="Stable version ${escapeAttr(site.version)}">${escapeHtml(site.version)}</span>`
    : '';
  return `<header class="ov-topbar">
    <div class="ov-topbar-inner">
      <div class="ov-brand-row">
        <a class="ov-brand" href="${escapeAttr(assets)}">${BRAND_MARK}<span class="ov-brand-name">${escapeHtml(site.title)}</span></a>
        ${versionBadge}
      </div>
      <div class="ov-topbar-search">${search}</div>
      <div class="ov-topbar-right">
        <nav class="ov-topbar-nav" aria-label="Primary">${desktopTextLinks}</nav>
        ${desktopTextLinks ? '<span class="ov-topbar-divider" aria-hidden="true"></span>' : ''}
        ${desktopIconLinks ? `<div class="ov-topbar-icons">
          ${desktopIconLinks}
        </div>
        <span class="ov-topbar-divider" aria-hidden="true"></span>` : ''}
        ${appearancePopover}
        ${menuButton}
      </div>
      <nav id="ov-mobile-nav" class="ov-mobile-nav" aria-label="Mobile">
        ${mobileLinks}
        <div class="ov-mobile-theme" data-ov-appearance>
          ${renderAppearancePanel()}
        </div>
      </nav>
    </div>
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

  return `<footer class="ov-footer"><div class="ov-footer-inner">${left}${right}</div></footer>`;
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
      <div class="ov-content-card">
        ${breadcrumbs}
        ${pageMeta}
        <article class="ov-prose">${input.bodyHtml}</article>
        ${editLink}
      </div>
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
  /**
   * Install snippets rendered after the hero CTAs and before the feature grid.
   * Each `html` is already-rendered highlighted code-block HTML (built upstream
   * through the same markdown/shiki pipeline as doc code blocks, so it carries
   * `data-language` + `data-copy`). The snippet title is folded upstream into
   * the code as a leading comment line, so there is no separate heading here.
   */
  install?: Array<{ html: string }>;
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
  const install = renderInstall(input.install ?? []);
  const features = renderFeatures(input.landing.features);
  const pitch = input.pitchHtml
    ? `<section class="ov-pitch"><div class="ov-pitch-inner">${input.pitchHtml}</div></section>`
    : '';
  const trust = renderTrustStrip(input.landing.trustStrip);

  // Interleave scenes between the rendered sections, in order. With three
  // sections after the hero, three scenes fill all three gaps; extras fall
  // through after the last section.
  const sections = [hero, install, features, pitch, trust].filter((s) => s !== '');
  const scenes = input.landing.scenes ?? [];
  const interleaved: string[] = [];
  sections.forEach((section, i) => {
    interleaved.push(section);
    if (i < sections.length - 1 && scenes[i]) {
      interleaved.push(renderScene(scenes[i], i, basePath));
    }
  });
  scenes.slice(Math.max(0, sections.length - 1)).forEach((sc, j) => {
    interleaved.push(renderScene(sc, sections.length - 1 + j, basePath));
  });

  const body = `<main class="ov-landing">
    ${interleaved.join('\n    ')}
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

function renderScene(
  scene: OvellumLandingConfig['scenes'][number],
  index: number,
  basePath: string,
): string {
  const alt = scene.alt ?? '';
  const lightSrc = escapeAttr(siteUrl(scene.light, basePath));
  const darkSrc = scene.dark ? escapeAttr(siteUrl(scene.dark, basePath)) : lightSrc;
  return `<section class="ov-scene" aria-hidden="${alt ? 'false' : 'true'}" style="--ov-scene-i: ${index};">
      <figure class="ov-scene-art">
        <img class="ov-scene-img ov-scene-img--light" src="${lightSrc}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async">
        <img class="ov-scene-img ov-scene-img--dark" src="${darkSrc}" alt="" loading="lazy" decoding="async">
      </figure>
    </section>`;
}

function renderInstall(install: Array<{ html: string }>): string {
  if (install.length === 0) return '';
  // Each snippet is a code block whose title is folded into the code as a
  // leading comment (see build.ts), so there is no separate heading here.
  const blocks = install.map((it) => it.html).join('\n        ');
  // Wrapped in `.ov-prose` so the existing copy-button JS (selector
  // `.ov-prose pre`) and copy/eyebrow CSS apply with zero changes.
  return `<section class="ov-install">
    <div class="ov-install-inner ov-prose">
        ${blocks}
    </div>
  </section>`;
}

function renderFeatures(features: OvellumLandingConfig['features']): string {
  if (features.length === 0) return '';
  const cards = features
    .map((f) => {
      const icon = f.icon ? `<div class="ov-feature-icon" aria-hidden="true">${f.icon}</div>` : '';
      return `<article class="ov-card ov-feature-card">
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
