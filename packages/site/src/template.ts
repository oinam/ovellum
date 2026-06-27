import type {
  OvellumCustomFont,
  OvellumDateFormat,
  OvellumLandingConfig,
  OvellumSiteConfig,
} from '@ovellum/core';
import { ICONS, renderIcon, type IconName } from './icons.js';
import type { Heading } from './markdown.js';
import type { NavNode } from './nav.js';
import { formatEditedDate } from './page-meta.js';
import { DEFAULT_STRINGS, localize, type UiStrings } from './strings.js';
import { assetsPrefix as assetsPrefixFor, normaliseBasePath, siteUrl } from './url.js';

/** Pinned Mermaid ESM build, lazy-loaded on diagram pages (overridable via
 *  `site.mermaid.url` to self-host). Pin the major so it can't shift under us. */
const DEFAULT_MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

/**
 * `<head>` markup for a custom `site.font`: the `@font-face` source stylesheet
 * link(s) plus a `[data-font="custom"]` rule mapping `--font-body` (and
 * optionally `--font-mono`). The rule sits after the base stylesheet so it wins
 * by source order, yet stays under `[data-font]` so a reader's picker choice
 * (e.g. `sans`) still overrides it. Family values are stripped of CSS-breaking
 * characters (also rejected by config validation).
 */
function renderCustomFontHead(font: OvellumCustomFont, basePath: string): string {
  const sources = font.source === undefined ? [] : Array.isArray(font.source) ? font.source : [font.source];
  const links = sources
    .map((src) => {
      const href = /^https?:\/\//i.test(src) ? src : siteUrl(src, basePath);
      return `<link rel="stylesheet" href="${escapeAttr(href)}">`;
    })
    .join('\n  ');
  const cssValue = (v: string): string => v.replace(/[<>{};]/g, '').trim();
  const decls = [`--font-body: ${cssValue(font.body)};`];
  if (font.mono) decls.push(`--font-mono: ${cssValue(font.mono)};`);
  const style = `<style>[data-font="custom"]{ ${decls.join(' ')} }</style>`;
  return links ? `${links}\n  ${style}` : style;
}

export interface ShellOptions {
  site: OvellumSiteConfig & { title: string };
  /** Full <title> for the page (already composed upstream). */
  fullTitle: string;
  /** Used in <meta name="description"> and the canonical link. */
  description?: string;
  /** Frontmatter tags → <meta name="keywords">. */
  tags?: string[];
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
  /** `<html lang>` for i18n sites; defaults to `'en'` when unset. */
  lang?: string;
  /** Language-picker entries (i18n sites); empty/undefined = no picker. */
  localeAlternates?: LocaleAlternate[];
  /** Current locale's URL prefix (`'/ja'`, or `''`) — localizes config nav links. */
  localePrefix?: string;
  /** Render the draft ribbon (dev builds only — drafts never reach production). */
  draft?: boolean;
  /** Resolved UI-chrome strings for this locale. */
  strings: UiStrings;
  /** Text direction. `'rtl'` adds `dir="rtl"` to `<html>`; ltr/undefined emit nothing. */
  dir?: 'ltr' | 'rtl';
}

/** One entry in the topbar language picker, and the per-page hreflang set. */
export interface LocaleAlternate {
  /** BCP 47 code (e.g. `'ja'`). */
  code: string;
  /** Display label — the language's autonym (e.g. `'日本語'`). */
  label: string;
  /** Where switching to this locale goes — the equivalent page, or that
   *  locale's home when this page isn't translated. Raw (no basePath). */
  url: string;
  /** Whether this is the page's current locale. */
  current: boolean;
  /** True when a real translation of THIS page exists (vs. a home fallback). */
  translated: boolean;
  /** Whether this locale is the site's default (served at root) — for x-default. */
  isDefault: boolean;
}

