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
 * Body font family for the whole site (docs + landing). `'sans'` uses the
 * system sans-serif stack (default); `'serif'` switches body, headings, and
 * prose to the system serif stack. Code always stays monospace. Both are
 * system-font stacks — no webfonts. Custom font families are a planned future
 * extension (see `docs/internal/TODO.md`).
 */
export type OvellumFont = 'sans' | 'serif';

/**
 * Named colour palette for the whole site (page chrome, surfaces, text —
 * not just code blocks). Every palette ships a light and a dark variant;
 * the light/dark/auto mode choice stays independent (`defaultTheme`).
 * Visitors can switch palettes at runtime from the topbar appearance
 * control; this value is the server-rendered starting point.
 */
export type OvellumPalette = 'default' | 'nord' | 'flexoki' | 'solarized' | 'eink';

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

export interface OvellumLandingInstall {
  /** Heading above the snippet, e.g. "Install Ovellum globally". */
  title: string;
  /** The command(s) to show in the code block. */
  code: string;
  /** Highlight language (shiki). Defaults to 'bash'. */
  lang?: string;
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

export interface OvellumBackToTopConfig {
  /** Show the floating "back to top" button. Default `true`. */
  enabled: boolean;
  /**
   * Scroll distance (px) before the button fades in. Default `360`. Lower it
   * for short-page sites so the button shows sooner; raise it to hide it until
   * the visitor is well down the page.
   */
  threshold: number;
}

export interface OvellumSidebarConfig {
  /**
   * Collapse sidebar folders by default (each is a disclosure the visitor can
   * expand). The folder branch containing the current page always stays open,
   * so you can see where you are. **Default `true`.** Set `false` to render the
   * whole tree auto-expanded.
   */
  collapse: boolean;
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
  /** Titled install snippets rendered after the hero CTAs. Each gets a copy button. */
  install?: OvellumLandingInstall[];
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
   * Optional brand logo shown before the title in the top bar — a path or URL
   * to an image (e.g. `'/public/logo.svg'`). It renders as a **monochrome mark
   * that adapts to the active theme** (drawn in the foreground colour via a CSS
   * mask), matching the editorial design; provide a single-colour silhouette
   * SVG/PNG. **Unset = no mark; the title text stands alone** — the logo is never
   * mandatory. The title always carries the accessible brand name, so the mark
   * is decorative.
   */
  logo?: string;
  /**
   * Path or URL to the site favicon. **Defaults to `'/favicon.ico'`** — drop a
   * `favicon.ico` at your project root (it passes through to the output root)
   * and it just works. Set this to point elsewhere (e.g. `'/public/icon.svg'`).
   */
  favicon?: string;
  /**
   * Which Markdown file is the site home (rendered at `/`). A root-level path
   * relative to `input` (e.g. `'overview.md'`). When unset, the home resolves
   * automatically: `index.md`, else a root **`README.md`** — so a repo's
   * README becomes the docs home with no config. Don't want that? Add `README.md`
   * to `ignoreFiles`, or point `home` elsewhere. Honoured by `build` and the nav.
   */
  home?: string;
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
  /**
   * Initial colour palette before user preference loads. Defaults to
   * `'default'` (the monochrome editorial theme). Visitors can override it
   * from the topbar appearance control (persisted in `localStorage`).
   */
  palette: OvellumPalette;
  /**
   * Default accent colour — any CSS colour value (`'#3b82f6'`,
   * `'oklch(57% 0.16 255)'`, …). Links, focus rings, and the ToC strip
   * derive from it; hover states are mixed from it automatically. Unset =
   * each palette's own accent. Visitors can override it from the topbar
   * appearance control.
   */
  accent?: string;
  /** Body font family for the whole site. Defaults to `'sans'`. */
  font: OvellumFont;
  /** Footer text (e.g. a copyright line). Empty string shows no footer text. */
  footer: string;
  /**
   * Show a small "Built with Ovellum" credit link in the footer (to
   * <https://ovellum.oss.oinam.com>). **Defaults to `true`.** Set `false` to
   * remove it entirely — crediting Ovellum is appreciated but never required.
   */
  credit: boolean;
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
  /** Sidebar folder behaviour (collapsed by default; the active branch stays open). */
  sidebar: OvellumSidebarConfig;
  /** Floating "back to top" button (shown after scrolling past `threshold`). */
  backToTop: OvellumBackToTopConfig;
  /**
   * Folder names to exclude entirely from the manual-mode site — matched by
   * name at any depth. Excluded folders are skipped in the sidebar nav, are not
   * rendered, and their files are not copied to the output. Empty by default.
   * (A folder can also opt out via `_meta.json` `"hidden": true`; a single page
   * via frontmatter `draft: true`.)
   */
  ignoreFolders: string[];
  /**
   * **Reserved** static-assets directory (relative to `input`). Its contents
   * are copied to the **output root** as-is — `public/favicon.ico` →
   * `/favicon.ico`, `public/img/logo.svg` → `/img/logo.svg` — and the folder is
   * never treated as content (no pages, no sidebar entry). **Defaults to
   * `'public'`.** It's the first of Ovellum's reserved folder names. (Static
   * files *outside* this folder still pass through, but keep their path.)
   */
  publicDir: string;
  /**
   * File globs to exclude from the manual-mode site — both Markdown pages and
   * passthrough assets, honoured by `build` **and** `check`. A pattern without
   * `/` matches the basename at any depth (`README.md`, `*.draft.md`); a
   * pattern with `/` matches the path relative to `input` (`drafts/**`).
   * Supports `*`, `**`, and `?`. Empty by default.
   *
   * Note: dotfiles (`.gitignore`), `node_modules`, package manifests/lockfiles,
   * and the Ovellum config file are **always** excluded automatically, so a
   * root `input: '.'` doesn't leak project files — you don't need to list them.
   */
  ignoreFiles: string[];
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
  /**
   * Raw HTML injected verbatim into `<head>` on every page, right before the
   * inline theme-boot script. Intended for analytics snippets and similar
   * third-party `<script>`/`<link>`/`<meta>` tags. The string is **not**
   * escaped or sanitised — only set it to markup you control. Unset = nothing
   * injected (the default for end-user docs).
   */
  headExtra?: string;
}

/**
 * Update-check behaviour for the `ovellum` CLI. This is a courtesy notice
 * only — the CLI never installs anything on its own; `ovellum upgrade` is the
 * explicit action. The check is additionally auto-disabled in CI, in
 * non-interactive shells, and when `NO_UPDATE_NOTIFIER` is set, regardless of
 * these values.
 */
export interface OvellumUpdateConfig {
  /** Look up the latest published version on npm and print a one-line notice
   *  when the running CLI is behind. */
  check: boolean;
  /** Minimum hours between background checks; the result is cached in between
   *  so most runs do no network I/O. */
  intervalHours: number;
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
  /** CLI update-check behaviour (notice only; never auto-installs). */
  update: OvellumUpdateConfig;
}

/** All fields optional — what users actually write in `ovellum.config.ts`. */
export type OvellumUserConfig = Partial<Omit<OvellumConfig, 'protect' | 'site' | 'update'>> & {
  protect?: Partial<ProtectConfig>;
  site?: Partial<OvellumSiteConfig>;
  update?: Partial<OvellumUpdateConfig>;
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
    palette: 'default',
    font: 'sans',
    codeTheme: 'github',
    footer: '',
    credit: true,
    search: { enabled: false },
    pageMeta: { readingTime: true, lastModified: true },
    sidebar: { collapse: true },
    backToTop: { enabled: true, threshold: 360 },
    publicDir: 'public',
    ignoreFolders: [],
    ignoreFiles: [],
    topbarNav: [],
    footerNav: [],
    landing: {
      enabled: false,
      hero: { ctas: [] },
      features: [],
      scenes: [],
    },
  },
  update: {
    check: true,
    intervalHours: 24,
  },
};

/** Frontmatter override block: `ovellum: { mode: 'manual' }`. */
export interface OvellumFrontmatterOverride {
  mode?: OvellumMode;
  defaultFormat?: OvellumFormat;
}
