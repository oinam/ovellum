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
  },
};

/** Frontmatter override block: `ovellum: { mode: 'manual' }`. */
export interface OvellumFrontmatterOverride {
  mode?: OvellumMode;
  defaultFormat?: OvellumFormat;
}
