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

export type OvellumCtaStyle = 'primary' | 'secondary';

export interface OvellumLandingCta {
  label: string;
  href: string;
  /** Visual style. Defaults to `'primary'` for the first CTA, `'secondary'` thereafter. */
  style?: OvellumCtaStyle;
}

export interface OvellumLandingHero {
  /** Defaults to `site.title`. */
  title?: string;
  /** Short tagline rendered under the title. */
  subtitle?: string;
  /** Hero call-to-action buttons. Render in order. */
  ctas: OvellumLandingCta[];
}

export interface OvellumLandingFeature {
  /** Emoji, short string, or raw HTML (e.g. SVG). Rendered as-is. */
  icon?: string;
  title: string;
  description: string;
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
  /** Visible label. */
  label: string;
  /** Site-relative or external href. */
  href: string;
  /**
   * When `true`, link opens in a new tab with `rel="noopener"` and a small
   * external-link icon is appended. Defaults to `false` (or auto-detected
   * from `href` starting with `http://`/`https://` if you want).
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
  /** Trust strip rendered after the prose body, if any. */
  trustStrip?: OvellumLandingTrustStrip;
}

export interface OvellumSiteConfig {
  /** Site title. Defaults to `OvellumConfig.name` or `'Ovellum site'`. */
  title?: string;
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
  /** Build-time search indexing via Pagefind. Disabled by default. */
  search: OvellumSiteSearchConfig;
  /** Per-page meta line (reading time + last-modified) above the article. */
  pageMeta: OvellumSitePageMetaConfig;
  /**
   * Right-aligned topbar nav items, rendered to the right of the brand on
   * every page (including the landing). Empty by default. Order is preserved.
   */
  topbarNav: OvellumTopbarNavItem[];
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
    footer: 'Built with Ovellum',
    search: { enabled: false },
    pageMeta: { readingTime: true, lastModified: true },
    topbarNav: [],
    landing: {
      enabled: false,
      hero: { ctas: [] },
      features: [],
    },
  },
};

/** Frontmatter override block: `ovellum: { mode: 'manual' }`. */
export interface OvellumFrontmatterOverride {
  mode?: OvellumMode;
  defaultFormat?: OvellumFormat;
}
