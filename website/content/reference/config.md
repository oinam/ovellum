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
| `mode`            | `'hybrid' \| 'manual' \| 'auto'` | `'hybrid'`                                                            | See [Concepts → Modes](/concepts/modes/).                  |
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
  defaultTheme: 'auto' | 'light' | 'dark';
  footer: string;
  landing: OvellumLandingConfig;
}
```

| Field          | Type                          | Default                   | Notes                                                                                        |
| -------------- | ----------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `title`        | `string?`                     | `name` ↦ `'Ovellum site'` | Used in the topbar and `<title>`.                                                            |
| `description`  | `string?`                     | `undefined`               | Used in `<meta>` and the footer.                                                             |
| `baseUrl`      | `string?`                     | `undefined`               | E.g. `'https://docs.example.com'`. Used for canonical and OG. Omit for relative-link output. |
| `defaultTheme` | `'auto' \| 'light' \| 'dark'` | `'auto'`                  | Initial theme before user preference loads.                                                  |
| `footer`       | `string`                      | `'Built with Ovellum'`    | Empty string disables the footer entirely.                                                   |
| `landing`      | `OvellumLandingConfig`        | `{ enabled: false, … }`   | See below.                                                                                   |

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

Recognised inside the frontmatter of any `.md` page (orthogonal to the
`ovellum:` override above):

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
