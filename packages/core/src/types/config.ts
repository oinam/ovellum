export type OvellumMode = 'hybrid' | 'manual' | 'auto';

export type OvellumFormat = 'md' | 'mdx';

export type OrphanStrategy = 'quarantine' | 'warn';

export interface ProtectConfig {
  /** Markdown block tag (without `:start`/`:end` suffix). Default: `@manual`. */
  blockTag: string;
  /** JSDoc inline tag. Default: `@preserve`. */
  inlineTag: string;
  orphanStrategy: OrphanStrategy;
  /** Relative path from project root where quarantined orphans are written. */
  orphanDir: string;
  /** Days before orphans are flagged stale by `ovellum orphans --stale`. */
  orphanRetention: number;
}

export type OvellumDefaultTheme = 'auto' | 'light' | 'dark';

/**
 * Code-block theme pair (passed to shiki). Each option resolves to a
 * `{ light, dark }` pair so a single build serves both colour schemes
 * via CSS variables. Defaults to `'github'`.
 */
export type OvellumCodeTheme = 'github' | 'nord' | 'solarized';

export type OvellumCtaStyle = 'primary' | 'secondary';

export interface OvellumLandingCta {
  label: string;
  href: string;
  /** Visual style. Defaults to `'primary'` for the first CTA, `'secondary'` thereafter. */
  style?: OvellumCtaStyle;
}

export interface OvellumLandingHeroMedia {
  /**
   * Asset shown by default (and under light theme). Site-relative path or
   * absolute URL. SVG is recommended; the file is referenced via `<img>`
   * so any embedded `<style>`/animations stay self-contained.
   */
  light: string;
  /**
   * Optional dark-theme asset. When set, swapped in via CSS under
   * `[data-theme='dark']`. When unset, `light` is used for both themes.
   */
  dark?: string;
  /** Alt text for assistive tech. Default `''` (decorative). */
  alt?: string;
}

export interface OvellumLandingHero {
  /** Defaults to `site.title`. */
  title?: string;
  /** Short tagline rendered under the title. */
  subtitle?: string;
  /** Hero call-to-action buttons. Render in order. */
  ctas: OvellumLandingCta[];
  /**
   * Full-bleed visual rendered behind the title/subtitle/CTA stack. When
   * set, the default dotted-noise + radial-spotlight pseudo-layers are
   * suppressed in favour of the supplied asset(s).
   */
  media?: OvellumLandingHeroMedia;
}

export interface OvellumLandingFeature {
  /** Emoji, short string, or raw HTML (e.g. SVG). Rendered as-is. */
  icon?: string;
  title: string;
  description: string;
}

export interface OvellumLandingScene {
  /**
   * Default (and light-theme) asset. Site-relative path or absolute URL.
   * Rendered as a full-bleed ambient visual between landing sections.
   */
  light: string;
  /**
   * Optional dark-theme variant. When unset, `light` is used for both themes.
   */
  dark?: string;
  /** Alt text. Default `''` (decorative). */
  alt?: string;
}

export interface OvellumLandingTrustItem {
  name: string;
  /** Optional external link. */
  href?: string;
  /** Path (relative to `input/`) to an SVG/PNG passed through as a static asset. */
  image?: string;
}

export interface OvellumLandingTrustStrip {
  /** Section label, e.g. `"Trusted by"`. */
  label?: string;
  items: OvellumLandingTrustItem[];
}

export interface OvellumSiteSearchConfig {
  /** When `true`, Pagefind runs after `ovellum build` and the topbar gains a search box. */
  enabled: boolean;
}

export interface OvellumTopbarNavItem {
  /** Visible label. Always rendered (even when `icon` is set) for screen readers. */
  label: string;
  /** Site-relative or external href. */
  href: string;
  /**
   * Optional icon name (one of the registry entries: `github`, `package`,
   * `rss`, `mail`, etc). When set, the desktop topbar renders the icon alone
   * (label kept visually hidden for a11y); the mobile sheet still shows the
   * label beside the icon. When unset, the label is shown as plain text.
   */
  icon?: string;
  /**
   * When `true`, link opens in a new tab with `rel="noopener"` and a small
   * external-link icon is appended. Defaults to `false` (or auto-detected
   * from `href` starting with `http://`/`https://` if you want).
   */
  external?: boolean;
}

export interface OvellumFooterNavItem {
  /** Visible label. Always rendered (even when `icon` is set) for screen readers. */
  label: string;
  /** Site-relative or external href. */
  href: string;
  /**
   * Optional icon name (one of the registry entries: `github`, `rss`, `mail`,
   * `package`, etc). When set, the label becomes visually hidden (still
   * accessible) and the icon is rendered alone. When unset, the label is
   * shown as plain text.
   */
  icon?: string;
  /**
   * When `true`, link opens in a new tab with `rel="noopener"`. Auto-detected
   * from `http(s)://` hrefs if omitted.
   */
  external?: boolean;
}

export interface OvellumSitePageMetaConfig {
  /** Show "N min read" above the article. Default `true`. ~200 wpm. */
  readingTime: boolean;
  /**
   * Show "Updated YYYY-MM-DD" above the article. Default `true`. Uses the
   * page's last git-commit time when available, otherwise the filesystem
   * mtime. Falls back to omitting the line if neither is readable.
   */
  lastModified: boolean;
}

