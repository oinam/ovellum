---
title: Configuration reference
description: Every field in `ovellum.config.{json,ts,js}` with its type, default, and effect.
---

# Configuration reference

Every field that lives in `ovellum.config.*`. Authoritative; updated
alongside any schema change.

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
  description?: string;
  baseUrl?: string;
  basePath?: string;
  defaultTheme: 'auto' | 'light' | 'dark';
  codeTheme: 'github' | 'nord' | 'solarized';
  footer: string;
  editUrlPattern?: string;
  search: { enabled: boolean };
  pageMeta: { readingTime: boolean; lastModified: boolean };
  topbarNav: Array<{ label: string; href: string; icon?: string; external?: boolean }>;
  landing: OvellumLandingConfig;
}
```

| Field            | Type                                | Default                       | Notes                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | `string?`                           | `name` ↦ `'Ovellum site'`     | Used in the topbar and `<title>`.                                                                                                                                                                                              |
| `description`    | `string?`                           | `undefined`                   | Used in `<meta>` and the footer.                                                                                                                                                                                               |
| `baseUrl`        | `string?`                           | `undefined`                   | E.g. `'https://docs.example.com'`. Used for `<link rel="canonical">`, OG cards, and the `sitemap.xml`. Omit for relative-link output.                                                                                          |
| `basePath`       | `string?`                           | `''`                          | Jekyll-style subpath. Leading slash, no trailing slash (e.g. `'/ovellum'`). Prepended to every internal URL, asset path, canonical link, and sitemap entry. Authors keep writing root-relative links; the build adds the prefix. |
| `defaultTheme`   | `'auto' \| 'light' \| 'dark'`       | `'auto'`                      | Initial theme before user preference loads.                                                                                                                                                                                    |
| `codeTheme`      | `'github' \| 'nord' \| 'solarized'` | `'github'`                    | Shiki theme pair for fenced code blocks. Both halves of the pair are emitted via CSS variables so a single build serves both light and dark. `github` → github-light + github-dark; `nord` → min-light + nord (nord ships dark-only); `solarized` → solarized-light + solarized-dark. |
| `footer`         | `string`                            | `'Built with Ovellum'`        | Empty string disables the footer entirely.                                                                                                                                                                                     |
| `editUrlPattern` | `string?`                           | `undefined`                   | URL pattern with a `{path}` placeholder. `{path}` is the page's source path **relative to the build cwd** (`--cwd`). Include any repo prefix yourself, e.g. `'https://github.com/owner/repo/edit/main/website/{path}'`. When unset, the "Edit this page" link is not rendered. |
| `search`         | `{ enabled: boolean }`              | `{ enabled: false }`          | When `true`, `ovellum build` runs Pagefind against the output dir and the topbar gains a search box. Adds `dist/pagefind/` to the build.                                                                                       |
| `pageMeta`       | `{ readingTime, lastModified }`     | both `true`                   | Per-page meta line above the article: `N min read · Updated YYYY-MM-DD`. `readingTime` estimates at ~200 wpm after stripping code/HTML. `lastModified` prefers `git log -1 --format=%cI` then falls back to filesystem mtime; the line is omitted if neither resolves. Set either to `false` to hide that half. |
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
| `trustStrip` | `OvellumLandingTrustStrip?` | omitted            | Rendered last when present and `items` is non-empty.                                              |

### `hero.ctas[]`

| Field   | Type                        | Notes                                                |
| ------- | --------------------------- | ---------------------------------------------------- |
| `label` | `string`                    | Button text.                                         |
| `href`  | `string`                    | Internal path (`/getting-started/`) or absolute URL. |
| `style` | `'primary' \| 'secondary'?` | Visual treatment.                                    |

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
  `features[].title`, etc.).

The validator does **not** check filesystem existence of paths; that
surfaces later in the build if it matters.