function renderShell(opts: ShellOptions): string {
  const strings = opts.strings;
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
  // Back-to-top button (config-gated). The threshold rides on the data
  // attribute so the (theme-agnostic) script reads it without inlining config.
  const bt = opts.site.backToTop;
  const backToTop =
    bt?.enabled === false
      ? ''
      : `<div class="ov-to-top-anchor"><button class="ov-to-top" type="button" aria-label="${escapeAttr(strings.backToTop)}" data-ov-to-top="${bt?.threshold ?? 360}">${renderIcon('arrow-up', { size: 18 })}</button></div>`;
  // hreflang alternates for i18n pages — one per locale that actually has this
  // page, plus x-default → the default locale's version. Absolute URLs, so only
  // emitted when `site.baseUrl` is set.
  const hreflang =
    opts.site.baseUrl && opts.localeAlternates && opts.localeAlternates.length
      ? opts.localeAlternates
          .filter((a) => a.translated)
          .map(
            (a) =>
              `<link rel="alternate" hreflang="${escapeAttr(a.code)}" href="${escapeAttr(join(opts.site.baseUrl!, basePath + a.url))}">`,
          )
          .concat(
            opts.localeAlternates
              .filter((a) => a.translated && a.isDefault)
              .map(
                (a) =>
                  `<link rel="alternate" hreflang="x-default" href="${escapeAttr(join(opts.site.baseUrl!, basePath + a.url))}">`,
              ),
          )
          .join('\n  ')
      : '';
  const dirAttr = opts.dir === 'rtl' ? ' dir="rtl"' : '';
  // Mermaid: unless disabled, expose the lazy-load URL so script.js can fetch
  // the runtime on pages that actually contain a diagram. Pinned jsDelivr build
  // by default; `site.mermaid.url` points it at a self-hosted copy.
  const mermaid = opts.site.mermaid;
  const mermaidAttr =
    mermaid?.enabled === false
      ? ''
      : ` data-ov-mermaid="${escapeAttr(mermaid?.url ?? DEFAULT_MERMAID_URL)}"`;
  // Custom font (B4): a `{ body, mono?, source? }` object sets the default font
  // to a self-hosted family. `data-font="custom"` + an injected
  // `[data-font="custom"]` rule (after the base CSS, so it wins) + the source
  // stylesheet link(s). Readers can still switch to the built-ins via the picker.
  const customFont = typeof opts.site.font === 'object' ? opts.site.font : null;
  const fontKey = typeof opts.site.font === 'object' ? 'custom' : (opts.site.font ?? 'sans');
  const customFontHead = customFont ? renderCustomFontHead(customFont, basePath) : '';
  return `<!doctype html>
<html lang="${escapeAttr(opts.lang ?? 'en')}"${dirAttr} data-theme="${escapeAttr(opts.site.defaultTheme)}" data-palette="${escapeAttr(palette)}" data-font="${escapeAttr(fontKey)}"${accentAttrs}${mermaidAttr}>
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
  ${opts.tags && opts.tags.length ? `<meta name="keywords" content="${escapeAttr(opts.tags.join(', '))}">` : ''}
  ${desc ? `<meta name="description" content="${escapeAttr(desc)}">` : ''}
  ${opts.site.baseUrl ? `<link rel="canonical" href="${escapeAttr(join(opts.site.baseUrl, basePath + opts.url))}">` : ''}
  ${opts.site.baseUrl ? `<link rel="alternate" type="application/rss+xml" title="${escapeAttr(opts.site.title)}" href="${escapeAttr(join(opts.site.baseUrl, basePath + '/feed.xml'))}">` : ''}
  ${hreflang}
  <link rel="icon" href="${escapeAttr(siteUrl(opts.site.favicon ?? '/favicon.ico', basePath))}">
  <link rel="stylesheet" href="${escapeAttr(assets)}assets/ovellum.css">
  ${customFontHead}
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
        // Reader text size (xs|s|m|l|xl) — set pre-paint so the type scale is
        // right on first paint. 'm' is the default (no attribute needed).
        var ts = localStorage.getItem('ovellum-text-size');
        if (ts === 'xs' || ts === 's' || ts === 'l' || ts === 'xl') {
          d.setAttribute('data-text-size', ts);
        }
        // Body font. The server already set data-font from site.font; a stored
        // choice overrides it. 'inter'/'geist' pull a bundled webfont (only
        // here, when actually applied), so the swap is flash-free.
        var f = localStorage.getItem('ovellum-font');
        if (f === 'sans' || f === 'serif' || f === 'inter' || f === 'geist') {
          d.setAttribute('data-font', f);
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
${i18nScript(strings)}</head>
<body${opts.bodyClass ? ` class="${escapeAttr(opts.bodyClass)}${opts.draft ? ' ov-has-draft' : ''}"` : opts.draft ? ' class="ov-has-draft"' : ''}>
  ${opts.draft ? `<div class="ov-draft-ribbon" role="status"><strong>${escapeHtml(strings.draftLabel)}</strong> — ${escapeHtml(strings.draftRibbonNote)}.</div>` : ''}
  ${renderFrame()}
  ${renderTopbar(opts.site, assets, opts.docsHref ? siteUrl(opts.docsHref, basePath) : undefined, searchEnabled, basePath, strings, opts.localeAlternates, opts.localePrefix ?? '', opts.lang, opts.site.defaultLocale)}
  ${opts.body}
  ${backToTop}
  ${renderFooter(opts.site, opts.generatedAt, basePath, strings, opts.localePrefix ?? '', opts.lang, opts.site.defaultLocale)}
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

/**
 * Inline the runtime copy-button labels script.js reads back. Emitted only when
 * a label differs from the English default, so the default single-language
 * output stays byte-for-byte identical (script.js falls back to English).
 */
function i18nScript(strings: UiStrings): string {
  const runtime = { copy: strings.copy, copied: strings.copied, copyCode: strings.copyCode };
  if (
    runtime.copy === DEFAULT_STRINGS.copy &&
    runtime.copied === DEFAULT_STRINGS.copied &&
    runtime.copyCode === DEFAULT_STRINGS.copyCode
  ) {
    return '';
  }
  return `  <script>window.__OV_I18N__=${JSON.stringify(runtime)};</script>
  `;
}

interface ResolvedTopbarItem {
  label: string;
  href: string;
  external: boolean;
  icon?: IconName;
}

/**
 * Prefix a config-authored internal nav href with the current locale path so
 * topbar/footer links stay in-language (`/docs/` → `/ja/docs/` on a ja page).
 * External, anchor, mailto, and asset (file-extension) hrefs are left alone —
 * assets are shared/root-served, and only same-site page routes are localized.
 */
function localizeHref(href: string, localePrefix: string): string {
  if (!localePrefix || !href.startsWith('/')) return href;
  if (/\.[a-zA-Z0-9]+$/.test(href)) return href; // asset (e.g. /feed.xml) — root-served
  return localePrefix + href;
}

/** Resolve each configured item's href once so the auto-Docs link can dedupe. */
function resolveTopbarItems(
  site: OvellumSiteConfig & { title: string },
  basePath: string,
  localePrefix: string,
  lang: string | undefined,
  defaultLocale: string | undefined,
): ResolvedTopbarItem[] {
  return (site.topbarNav ?? []).map((item) => {
    const external = item.external === true || /^https?:\/\//i.test(item.href);
    const icon = item.icon && item.icon in ICONS ? (item.icon as IconName) : undefined;
    return {
      label: localize(item.label, lang, defaultLocale),
      href: external ? item.href : siteUrl(localizeHref(item.href, localePrefix), basePath),
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
  docsLabel: string,
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
      `<a class="ov-topbar-link ov-topbar-link--docs" href="${escapeAttr(docsHref)}">${escapeHtml(docsLabel)}</a>`,
    );
  }
  return links.join('\n        ');
}

/**
 * Appearance panel body: mode segmented control, theme list, color
 * swatches. Pure markup — script.js wires the behavior, CSS carries the
 * pressed/active states off aria attributes so every instance stays in sync.
 */
function renderAppearancePanel(strings: UiStrings, customFont?: OvellumCustomFont | null): string {
  const modes = [
    { id: 'auto', label: strings.modeAuto, icon: 'monitor' as IconName },
    { id: 'light', label: strings.modeLight, icon: 'sun' as IconName },
    { id: 'dark', label: strings.modeDark, icon: 'moon' as IconName },
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
  // Ovellum); the trailing custom swatch wraps a native color input.
  const accents = [
    { value: 'oklch(57% 0.16 255)', label: strings.accentBlue },
    { value: 'oklch(56% 0.18 295)', label: strings.accentViolet },
    { value: 'oklch(56% 0.14 150)', label: strings.accentGreen },
    { value: 'oklch(66% 0.13 65)', label: strings.accentAmber },
    { value: 'oklch(60% 0.17 15)', label: strings.accentRose },
    { value: 'oklch(60% 0.11 200)', label: strings.accentTeal },
  ];
  // Reader text-size steps — default in the middle, two smaller, two larger.
  // Rendered as a graduated "A" ramp (no text labels), like Kindle / Safari
  // Reader. Drives --ov-text-scale, scaling the whole type scale.
  const textSizes = [
    { id: 'xs', label: strings.textSmallest },
    { id: 's', label: strings.textSmall },
    { id: 'm', label: strings.textDefault },
    { id: 'l', label: strings.textLarge },
    { id: 'xl', label: strings.textLargest },
  ];
  // Body font family. 'sans'/'serif' are system stacks (no webfont); 'inter'/
  // 'geist' are bundled webfonts that load only when picked (the preview text
  // in this panel is what pulls them, and only once the panel is opened).
  const fonts: Array<{ id: string; label: string; family?: string }> = [
    { id: 'sans', label: strings.fontSans },
    { id: 'serif', label: strings.fontSerif },
    { id: 'inter', label: 'Inter' },
    { id: 'geist', label: 'Geist' },
  ];
  // A configured custom font leads the picker, previewed in its own family.
  if (customFont) {
    fonts.unshift({
      id: 'custom',
      label: customFont.label ?? 'Custom',
      family: customFont.body.replace(/[<>{};]/g, '').trim(),
    });
  }
  const modeButtons = modes
    .map(
      (m) => `<button type="button" class="ov-appearance-mode" data-ov-mode="${m.id}"
            aria-pressed="false" aria-label="${escapeAttr(m.label)}" title="${escapeAttr(m.label)}">${renderIcon(m.icon, { size: 14 })}<span>${escapeHtml(m.label)}</span></button>`,
    )
    .join('\n          ');
  const paletteButtons = palettes
    .map(
      (p) => `<button type="button" class="ov-appearance-palette" data-ov-palette="${p.id}"
            aria-pressed="false">${renderIcon(p.icon, { size: 16, class: 'ov-appearance-glyph' })}<span class="ov-appearance-palette-name">${escapeHtml(p.label)}</span>${renderIcon('check', { size: 14, class: 'ov-appearance-check' })}</button>`,
    )
    .join('\n          ');
  const accentButtons = accents
    .map(
      (a) => `<button type="button" class="ov-appearance-accent" data-ov-accent="${escapeAttr(a.value)}"
            style="--swatch: ${escapeAttr(a.value)}" aria-pressed="false" aria-label="${escapeAttr(a.label)}" title="${escapeAttr(a.label)}"></button>`,
    )
    .join('\n          ');
  const sizeButtons = textSizes
    .map(
      (s) => `<button type="button" class="ov-appearance-size" data-ov-text-size="${s.id}"
            aria-pressed="false" aria-label="${escapeAttr(s.label)}" title="${escapeAttr(s.label)}"><span class="ov-appearance-size-a" aria-hidden="true">A</span></button>`,
    )
    .join('\n          ');
  const fontButtons = fonts
    .map(
      (f) => `<button type="button" class="ov-appearance-font" data-ov-font="${f.id}"${f.family ? ` style="font-family:${escapeAttr(f.family)}"` : ''}
            aria-pressed="false"><span class="ov-appearance-font-name">${escapeHtml(f.label)}</span>${renderIcon('check', { size: 14, class: 'ov-appearance-check' })}</button>`,
    )
    .join('\n          ');
  return `<div class="ov-appearance-panel" data-ov-appearance-panel hidden>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">${escapeHtml(strings.modeLabel)}</span>
          <div class="ov-appearance-modes" role="group" aria-label="${escapeAttr(strings.modeGroup)}">
          ${modeButtons}
          </div>
        </div>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">${escapeHtml(strings.themeLabel)}</span>
          <div class="ov-appearance-palettes" role="group" aria-label="${escapeAttr(strings.themeGroup)}">
          ${paletteButtons}
          </div>
        </div>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">${escapeHtml(strings.colorLabel)}</span>
          <div class="ov-appearance-accents" role="group" aria-label="${escapeAttr(strings.colorGroup)}">
          <button type="button" class="ov-appearance-accent ov-appearance-accent--default" data-ov-accent=""
            aria-pressed="false" aria-label="${escapeAttr(strings.accentDefault)}" title="${escapeAttr(strings.accentDefault)}"></button>
          ${accentButtons}
          <span class="ov-appearance-accent ov-appearance-accent--custom" title="${escapeAttr(strings.accentCustom)}"><input type="color" data-ov-accent-custom aria-label="${escapeAttr(strings.accentCustom)}" value="#3b82f6"></span>
          </div>
        </div>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">${escapeHtml(strings.textSizeLabel)}</span>
          <div class="ov-appearance-sizes" role="group" aria-label="${escapeAttr(strings.textSizeGroup)}">
          ${sizeButtons}
          </div>
        </div>
        <div class="ov-appearance-group">
          <span class="ov-appearance-label">${escapeHtml(strings.fontLabel)}</span>
          <div class="ov-appearance-fonts" role="group" aria-label="${escapeAttr(strings.fontGroup)}">
          ${fontButtons}
          </div>
        </div>
      </div>`;
}

/**
 * Topbar language picker — a no-JS `<details>` disclosure listing each locale
 * (by autonym). Switching navigates to the page's equivalent in that locale, or
 * that locale's home when it isn't translated. Returns '' for single-language
 * sites (fewer than two locales).
 */
function renderLangPicker(
  alternates: LocaleAlternate[] | undefined,
  basePath: string,
  languageLabel: string,
): string {
  if (!alternates || alternates.length < 2) return '';
  const current = alternates.find((a) => a.current) ?? alternates[0]!;
  const options = alternates
    .map((a) => {
      const cls = a.current ? 'ov-lang-option is-current' : 'ov-lang-option';
      const aria = a.current ? ' aria-current="true"' : '';
      const check = a.current ? renderIcon('check', { size: 14, class: 'ov-lang-check' }) : '';
      return `<a class="${cls}" href="${escapeAttr(siteUrl(a.url, basePath))}" hreflang="${escapeAttr(a.code)}" lang="${escapeAttr(a.code)}"${aria}><span class="ov-lang-option-label">${escapeHtml(a.label)}</span>${check}</a>`;
    })
    .join('\n          ');
  return `<details class="ov-lang">
        <summary class="ov-lang-toggle" aria-label="${escapeAttr(languageLabel)}" title="${escapeAttr(languageLabel)}">${renderIcon('globe', { size: 16 })}<span class="ov-lang-current">${escapeHtml(current.label)}</span>${renderIcon('chevron-down', { size: 14, class: 'ov-lang-caret' })}</summary>
        <div class="ov-lang-menu" role="menu">
          ${options}
        </div>
      </details>`;
}

function renderTopbar(
  site: OvellumSiteConfig & { title: string },
  assets: string,
  docsHref: string | undefined,
  searchEnabled: boolean,
  basePath: string,
  strings: UiStrings,
  localeAlternates?: LocaleAlternate[],
  localePrefix = '',
  lang?: string,
  defaultLocale?: string,
): string {
  const items = resolveTopbarItems(site, basePath, localePrefix, lang, defaultLocale);
  const langPicker = renderLangPicker(localeAlternates, basePath, strings.languageLabel);
  // Desktop splits text links from icon links so a divider can sit between
  // them; the mobile sheet keeps them in one labeled list.
  const desktopTextLinks = renderTopbarLinks(items, docsHref, true, strings.docsLink, 'text');
  const desktopIconLinks = renderTopbarLinks(items, docsHref, true, strings.docsLink, 'icon');
  const mobileLinks = renderTopbarLinks(items, docsHref, false, strings.docsLink);
  const search = searchEnabled ? `<div id="ov-search" class="ov-search"></div>` : '';
  // The hamburger only appears below the responsive breakpoint via CSS.
  const menuButton = `<button class="ov-topbar-menu" type="button"
      aria-label="${escapeAttr(strings.openMenu)}" aria-expanded="false" aria-controls="ov-mobile-nav"
      data-ov-menu-toggle>
      <span class="ov-topbar-menu-open">${renderIcon('menu', { size: 22 })}</span>
      <span class="ov-topbar-menu-close">${renderIcon('close', { size: 22 })}</span>
    </button>`;
  // Appearance control — mode (auto/light/dark), palette, and accent in one
  // panel. Two instances: a popover in the desktop icon cluster, the panel
  // inlined in the mobile sheet. State lives on <html> (data-theme /
  // data-palette / --ov-accent); script.js wires every instance and keeps
  // their pressed states in sync, so duplicates can't drift.
  const customFont = typeof site.font === 'object' ? site.font : null;
  const appearancePopover = `<div class="ov-appearance" data-ov-appearance>
      <button class="ov-theme-toggle" type="button"
        aria-label="${escapeAttr(strings.appearance)}" title="${escapeAttr(strings.appearance)}"
        aria-haspopup="true" aria-expanded="false" data-ov-appearance-toggle>
        ${renderIcon('palette', { size: 18 })}
      </button>
      ${renderAppearancePanel(strings, customFont)}
    </div>`;
  const versionBadge = site.version
    ? `<span class="ov-brand-version" aria-label="Stable version ${escapeAttr(site.version)}">${escapeHtml(site.version)}</span>`
    : '';
  // Optional brand mark. Rendered as a CSS-masked element so it inherits the
  // foreground color and flips with the theme (a monochrome silhouette,
  // on-brand with the editorial palette). Decorative — the title text carries
  // the accessible name. Unset = no mark; the title stands alone. The logo URL
  // is validated to exclude characters that could break out of the url('…').
  // Unquoted url() — the logo is validated to contain no whitespace, quotes,
  // or parens, so it needs no quoting, and that keeps it clean through HTML
  // attribute escaping (which would otherwise turn the quotes into entities).
  const logoUrl = site.logo ? siteUrl(site.logo, basePath) : '';
  const logoMark = logoUrl
    ? `<span class="ov-brand-mark" aria-hidden="true" style="${escapeAttr(`-webkit-mask-image:url(${logoUrl});mask-image:url(${logoUrl})`)}"></span>`
    : '';
  return `<header class="ov-topbar">
    <div class="ov-topbar-inner">
      <div class="ov-brand-row">
        <a class="ov-brand" href="${escapeAttr(assets)}">${logoMark}<span class="ov-brand-name">${escapeHtml(site.title)}</span></a>
        ${versionBadge}
      </div>
      <div class="ov-topbar-search">${search}</div>
      <div class="ov-topbar-right">
        <nav class="ov-topbar-nav" aria-label="${escapeAttr(strings.primaryNav)}">${desktopTextLinks}</nav>
        ${langPicker}
        ${desktopTextLinks || langPicker ? '<span class="ov-topbar-divider" aria-hidden="true"></span>' : ''}
        ${desktopIconLinks ? `<div class="ov-topbar-icons">
          ${desktopIconLinks}
        </div>
        <span class="ov-topbar-divider" aria-hidden="true"></span>` : ''}
        ${appearancePopover}
        ${menuButton}
      </div>
      <nav id="ov-mobile-nav" class="ov-mobile-nav" aria-label="${escapeAttr(strings.mobileNav)}">
        ${mobileLinks}
        ${langPicker ? `<div class="ov-mobile-lang">${langPicker}</div>` : ''}
        <div class="ov-mobile-theme" data-ov-appearance>
          ${renderAppearancePanel(strings, customFont)}
        </div>
      </nav>
    </div>
  </header>`;
}

function renderFooter(
  site: OvellumSiteConfig & { title: string },
  generatedAt: string,
  basePath: string,
  strings: UiStrings,
  localePrefix = '',
  lang?: string,
  defaultLocale?: string,
): string {
  const items = site.footerNav ?? [];
  const hasItems = items.length > 0;
  const showCredit = site.credit !== false; // default true
  if (!site.footer && !hasItems && !showCredit) return '';

  // Left column: the author's footer text (+ build date), then an optional
  // "Built with Ovellum" credit link. Either may be absent; joined by a dot.
  const bits: string[] = [];
  if (site.footer) {
    bits.push(
      `<span>${escapeHtml(site.footer)}</span><span class="ov-footer-sep">·</span><time datetime="${escapeAttr(generatedAt)}">${escapeHtml(generatedAt.slice(0, 10))}</time>`,
    );
  }
  if (showCredit) {
    bits.push(
      `<a class="ov-footer-credit" href="https://ovellum.oss.oinam.com" rel="noopener" target="_blank">${escapeHtml(strings.builtWith)}</a>`,
    );
  }
  const left = `<div class="ov-footer-left">${bits.join('<span class="ov-footer-sep">·</span>')}</div>`;

  const right = hasItems
    ? `<nav class="ov-footer-right" aria-label="${escapeAttr(strings.footerNav)}">${items.map((item) => renderFooterNavItem(item, basePath, localePrefix, lang, defaultLocale)).join('')}</nav>`
    : '';

  return `<footer class="ov-footer"><div class="ov-footer-inner">${left}${right}</div></footer>`;
}

function renderFooterNavItem(
  item: {
    label: string | Record<string, string>;
    href: string;
    icon?: string;
    external?: boolean;
  },
  basePath: string,
  localePrefix = '',
  lang?: string,
  defaultLocale?: string,
): string {
  const external = item.external === true || /^https?:\/\//i.test(item.href);
  const href = external ? item.href : siteUrl(localizeHref(item.href, localePrefix), basePath);
  const rel = external ? ' rel="noopener" target="_blank"' : '';
  const label = localize(item.label, lang, defaultLocale);
  const iconName = item.icon as IconName | undefined;
  if (iconName && iconName in ICONS) {
    return `<a class="ov-footer-link ov-footer-link--icon" href="${escapeAttr(href)}"${rel} aria-label="${escapeAttr(label)}" title="${escapeAttr(label)}">${renderIcon(iconName, { class: 'ov-footer-icon', size: 18 })}<span class="ov-sr-only">${escapeHtml(label)}</span></a>`;
  }
  return `<a class="ov-footer-link" href="${escapeAttr(href)}"${rel}>${escapeHtml(label)}</a>`;
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
  /** Frontmatter tags → `<meta name="keywords">`. */
  tags?: string[];
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
  breadcrumbs?: Array<{ title: string; url: string; page?: boolean }>;
  /**
   * Site-relative URL of this page's `.md` mirror, when one was emitted
   * (`site.ai.mdMirror` on, real page). Drives the "Copy page / open in an LLM"
   * actions; omitted = no actions rendered.
   */
  markdownUrl?: string;
  /** Reading-time estimate in whole minutes (already computed and rounded). */
  readingMinutes?: number;
  /** ISO-8601 timestamp of the source file's last modification. */
  lastModified?: string;
  /** Optional class added to `<body>`. Used today for the special 404 layout. */
  bodyClass?: string;
  /** `<html lang>` for i18n sites; defaults to `'en'` when unset. */
  lang?: string;
  /** Language-picker entries (i18n sites); empty/undefined = no picker. */
  localeAlternates?: LocaleAlternate[];
  /** Current locale's URL prefix (`'/ja'`, or `''`) — localizes config nav links. */
  localePrefix?: string;
  /** Draft page — renders the ribbon (dev only). */
  draft?: boolean;
  /** Resolved UI-chrome strings. Defaults to English when omitted. */
  strings?: UiStrings;
  /** Text direction; `'rtl'` adds `dir="rtl"` to `<html>`. */
  dir?: 'ltr' | 'rtl';
}

/**
 * Render a full HTML document for one doc page (sidebar + content + ToC).
 */
export function renderPage(input: RenderPageInput): string {
  const strings = input.strings ?? DEFAULT_STRINGS;
  const fullTitle =
    input.title && input.title !== input.site.title
      ? `${input.title} · ${input.site.title}`
      : input.site.title;

  const basePath = normaliseBasePath(input.site.basePath);
  // Collapse folders unless the site opts out (`site.sidebar.collapse: false`).
  // Optional-chained: partial site fixtures (tests/landing) may omit `sidebar`.
  const collapseSidebar = input.site.sidebar?.collapse !== false;
  const sidebar = renderSidebar(input.nav, input.url, basePath, collapseSidebar, strings);
  const toc = renderToc(input.headings, strings);
  const prevNext = renderPrevNext(input.prev, input.next, basePath, strings);
  const breadcrumbs = renderBreadcrumbs(input.breadcrumbs, basePath, strings);
  const pageMeta = renderPageMeta(
    input.readingMinutes,
    input.lastModified,
    input.generatedAt,
    input.site.dateFormat ?? 'humanized',
    strings,
    input.lang,
  );
  const editLink = input.editUrl
    ? `<p class="ov-edit-page"><a class="ov-edit-link" href="${escapeAttr(input.editUrl)}" rel="noopener" target="_blank">${escapeHtml(strings.editThisPage)}</a></p>`
    : '';
  const pageActions = renderPageActions(input.markdownUrl, input.site, strings);

  const body = `<div class="ov-layout">
    <aside class="ov-sidebar" aria-label="${escapeAttr(strings.siteNav)}">${sidebar}</aside>
    <main class="ov-content">
      <div class="ov-content-card">
        ${breadcrumbs}
        ${pageMeta}
        ${pageActions}
        <article class="ov-prose">${input.bodyHtml}</article>
        ${editLink}
      </div>
      ${prevNext}
    </main>
    <aside class="ov-toc" aria-label="${escapeAttr(strings.tocTitle)}">${toc}</aside>
  </div>`;

  return renderShell({
    site: input.site,
    fullTitle,
    description: input.description,
    tags: input.tags,
    url: input.url,
    assetsPrefix: input.assetsPrefix,
    docsHref: input.docsHref,
    generatedAt: input.generatedAt,
    body,
    bodyClass: input.bodyClass,
    lang: input.lang,
    localeAlternates: input.localeAlternates,
    localePrefix: input.localePrefix,
    draft: input.draft,
    strings,
    dir: input.dir,
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
  /** Canonical site-relative URL (the locale's home for i18n); defaults to `/`. */
  url?: string;
  /** `<html lang>` for i18n sites; defaults to `'en'` when unset. */
  lang?: string;
  /** Language-picker entries (i18n sites); empty/undefined = no picker. */
  localeAlternates?: LocaleAlternate[];
  /** Current locale's URL prefix (`'/ja'`, or `''`) — localizes config nav links. */
  localePrefix?: string;
  /** Resolved UI-chrome strings. Defaults to English when omitted. */
  strings?: UiStrings;
  /** Text direction; `'rtl'` adds `dir="rtl"` to `<html>`. */
  dir?: 'ltr' | 'rtl';
}

/**
 * Render the landing-page document. Sections in order: hero, feature grid,
 * optional pitch (free-form markdown body from `_landing.md`), optional
 * trust strip.
 */
export function renderLanding(input: RenderLandingInput): string {
  const strings = input.strings ?? DEFAULT_STRINGS;
  const lang = input.lang;
  const def = input.site.defaultLocale;
  const loc = (v: string | Record<string, string> | undefined): string => localize(v, lang, def);

  const heroTitle = input.landing.hero.title ? loc(input.landing.hero.title) : input.site.title;
  const fullTitle = input.site.title;
  const basePath = normaliseBasePath(input.site.basePath);

  // Resolve config-localized labels to plain strings here, then pass them to the
  // string-typed sub-renderers (their signatures stay locale-agnostic).
  const ctas = input.landing.hero.ctas.map((cta) => ({ ...cta, label: loc(cta.label) }));
  const features = input.landing.features.map((f) => ({
    ...f,
    title: loc(f.title),
    description: loc(f.description),
  }));
  const trustStrip = input.landing.trustStrip
    ? {
        ...input.landing.trustStrip,
        label: input.landing.trustStrip.label ? loc(input.landing.trustStrip.label) : undefined,
        items: input.landing.trustStrip.items.map((it) => ({ ...it, name: loc(it.name) })),
      }
    : undefined;

  const hero = renderHero(
    heroTitle,
    input.landing.hero.subtitle ? loc(input.landing.hero.subtitle) : undefined,
    ctas,
    input.landing.hero.media,
    basePath,
  );
  const install = renderInstall(input.install ?? []);
  const featuresHtml = renderFeatures(features, basePath, input.localePrefix ?? '');
  const pitch = input.pitchHtml
    ? `<section class="ov-pitch"><div class="ov-pitch-inner">${input.pitchHtml}</div></section>`
    : '';
  const trust = renderTrustStrip(trustStrip);

  // Interleave scenes between the rendered sections, in order. With three
  // sections after the hero, three scenes fill all three gaps; extras fall
  // through after the last section.
  const sections = [hero, install, featuresHtml, pitch, trust].filter((s) => s !== '');
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
    url: input.url ?? '/',
    assetsPrefix: input.assetsPrefix,
    docsHref: input.docsHref ? siteUrl(input.docsHref, basePath) : undefined,
    generatedAt: input.generatedAt,
    body,
    bodyClass: 'ov-body-landing',
    lang: input.lang,
    localeAlternates: input.localeAlternates,
    localePrefix: input.localePrefix,
    strings,
    dir: input.dir,
  });
}

function renderHero(
  title: string,
  subtitle: string | undefined,
  // Labels already resolved to plain strings by the caller (`renderLanding`).
  ctas: Array<{ label: string; href: string; style?: OvellumLandingConfig['hero']['ctas'][number]['style'] }>,
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

// Labels already resolved to plain strings by `renderLanding`.
function renderFeatures(
  features: Array<{ icon?: string; title: string; description: string; href?: string }>,
  basePath: string,
  localePrefix: string,
): string {
  if (features.length === 0) return '';
  const cards = features
    .map((f) => {
      const icon = f.icon ? `<div class="ov-feature-icon" aria-hidden="true">${f.icon}</div>` : '';
      const inner = `${icon}
        <h3 class="ov-feature-title">${escapeHtml(f.title)}</h3>
        <p class="ov-feature-description">${escapeHtml(f.description)}</p>`;
      if (f.href) {
        const external = /^https?:\/\//i.test(f.href);
        const url = external ? f.href : siteUrl(localizeHref(f.href, localePrefix), basePath);
        const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a class="ov-card ov-feature-card ov-feature-card-link" href="${escapeAttr(url)}"${attrs}>
        ${inner}
      </a>`;
      }
      return `<article class="ov-card ov-feature-card">
        ${inner}
      </article>`;
    })
    .join('\n      ');
  return `<section class="ov-feature-grid-wrap">
    <div class="ov-feature-grid">
      ${cards}
    </div>
  </section>`;
}

