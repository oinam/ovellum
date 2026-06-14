---
title: Configuration
description: Every field in `ovellum.config.{json,ts,js}` with its type, default, and effect.
---

# Configuration

Every field that lives in `ovellum.config.*`. Authoritative; updated
alongside any schema change.

> **Tip:** `ovellum init` writes a fully-commented `ovellum.config.ts` with
> every option present — active ones set, the rest commented with their
> defaults and allowed values. You can tinker entirely in that file; this page
> is the deeper reference.

## File format

Place an `ovellum.config.{ts,mts,cts,js,mjs,cjs,json}` at the project
root. Discovery is via [`c12`](https://github.com/unjs/c12); all the
listed extensions work.

**TypeScript (recommended):**

```typescript
import { defineConfig } from 'ovellum';

export default defineConfig({
  mode: 'hybrid',
  input: './src',
  output: './docs',
});
```

**JSON:**

```json
{
  "mode": "hybrid",
  "input": "./src",
  "output": "./docs"
}
```

All fields are optional; sensible defaults apply.

## Top-level fields

| Field             | Type                             | Default                                                               | Notes                                                      |
| ----------------- | -------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `name`            | `string`                         | `package.json#name`                                                   |                                                            |
| `version`         | `string \| 'auto'`               | `'auto'`                                                              | `'auto'` reads `package.json#version`.                     |
| `mode`            | `'hybrid' \| 'manual' \| 'auto'` | `'hybrid'`                                                            | See [Concepts → Modes](/docs/concepts/modes/).                  |
| `input`           | `string`                         | `'./src'`                                                             | TS source dir in auto/hybrid; `.md` content dir in manual. |
| `output`          | `string`                         | `'./docs'`                                                            | Markdown dir in auto/hybrid; HTML dir in manual.           |
| `include`         | `string[]`                       | `['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']`                      | Globs relative to `input`.                                 |
| `exclude`         | `string[]`                       | `['node_modules', 'dist', '**/*.test.*', '**/*.spec.*', '**/*.d.ts']` | Globs relative to `input`.                                 |
| `includeInternal` | `boolean`                        | `false`                                                               | Include `@internal`-tagged symbols.                        |
| `includePrivate`  | `boolean`                        | `false`                                                               | Include `private` class members.                           |
| `defaultFormat`   | `'md' \| 'mdx'`                  | `'md'`                                                                | `manual` mode requires `'md'` in v1.                       |
| `protect`         | `ProtectConfig`                  | see below                                                             |                                                            |
| `site`            | `OvellumSiteConfig`              | see below                                                             |                                                            |
| `update`          | `OvellumUpdateConfig`            | see below                                                             | CLI update-check behaviour.                                |

## `protect` (hybrid mode + merger)

Used in hybrid mode to govern the merge engine and orphan handling.

```typescript
interface ProtectConfig {
  blockTag: string;
  inlineTag: string;
  orphanStrategy: 'quarantine' | 'warn';
  orphanDir: string;
  orphanRetention: number;
}
```

| Field             | Type                     | Default              | Notes                                                                                                      |
| ----------------- | ------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `blockTag`        | `string`                 | `'@manual'`          | The Markdown comment tag, used as `<!-- {blockTag}:start id="…" -->`. Customise only with a strong reason. |
| `inlineTag`       | `string`                 | `'@preserve'`        | JSDoc tag that marks a doc comment as human-managed.                                                       |
| `orphanStrategy`  | `'quarantine' \| 'warn'` | `'quarantine'`       | `'quarantine'` writes to `orphanDir`; `'warn'` prints only.                                                |
| `orphanDir`       | `string`                 | `'.ovellum/orphans'` | Relative to project root. Should be committed to VCS.                                                      |
| `orphanRetention` | `number`                 | `90`                 | Days before an orphan is flagged stale by a future `ovellum orphans --stale`.                              |

## `site` (manual mode)

Settings consumed by the static-site builder.

```typescript
interface OvellumSiteConfig {
  title?: string;
  logo?: string;
  favicon?: string;
  home?: string;
  description?: string;
  baseUrl?: string;
  basePath?: string;
  defaultTheme: 'auto' | 'light' | 'dark';
  palette: 'default' | 'nord' | 'flexoki' | 'solarized' | 'eink';
  accent?: string;
  font: 'sans' | 'serif' | 'inter' | 'geist';
  codeTheme: 'github' | 'nord' | 'solarized';
  footer: string;
  credit: boolean;
  editUrlPattern?: string;
  headExtra?: string;
  search: { enabled: boolean };
  pageMeta: { readingTime: boolean; lastModified: boolean };
  sidebar: { collapse: boolean };
  backToTop: { enabled: boolean; threshold: number };
  publicDir: string;
  ignoreFolders: string[];
  ignoreFiles: string[];
  topbarNav: Array<{ label: string; href: string; icon?: string; external?: boolean }>;
  footerNav: Array<{ label: string; href: string; icon?: string; external?: boolean }>;
  landing: OvellumLandingConfig;
}
```

| Field            | Type                                | Default                       | Notes                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | `string?`                           | `name` ↦ `'Ovellum site'`     | Used in the topbar and `<title>`.                                                                                                                                                                                              |
| `logo`           | `string?`                           | `undefined`                   | Optional brand mark shown before the title — a path/URL to an image. Drop it in `public/` and reference it at the root, e.g. `'/logo.svg'`. Renders as a **monochrome silhouette that flips with the theme** (drawn in the foreground colour via a CSS mask), so provide a single-colour SVG/PNG. **Unset = no mark; the title text stands alone.** Decorative — the title carries the accessible name. (Must not contain quotes, parentheses, or whitespace, since it goes into a CSS `url()`.) |
| `favicon`        | `string?`                           | `'/favicon.ico'`              | Path/URL to the favicon. Defaults to `/favicon.ico` — drop a `favicon.ico` in your `public/` folder and it's served at the root, so it just works. Set this to point elsewhere (e.g. `'/icon.svg'`). basePath-aware. |
| `home`           | `string?`                           | auto                          | Which Markdown file renders at `/`. A root-level path relative to `input` (e.g. `'overview.md'`). **When unset, the home auto-resolves: `index.md`, else a root `README.md`** — so a repo's README becomes the docs home with no config. Don't want that? Add `README.md` to `ignoreFiles`, or set `home`. |
| `description`    | `string?`                           | `undefined`                   | Used in `<meta>` and the footer.                                                                                                                                                                                               |
| `baseUrl`        | `string?`                           | `undefined`                   | E.g. `'https://docs.example.com'`. Used for `<link rel="canonical">`, OG cards, and the `sitemap.xml`. Omit for relative-link output.                                                                                          |
| `basePath`       | `string?`                           | `''`                          | Jekyll-style subpath. Leading slash, no trailing slash (e.g. `'/ovellum'`). Prepended to every internal URL, asset path, canonical link, and sitemap entry. Authors keep writing root-relative links; the build adds the prefix. |
| `defaultTheme`   | `'auto' \| 'light' \| 'dark'`       | `'auto'`                      | Initial light/dark mode before user preference loads. Visitors can change it from the topbar appearance control (persisted in `localStorage`).                                                                                  |
| `palette`        | `'default' \| 'nord' \| 'flexoki' \| 'solarized' \| 'eink'` | `'default'`  | Initial page-wide colour palette before user preference loads (`'default'` displays as "Ovellum" in the picker). Every palette ships light **and** dark variants; the mode choice stays independent. Visitors can switch palettes from the topbar appearance control.            |
| `accent`         | `string?`                           | `undefined`                   | Default primary colour — any CSS colour value (`'#3b82f6'`, `'oklch(57% 0.16 255)'`, …). Drives the CTA buttons plus links, focus rings, and the ToC indicator; hover states are mixed automatically. Unset = each palette's own primary. Visitors can override it from the appearance control ("Color"). |
| `font`           | `'sans' \| 'serif' \| 'inter' \| 'geist'` | `'sans'`                | Initial body font, and the default for the in-page **Font** picker. `'sans'` / `'serif'` are system-font stacks (no webfont — instant first paint). `'inter'` / `'geist'` are webfonts **bundled with the template** (served from `/assets/fonts/`) that load only when a page actually uses them. Code always stays monospace. Visitors can change the font live from the appearance control; they can also bump the reading **Text size** (a five-step scale). Both persist in `localStorage`. |
| `codeTheme`      | `'github' \| 'nord' \| 'solarized'` | `'github'`                    | Shiki theme pair for fenced code blocks. Both halves of the pair are emitted via CSS variables so a single build serves both light and dark. `github` → github-light + github-dark; `nord` → min-light + nord (nord ships dark-only); `solarized` → solarized-light + solarized-dark. |
| `footer`         | `string`                            | `''`                          | Footer text, e.g. a copyright line (rendered with the build date). Empty string shows no footer text. |
| `credit`         | `boolean`                           | `true`                        | Show a small "Built with Ovellum" credit link in the footer (→ <https://ovellum.oss.oinam.com>). Set `false` to remove it — crediting is appreciated but never required. |
| `editUrlPattern` | `string?`                           | `undefined`                   | URL pattern with a `{path}` placeholder. `{path}` is the page's source path **relative to the build cwd** (`--cwd`). Include any repo prefix yourself, e.g. `'https://github.com/owner/repo/edit/main/website/{path}'`. When unset, the "Edit this page" link is not rendered. |
| `headExtra`      | `string?`                           | `undefined`                   | Raw HTML injected verbatim into `<head>` on every page, just after the search bits and before the inline theme-boot script. **Not escaped or sanitised** — only set markup you control. Unset by default. Primary use: analytics snippets, e.g. `'<script defer src="https://analytics.example.com/script.js" data-website-id="…"></script>'`. |
| `search`         | `{ enabled: boolean }`              | `{ enabled: false }`          | When `true`, `ovellum build` runs Pagefind against the output dir and the topbar gains a search box. Adds `dist/pagefind/` to the build.                                                                                       |
| `pageMeta`       | `{ readingTime, lastModified }`     | both `true`                   | Per-page meta line above the article: `N min read · Updated YYYY-MM-DD`. `readingTime` estimates at ~200 wpm after stripping code/HTML. `lastModified` prefers `git log -1 --format=%cI` then falls back to filesystem mtime; the line is omitted if neither resolves. Set either to `false` to hide that half. |
| `sidebar`        | `{ collapse: boolean }`             | `{ collapse: true }`          | Sidebar folder behaviour. `collapse: true` (default) renders each folder as a collapsible disclosure, closed by default — the branch containing the current page always stays open, so you can see where you are. Set `collapse: false` to render the whole tree auto-expanded. A folder's `_meta.json` may override this per-folder with `"collapse": false` (always open) or `"collapse": true` (always closed). |
| `backToTop`      | `{ enabled, threshold }`            | `{ enabled: true, threshold: 360 }` | Floating "back to top" button. `enabled: false` removes it. `threshold` is the scroll distance (px) before it fades in — lower it for short-page sites so it appears sooner, raise it to hide it until further down. |
| `assetBaseUrl`   | `string?`                           | `undefined`                   | CDN/base URL for `publicDir` assets (e.g. `'https://cdn.example.com/site'`). **When set**, Ovellum stops copying `publicDir` locally (you host its contents on the CDN) and rewrites references to those files in the rendered HTML to the CDN: `/img/logo.svg` → `https://cdn.example.com/site/img/logo.svg`. You author the same root-absolute paths regardless. Like Vite's `base` / Next's `assetPrefix`. Assets *outside* `publicDir` are untouched. (Query-stringed and `srcset` refs aren't rewritten.) |
| `publicDir`      | `string`                            | `'public'`                    | **Reserved** static-assets folder (a single name at the `input` root). Its contents are copied **verbatim to the output root** — `public/favicon.ico` → `/favicon.ico`, `public/img/logo.svg` → `/img/logo.svg` — the SSG convention (Next/Astro/Vite/VitePress/Hugo). Use it for root-served files (favicon, `robots.txt`, `CNAME`, OG images) and any other static assets. Nothing inside is processed (no pages, no sidebar; even a `.md` is copied as-is). The first of Ovellum's reserved folder names; static files *outside* it still pass through keeping their path. |
| `ignoreFolders`  | `string[]`                          | `[]`                          | Folder **names** (matched at any depth) to exclude entirely from the manual-mode site — not in the sidebar, not rendered, not copied to the output. Use for WIP/private dirs. A folder can also self-hide via `_meta.json` `"hidden": true`, and a single page via frontmatter `draft: true`. (Asset-only folders like `public/` are already kept out of the sidebar automatically.) |
| `ignoreFiles`    | `string[]`                          | `[]`                          | File **globs** to exclude — both Markdown pages and passthrough assets, honoured by `build` **and** `check`. No-slash patterns match the basename at any depth (`README.md`, `*.draft.md`); slashed patterns match the path relative to `input` (`drafts/**`). Supports `*`, `**`, `?`. Use it to drop a single file (e.g. a repo `README.md`) without touching it. **Always auto-excluded** (no config needed): dotfiles, `node_modules`, package manifests/lockfiles, the Ovellum config, and the output dir itself — so `input: "."` doesn't leak project files. |
| `topbarNav`      | `Array<{label, href, icon?, external?}>` | `[]`                     | Items render in order to the right of the search box. Items with an `icon` render icon-only on desktop (label kept for screen readers) and icon + label inside the mobile sheet. External links (`external: true` or `href` starting with `http(s)://`) open in a new tab with `rel="noopener"`; text items also get a small external-link icon. Below 720px the top row is just logo + version + search + hamburger — the nav and theme toggle move into the sheet. |
| `landing`        | `OvellumLandingConfig`              | `{ enabled: false, … }`       | See below.                                                                                                                                                                                                                     |

### `topbarNav[]`

| Field      | Type      | Notes                                                                                                                            |
| ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `label`    | `string`  | Visible link text. Kept for screen readers even when `icon` is set.                                                              |
| `href`     | `string`  | Internal path (`/guides/themes/`) or absolute URL.                                                                               |
| `icon`     | `string?` | Registry icon name (`github`, `package`, `rss`, `mail`, …). Renders icon-only on desktop; icon + label in the mobile sheet.      |
| `external` | `boolean?`| Force the external treatment (new tab + `rel="noopener"`). Auto-true when `href` starts with `http://` or `https://`.           |

### `search`

`{ enabled: boolean }`. When `true`, the build:

1. Runs [Pagefind](https://pagefind.app/) against the output directory to
   produce a static search index under `dist/pagefind/`.
2. Adds the Pagefind UI to the topbar, themed via Ovellum's design tokens
   so it inherits your accent / fg / bg colors automatically.

There is no runtime indexer — search results come from the static index
shipped with the site, so it works on any static host with no server.

### `pageMeta`

`{ readingTime: boolean, lastModified: boolean }`. Both default `true`.

- **`readingTime`** — counts visible-prose words (code blocks, inline
  code, link URLs, HTML, and heading punctuation stripped) and divides
  by ~200 wpm, rounded up. Always at least `1 min read`.
- **`lastModified`** — first tries
  `git log -1 --format=%cI -- <path>` for the file. Falls back to the
  filesystem mtime if the file isn't tracked or git is unavailable.
  Omitted if neither resolves.

Set either to `false` to hide that half of the line. Set both to `false`
to hide the meta line entirely.

## `site.landing`

Opt-in landing page rendered at `/` instead of the regular doc index.
Disabled by default. When enabled, `content/index.md` is skipped with a
warning (the landing replaces it).

```typescript
interface OvellumLandingConfig {
  enabled: boolean;
  docsHref?: string;
  hero: {
    title?: string;
    subtitle?: string;
    ctas: Array<{ label: string; href: string; style?: 'primary' | 'secondary' }>;
  };
  features: Array<{ icon?: string; title: string; description: string }>;
  install?: Array<{ title: string; code: string; lang?: string }>;
  trustStrip?: {
    label?: string;
    items: Array<{ name: string; href?: string; image?: string }>;
  };
}
```

| Field        | Type                        | Default            | Notes                                                                                             |
| ------------ | --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| `enabled`    | `boolean`                   | `false`            | When `false`, `/` behaves as before (the regular doc index).                                      |
| `docsHref`   | `string?`                   | first sidebar page | Where the top-bar **Docs** link points.                                                           |
| `hero`       | `OvellumLandingHero`        | `{ ctas: [] }`     | Title falls back to `site.title`. First CTA defaults to `primary` style, the rest to `secondary`. |
| `features`   | `OvellumLandingFeature[]`   | `[]`               | Feature cards in document order; replaced wholesale on merge.                                     |
| `install`    | `OvellumLandingInstall[]?`  | omitted            | Install snippets rendered after the hero CTAs and before the feature grid; the title becomes a leading comment inside each code block. Install snippets render without a language label and get an icon copy button vertically centered on the right edge; doc code blocks elsewhere are unaffected (they keep their language eyebrow + text copy button). |
| `trustStrip` | `OvellumLandingTrustStrip?` | omitted            | Rendered last when present and `items` is non-empty.                                              |

### `hero.ctas[]`

| Field   | Type                        | Notes                                                |
| ------- | --------------------------- | ---------------------------------------------------- |
| `label` | `string`                    | Button text.                                         |
| `href`  | `string`                    | Internal path (`/getting-started/`) or absolute URL. |
| `style` | `'primary' \| 'secondary'?` | Visual treatment.                                    |

### `install[]`

Command snippets rendered immediately after the hero CTAs and before the
feature grid. Each snippet's `code` runs through the same Markdown/shiki
pipeline as doc code blocks, so it gets syntax highlighting and a top-right
icon copy button, vertically centered on the right edge. Install snippets
render without a language label; doc code blocks elsewhere keep their language
eyebrow and text copy button.

The `title` is folded into the code block as a leading comment line (e.g.
`# Install Ovellum globally` for shell langs, `// …` for JS/TS-family
langs) rather than rendered as a heading above the block. The comment prefix
is chosen from `lang`. The copy button copies only the command (`code`),
never the folded-in title comment.

| Field   | Type      | Notes                                                                                  |
| ------- | --------- | -------------------------------------------------------------------------------------- |
| `title` | `string`  | Shown as a leading comment inside the code block, e.g. `"Install Ovellum globally"`.   |
| `code`  | `string`  | The command(s) shown in the code block.                                                |
| `lang`  | `string?` | Highlight language passed to shiki; also picks the comment prefix. Defaults to `bash`. |

### `features[]`

| Field         | Type      | Notes                                                                           |
| ------------- | --------- | ------------------------------------------------------------------------------- |
| `icon`        | `string?` | Optional monochrome inline SVG or short text. Rendered as-is. Omit for no icon. |
| `title`       | `string`  | Card title.                                                                     |
| `description` | `string`  | Card body. One short sentence works best.                                       |

### `trustStrip`

| Field   | Type                        | Notes                                                        |
| ------- | --------------------------- | ------------------------------------------------------------ |
| `label` | `string?`                   | Optional section label, e.g. `"Trusted by"`, `"Powered by"`. |
| `items` | `OvellumLandingTrustItem[]` | Rendered in order; replaced wholesale on merge.              |

### `trustStrip.items[]`

| Field   | Type      | Notes                                                                                                        |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `name`  | `string`  | Display name (used as both visible text and the `alt` if `image` is set).                                    |
| `href`  | `string?` | If set, the item becomes a link.                                                                             |
| `image` | `string?` | Path relative to `input/`. The file should be a static asset (`.svg`, `.png`) that the build passes through. |

### Optional `content/_landing.md`

When `site.landing.enabled` is `true`, the build looks for
`{input}/_landing.md`. If present, its body renders between the feature
grid and the trust strip as the "Why" section. The underscore prefix
keeps it out of the regular page walk, so it doesn't appear in the
sidebar or as a standalone URL.

## `update`

Controls the CLI's update check — the one-line "update available" notice
printed after a command finishes. It's a courtesy only: nothing is
installed without [`ovellum upgrade`](/docs/reference/cli/#ovellum-upgrade).

```typescript
interface OvellumUpdateConfig {
  check: boolean;
  intervalHours: number;
}
```

| Field           | Type      | Default | Notes                                                                                          |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `check`         | `boolean` | `true`  | Look up the latest published version on npm and print a notice when the running CLI is behind. |
| `intervalHours` | `number`  | `24`    | Minimum hours between checks; the result is cached, so most runs do no network I/O.            |

The check is **additionally suppressed** — regardless of `check` — in CI,
in non-interactive shells, when the `NO_UPDATE_NOTIFIER` environment
variable is set, and when `--no-update-check` is passed. It never delays or
fails a command; every error path (offline, timeout, bad response) is
swallowed silently.

## Per-file overrides <a id="per-file-overrides"></a>

Front-matter inside any `.md` / `.mdx` file may override the mode for
that file:

```yaml
---
ovellum:
  mode: manual
---
```

Recognised keys inside the `ovellum:` block:

| Key             | Type                             | Notes                                |
| --------------- | -------------------------------- | ------------------------------------ |
| `mode`          | `'hybrid' \| 'manual' \| 'auto'` | Same values as the top-level `mode`. |
| `defaultFormat` | `'md' \| 'mdx'`                  |                                      |

The bare `ovellum: true` marker that the generator writes onto every
auto-generated file is **not** a mode override. The parser distinguishes
`ovellum: true` (marker) from `ovellum: { … }` (override block).

## Per-page frontmatter (manual mode)

**Frontmatter is optional.** A `.md` file with no YAML preamble at the
top builds fine. Ovellum infers what it needs from the body and the
filename:

| Resolved field             | Frontmatter key | Fallback 1                  | Fallback 2                    | Fallback 3 |
| -------------------------- | --------------- | --------------------------- | ----------------------------- | ---------- |
| Sidebar label              | `title:`        | First `# H1` in the body    | Title-cased filename          | `Untitled` |
| Page `<title>`             | `title:`        | First heading in the body   | `site.title`                  | —          |
| `<meta name="description">`| `description:`  | — (omitted if absent)       | —                             | —          |

So in practice:

- **Skip `title:`** if your file starts with a clean `# Heading` — the
  sidebar and `<title>` will both use that H1. Add `title:` only when
  you want the sidebar label to differ from the page heading
  (e.g. short sidebar label, longer page heading).
- **Add `description:`** for any page you expect to be linked from
  social cards or search results, since there's no inferred fallback —
  the meta tag is omitted when this field is absent.

Recognised keys inside the frontmatter of any `.md` page (orthogonal
to the `ovellum:` override above):

| Key           | Type     | Effect                                                      |
| ------------- | -------- | ----------------------------------------------------------- |
| `title`       | `string` | Sets the sidebar label, `<title>`, and page heading source. |
| `description` | `string` | Sets `<meta name="description">`.                           |

## `_meta.json` (per-directory, manual mode)

Place inside any subdirectory of `input/` to control sidebar grouping:

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

| Field   | Type        | Effect                                                                                                                                          |
| ------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | `string?`   | Display title for the directory group. Falls back to the directory's `index.md` H1, then the directory name.                                    |
| `order` | `string[]?` | Slugs (file basenames or sub-directory names) in the order they should appear. Anything not listed sorts alphabetically after the explicit set. |

## Validation

Every load passes through `validateUserConfig()`. Invalid fields throw a
`ConfigError` with a path-qualified message naming the bad field, and the
CLI exits with code **3**.

Validated:

- Types of every field.
- Enums (`mode`, `defaultFormat`, `orphanStrategy`, `site.defaultTheme`,
  `site.landing.hero.ctas[].style`).
- Arrays-of-strings for `include` / `exclude`.
- `protect.orphanRetention >= 0` and finite.
- Required fields on landing-page sub-objects (`hero.ctas[].label`,
  `features[].title`, `install[].title`, `install[].code`, etc.).

The validator does **not** check filesystem existence of paths; that
surfaces later in the build if it matters.
