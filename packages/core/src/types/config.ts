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
  /** Initial theme before user preference loads. */
  defaultTheme: OvellumDefaultTheme;
  /** Footer text. Empty string disables the footer entirely. */
  footer: string;
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