// Labels/names already resolved to plain strings by `renderLanding`.
function renderTrustStrip(
  trust:
    | { label?: string; items: Array<{ name: string; href?: string; image?: string }> }
    | undefined,
): string {
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

function renderSidebar(
  nav: NavNode,
  activeUrl: string,
  basePath: string,
  collapse: boolean,
  strings: UiStrings,
): string {
  return `<nav class="ov-sidebar-nav"><ul>${navList(nav.children, activeUrl, basePath, collapse, strings)}</ul></nav>`;
}

/** True when this node, or any descendant, is the active page. */
function subtreeHasActive(node: NavNode, activeUrl: string): boolean {
  if (node.url === activeUrl) return true;
  return node.children.some((c) => subtreeHasActive(c, activeUrl));
}

function navList(
  nodes: NavNode[],
  activeUrl: string,
  basePath: string,
  collapse: boolean,
  strings: UiStrings,
): string {
  if (nodes.length === 0) return '';
  return nodes
    .map((node) => {
      const isActive = node.url === activeUrl;
      const hasChildren = node.children.length > 0;
      const href = node.sourcePath ? escapeAttr(siteUrl(node.url, basePath)) : undefined;
      // Draft badge (dev builds only — drafts are absent in production).
      const badge = node.draft ? `<span class="ov-nav-draft">${escapeHtml(strings.draftLabel)}</span>` : '';
      // Leaf page → a plain link (normal weight).
      if (!hasChildren) {
        const link = href
          ? `<a class="ov-nav-link${isActive ? ' is-active' : ''}" href="${href}">${escapeHtml(node.title)}${badge}</a>`
          : `<span class="ov-nav-group">${escapeHtml(node.title)}${badge}</span>`;
        return `<li>${link}</li>`;
      }
      // Folder → a bold category heading (group style), even when the folder
      // has its own `index.md` (then the heading is a clickable link to it).
      const heading = href
        ? `<a class="ov-nav-group ov-nav-group--link${isActive ? ' is-active' : ''}" href="${href}">${escapeHtml(node.title)}${badge}</a>`
        : `<span class="ov-nav-group">${escapeHtml(node.title)}${badge}</span>`;
      // <details> disclosure (no JS). Collapsed by default, but the branch
      // holding the current page stays open so the active item is visible;
      // `site.sidebar.collapse: false` opens every folder, and a folder's
      // `_meta.json` may override the default per-folder (`node.collapse`).
      // The chevron rotates via CSS on [open]. Clicking a heading link
      // navigates (full reload), so the toggle/link overlap is harmless.
      const effectiveCollapse = node.collapse ?? collapse;
      const open = !effectiveCollapse || subtreeHasActive(node, activeUrl);
      const children = `<ul class="ov-nav-children">${navList(node.children, activeUrl, basePath, collapse, strings)}</ul>`;
      return `<li><details class="ov-nav-section"${open ? ' open' : ''}><summary class="ov-nav-summary">${heading}${renderIcon('chevron-down', { class: 'ov-nav-chevron', size: 14 })}</summary>${children}</details></li>`;
    })
    .join('');
}

function renderBreadcrumbs(
  trail: Array<{ title: string; url: string; page?: boolean }> | undefined,
  basePath: string,
  strings: UiStrings,
): string {
  // The trail includes the synthetic root node, so a top-level page like
  // /getting-started/ has length 2. Only render when there's at least one
  // real group between the root and the current page.
  if (!trail || trail.length < 3) return '';
  const visible = trail.slice(1);
  const items = visible
    .map((node, i) => {
      const isLast = i === visible.length - 1;
      // A crumb that isn't a real route (a section folder with no index page,
      // `page === false`) renders as plain text instead of a dead link.
      if (isLast || node.page === false) {
        const attr = isLast ? ' is-current" aria-current="page"' : '"';
        return `<li class="ov-crumb${attr}>${escapeHtml(node.title)}</li>`;
      }
      return `<li class="ov-crumb"><a href="${escapeAttr(siteUrl(node.url, basePath))}">${escapeHtml(node.title)}</a></li>`;
    })
    .join('\n      ');
  return `<nav class="ov-breadcrumbs" aria-label="${escapeAttr(strings.breadcrumb)}">
    <ol>
      ${items}
    </ol>
  </nav>`;
}

/**
 * The "use this page with an LLM" actions, rendered when the page has a `.md`
 * mirror (`markdownUrl`). "Copy page" grabs the Markdown (client-side fetch);
 * "View as Markdown" links to the mirror; and — only when `site.baseUrl` is set,
 * so the link is absolute and an agent can fetch it — "Open in ChatGPT/Claude"
 * deep-link to those tools with a prompt pointing at the mirror.
 */
function renderPageActions(
  markdownUrl: string | undefined,
  site: OvellumSiteConfig,
  strings: UiStrings,
): string {
  if (!markdownUrl) return '';
  const actions = [
    `<button class="ov-page-action" type="button" data-ov-copy-md="${escapeAttr(markdownUrl)}" data-ov-copied="${escapeAttr(strings.copied)}">${escapeHtml(strings.copyPage)}</button>`,
    `<a class="ov-page-action" href="${escapeAttr(markdownUrl)}">${escapeHtml(strings.viewMarkdown)}</a>`,
  ];
  if (site.baseUrl) {
    const absMd = join(site.baseUrl, markdownUrl);
    const prompt = encodeURIComponent(`Read ${absMd} — I have questions about this documentation page.`);
    actions.push(
      `<a class="ov-page-action" href="https://chatgpt.com/?q=${prompt}" target="_blank" rel="noopener">${escapeHtml(strings.askChatGpt)}</a>`,
    );
    actions.push(
      `<a class="ov-page-action" href="https://claude.ai/new?q=${prompt}" target="_blank" rel="noopener">${escapeHtml(strings.askClaude)}</a>`,
    );
  }
  return `<div class="ov-page-actions">${actions.join('')}</div>`;
}

function renderPageMeta(
  readingMin: number | undefined,
  lastModifiedISO: string | undefined,
  generatedAt: string,
  dateFormat: OvellumDateFormat,
  strings: UiStrings,
  localeCode?: string,
): string {
  const parts: string[] = [];
  if (typeof readingMin === 'number' && readingMin > 0) {
    parts.push(`<span class="ov-page-meta-read">${readingMin} ${escapeHtml(strings.minRead)}</span>`);
  }
  if (lastModifiedISO) {
    const label = formatEditedDate(lastModifiedISO, generatedAt, dateFormat, localeCode, strings);
    parts.push(
      `<span class="ov-page-meta-edited">${escapeHtml(strings.editedLabel)} <time datetime="${escapeAttr(lastModifiedISO)}">${escapeHtml(label)}</time></span>`,
    );
  }
  if (parts.length === 0) return '';
  return `<p class="ov-page-meta">${parts.join('<span class="ov-page-meta-sep"> · </span>')}</p>`;
}

function renderPrevNext(
  prev: PrevNextPage | undefined,
  next: PrevNextPage | undefined,
  basePath: string,
  strings: UiStrings,
): string {
  if (!prev && !next) return '';
  const prevHtml = prev
    ? `<a class="ov-prevnext-link ov-prevnext-prev" href="${escapeAttr(siteUrl(prev.url, basePath))}">
         <span class="ov-prevnext-label">${escapeHtml(strings.previous)}</span>
         <span class="ov-prevnext-title">${escapeHtml(prev.title)}</span>
       </a>`
    : '<span class="ov-prevnext-spacer" aria-hidden="true"></span>';
  const nextHtml = next
    ? `<a class="ov-prevnext-link ov-prevnext-next" href="${escapeAttr(siteUrl(next.url, basePath))}">
         <span class="ov-prevnext-label">${escapeHtml(strings.next)}</span>
         <span class="ov-prevnext-title">${escapeHtml(next.title)}</span>
       </a>`
    : '<span class="ov-prevnext-spacer" aria-hidden="true"></span>';
  return `<nav class="ov-prevnext" aria-label="${escapeAttr(strings.pageNav)}">
    ${prevHtml}
    ${nextHtml}
  </nav>`;
}

function renderToc(headings: Heading[], strings: UiStrings): string {
  if (headings.length === 0) return '';
  const items = headings
    .map(
      (h) =>
        `<li class="ov-toc-h${h.depth}"><a href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a></li>`,
    )
    .join('');
  return `<div class="ov-toc-inner"><p class="ov-toc-title">${escapeHtml(strings.tocTitle)}</p><ul>${items}</ul></div>`;
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