export interface OvellumLandingConfig {
  /** Render a landing page at `/` instead of the regular doc index. */
  enabled: boolean;
  /**
   * Destination of the top-bar "Docs" link. If unset, falls back to the first
   * page in the auto-generated sidebar nav.
   */
  docsHref?: string;
  hero: OvellumLandingHero;
  features: OvellumLandingFeature[];
  /**
   * Ambient "scene" visuals interleaved between the rendered landing
   * sections (hero / features / pitch / trust), in order. With three sections
   * after the hero, three scenes fill all three gaps. Extras fall through
   * after the trust strip.
   */
  scenes: OvellumLandingScene[];
  /** Trust strip rendered after the prose body, if any. */
  trustStrip?: OvellumLandingTrustStrip;
}

export interface OvellumSiteConfig {
  /** Site title. Defaults to `OvellumConfig.name` or `'Ovellum site'`. */
  title?: string;
  /**
   * Optional version badge rendered next to the brand in the top bar
   * (e.g. `"v0.2.0"`). The site has no idea what version of the
   * underlying tool the docs describe — write whatever you want here.
   * Unset = no badge.
   */
  version?: string;
  /** Short description (used in `<meta>` and the footer). */
  description?: string;
  /** Base URL for absolute links / OG cards, e.g. `https://docs.example.com`. */
  baseUrl?: string;
  /**
   * Subpath the site is served from, Jekyll-style. Leading slash, no
   * trailing slash. Example: `"/ovellum"` makes the site available at
   * `https://<user>.github.io/ovellum/` — every internal link, asset URL,
   * canonical, and sitemap entry is prefixed with this value. Authors
   * keep writing root-relative links (`/getting-started/`) and the build
   * applies the prefix at render time.
   *
   * Defaults to `""` (no prefix; site is served from the root).
   */
  basePath?: string;
  /** Initial theme before user preference loads. */
  defaultTheme: OvellumDefaultTheme;
  /** Footer text. Empty string disables the footer entirely. */
  footer: string;
  /**
   * Pattern for the "Edit this page" link in the page footer. The literal
   * `{path}` is replaced with each page's source path **relative to the
   * build cwd** (`--cwd <dir>`, defaults to `process.cwd()`). When unset
   * the link is not rendered.
   *
   * If you run `ovellum build --cwd website` from a repo root, `{path}`
   * will look like `content/getting-started.md`. Include any prefix you
   * need in the pattern itself:
   *
   *   `'https://github.com/owner/repo/edit/main/website/{path}'`.
   */
  editUrlPattern?: string;
  /** Syntax-highlighting theme for fenced code blocks. Default `'github'`. */
  codeTheme: OvellumCodeTheme;
  /** Build-time search indexing via Pagefind. Disabled by default. */
  search: OvellumSiteSearchConfig;
  /** Per-page meta line (reading time + last-modified) above the article. */
  pageMeta: OvellumSitePageMetaConfig;
  /**
   * Right-aligned topbar nav items, rendered to the right of the brand on
   * every page (including the landing). Empty by default. Order is preserved.
   */
  topbarNav: OvellumTopbarNavItem[];
  /**
   * Right-aligned footer nav items (typically social / contact links).
   * Rendered to the right of the `footer` text in the page footer. Empty by
   * default. Order is preserved. Items with `icon` render as icon-only;
   * items without render as plain text.
   */
  footerNav: OvellumFooterNavItem[];
  /** Landing-page settings. Disabled by default. */
  landing: OvellumLandingConfig;
}

export interface OvellumConfig {
  /** Defaults to `package.json#name`. */
  name?: string;
  /** `'auto'` reads from `package.json#version`; otherwise a literal version string. */
  version: 'auto' | string;
  mode: OvellumMode;
  /** Source / content directory (TS sources in `auto`/`hybrid`; `.md` content in `manual`). */
  input: string;
  include: string[];
  exclude: string[];
  includeInternal: boolean;
  includePrivate: boolean;
  /** Output directory for generated docs (Markdown for auto/hybrid; HTML for manual). */
  output: string;
  defaultFormat: OvellumFormat;
  protect: ProtectConfig;
  /** Site-builder settings used by `manual` mode. */
  site: OvellumSiteConfig;
}

/** All fields optional — what users actually write in `ovellum.config.ts`. */
export type OvellumUserConfig = Partial<Omit<OvellumConfig, 'protect' | 'site'>> & {
  protect?: Partial<ProtectConfig>;
  site?: Partial<OvellumSiteConfig>;
};

export const DEFAULT_CONFIG: OvellumConfig = {
  version: 'auto',
  mode: 'hybrid',
  input: './src',
  include: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  exclude: ['node_modules', 'dist', '**/*.test.*', '**/*.spec.*', '**/*.d.ts'],
  includeInternal: false,
  includePrivate: false,
  output: './docs',
  defaultFormat: 'md',
  protect: {
    blockTag: '@manual',
    inlineTag: '@preserve',
    orphanStrategy: 'quarantine',
    orphanDir: '.ovellum/orphans',
    orphanRetention: 90,
  },
  site: {
    defaultTheme: 'auto',
    codeTheme: 'github',
    footer: 'Built with Ovellum',
    search: { enabled: false },
    pageMeta: { readingTime: true, lastModified: true },
    topbarNav: [],
    footerNav: [],
    landing: {
      enabled: false,
      hero: { ctas: [] },
      features: [],
      scenes: [],
    },
  },
};

/** Frontmatter override block: `ovellum: { mode: 'manual' }`. */
export interface OvellumFrontmatterOverride {
  mode?: OvellumMode;
  defaultFormat?: OvellumFormat;
}
