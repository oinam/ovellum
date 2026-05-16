# Ovellum - Configuration Reference

Every field that lives in `ovellum.config.{json,ts,js}`. Authoritative because
this matches `packages/core/src/types/config.ts`; updated in the same commit
as any schema change.

For the original design intent see [`DESIGN.md` §7](./DESIGN.md#7-config-schema).
For terms ("anchor", "protected zone", "orphan") see [`GLOSSARY.md`](./GLOSSARY.md).
For what each field actually enables see [`FEATURES.md`](./FEATURES.md).

Last updated: 2026-05-16

---

## File location & format

Place an `ovellum.config.{ts,mts,cts,js,mjs,cjs,json}` at the project root.
Discovery is via [`c12`](https://github.com/unjs/c12), so all listed extensions
work. Subdirectory configs override the root (deepest wins; see §6).

**TypeScript form (recommended):**

```typescript
import { defineConfig } from 'ovellum';

export default defineConfig({
  mode: 'hybrid',
  input: './src',
  output: './docs',
});
```

**JSON form:**

```json
{
  "mode": "hybrid",
  "input": "./src",
  "output": "./docs"
}
```

All fields are optional; defaults are listed below.

---

## 1. Top-level fields

| Field             | Type                             | Default                                                               | Used by                             | Notes                                                      |
| ----------------- | -------------------------------- | --------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `name`            | `string`                         | `package.json#name`                                                   | parser, site title fallback         |                                                            |
| `version`         | `string \| 'auto'`               | `'auto'`                                                              | parser (IR), generator frontmatter  | `'auto'` reads `package.json#version`.                     |
| `mode`            | `'hybrid' \| 'manual' \| 'auto'` | `'hybrid'`                                                            | CLI router                          | See [`FEATURES.md` §1](./FEATURES.md#1-modes).             |
| `input`           | `string`                         | `'./src'`                                                             | parser (auto/hybrid), site (manual) | TS source dir in auto/hybrid; `.md` content dir in manual. |
| `output`          | `string`                         | `'./docs'`                                                            | generator, site                     | Markdown dir in auto/hybrid; HTML dir in manual.           |
| `include`         | `string[]`                       | `['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']`                      | parser                              | Globs relative to `input`.                                 |
| `exclude`         | `string[]`                       | `['node_modules', 'dist', '**/*.test.*', '**/*.spec.*', '**/*.d.ts']` | parser                              | Globs relative to `input`.                                 |
| `includeInternal` | `boolean`                        | `false`                                                               | parser                              | Include `@internal`-tagged symbols.                        |
| `includePrivate`  | `boolean`                        | `false`                                                               | parser                              | Include `private` class members.                           |
| `defaultFormat`   | `'md' \| 'mdx'`                  | `'md'`                                                                | generator, site                     | `manual` mode requires `'md'` in v1.                       |
| `protect`         | `ProtectConfig`                  | see §2                                                                | merger, reader                      |                                                            |
| `site`            | `OvellumSiteConfig`              | see §3                                                                | site builder                        |                                                            |

---

## 2. `protect` block (hybrid mode + merger)

```typescript
interface ProtectConfig {
  blockTag: string;
  inlineTag: string;
  orphanStrategy: 'quarantine' | 'warn';
  orphanDir: string;
  orphanRetention: number;
}
```

| Field             | Type                     | Default              | Used by                      | Notes                                                                                                      |
| ----------------- | ------------------------ | -------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `blockTag`        | `string`                 | `'@manual'`          | reader                       | The Markdown comment tag, used as `<!-- {blockTag}:start id="…" -->`. Customise only with a strong reason. |
| `inlineTag`       | `string`                 | `'@preserve'`        | parser, generator (🚧)       | JSDoc tag that marks a doc comment as human-managed.                                                       |
| `orphanStrategy`  | `'quarantine' \| 'warn'` | `'quarantine'`       | merger                       | `'quarantine'` writes to `orphanDir`; `'warn'` prints only.                                                |
| `orphanDir`       | `string`                 | `'.ovellum/orphans'` | merger                       | Relative to project root. Should be committed to VCS.                                                      |
| `orphanRetention` | `number`                 | `90`                 | `ovellum orphans --stale` 🚧 | Days before an orphan is flagged stale.                                                                    |

---

## 3. `site` block (manual mode)

```typescript
interface OvellumSiteConfig {
  title?: string;
  description?: string;
  baseUrl?: string;
  defaultTheme: 'auto' | 'light' | 'dark';
  footer: string;
}
```

| Field          | Type                          | Default                   | Used by                                       | Notes                                                             |
| -------------- | ----------------------------- | ------------------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| `title`        | `string?`                     | `name` ↦ `'Ovellum site'` | template (top bar, `<title>`)                 |                                                                   |
| `description`  | `string?`                     | `undefined`               | template (`<meta>`, footer)                   |                                                                   |
| `baseUrl`      | `string?`                     | `undefined`               | template (`<link rel="canonical">`, OG cards) | E.g. `'https://docs.example.com'`. Omit for relative-link output. |
| `defaultTheme` | `'auto' \| 'light' \| 'dark'` | `'auto'`                  | template (initial `data-theme`)               | Overridden once the user toggles and we read `localStorage`.      |
| `footer`       | `string`                      | `'Built with Ovellum'`    | template (footer)                             | Empty string disables the footer entirely.                        |

---

## 4. Per-file overrides

Front-matter inside any `.md` / `.mdx` file may override the mode for that
file:

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

Note: the bare `ovellum: true` marker that the generator writes onto every
auto-generated file is **not** a mode override. The parser distinguishes
`ovellum: true` (marker) from `ovellum: { … }` (override block).

---

## 5. Frontmatter on `.md` content pages (manual mode)

Recognised inside the frontmatter of any page (orthogonal to the `ovellum:`
override above):

| Key           | Type       | Effect                                                                     |
| ------------- | ---------- | -------------------------------------------------------------------------- |
| `title`       | `string`   | Sets the sidebar label, `<title>`, and page heading source.                |
| `description` | `string`   | Sets `<meta name="description">`.                                          |
| `nav`         | (reserved) | Currently ignored; future use for per-page ordering / hidden-from-sidebar. |

Per-directory ordering uses `_meta.json` instead — see §6.

---

## 6. `_meta.json` (per-directory, manual mode)

Place inside any subdirectory of `input/` to control sidebar grouping:

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

| Field   | Type        | Effect                                                                                                                                                         |
| ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` | `string?`   | Display title for the directory group. Falls back to the directory's `index.md` H1, then the directory name.                                                   |
| `order` | `string[]?` | Slugs (file basenames or sub-directory names) in the order they should appear in the sidebar. Anything not listed sorts alphabetically after the explicit set. |

---

## 7. Subdirectory config overrides

`ovellum.config.*` may appear in any subdirectory. `loadDirectoryOverride()`
walks from the project root down to a target directory and merges every config
it finds. Deeper wins on conflicts; arrays are replaced wholesale; `protect`
and `site` are merged field-by-field.

> Currently surfaced via the API but not yet wired into the CLI build flow.
> Tracked under [`TODO.md`](./TODO.md) Phase 2 / 6.

---

## 8. Validation

Every load passes through `validateUserConfig()` and throws a `ConfigError`
on the first invalid field. CLI exit code on failure: **3**.

Validated:

- types of every documented field
- enums (`mode`, `defaultFormat`, `orphanStrategy`, `site.defaultTheme`)
- arrays-of-strings for `include` / `exclude`
- `protect.orphanRetention >= 0` and finite
- `site.*` field types

The error message names the field path (e.g. `` `site.defaultTheme` must be one of: auto, light, dark. ``) and where useful a `hint:` suggestion. The validator does **not** check filesystem existence of paths; that surfaces later in the pipeline if relevant.
