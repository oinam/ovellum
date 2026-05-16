# Ovellum - Features (current state)

What works **right now**, at this commit. Updated in the same commit as any
change that adds or modifies a user-visible feature.

For the original design vision see [`DESIGN.md`](./DESIGN.md). For roadmap and
deferred items see [`TODO.md`](./TODO.md). For human-only tasks (writing prose,
product decisions, release) see [`TODO-Human.md`](./TODO-Human.md). For
terminology see [`GLOSSARY.md`](./GLOSSARY.md).

Last updated: 2026-05-16

Status legend:

- ✅ shipped and exercised end-to-end
- 🟡 partial — a v0 slice exists; named gaps live in `TODO.md`
- 🚧 designed but not yet built (tracked in `TODO.md`)

---

## 1. Modes

Ovellum runs in one of three modes, set via `mode:` in `ovellum.config.{json,ts,js}`.

| Mode     | Status | What it does                                                                                                                                         |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hybrid` | ✅     | Default. Auto-generates Markdown from TS/JS source, then merges existing `<!-- @manual:start -->` blocks back in. Orphans go to `.ovellum/orphans/`. |
| `manual` | ✅     | Pure static-site builder from `.md` files → HTML. No source parsing. See §4 ([`@ovellum/site`](#4-site-builder---ovellumsite)).                      |
| `auto`   | ✅     | Auto-generate Markdown only. Existing output is overwritten. No merge step.                                                                          |

---

## 2. Core (`@ovellum/core`)

Shared types, config schema, error class. Consumed by every other package.

| Feature                                                                | Status | Notes                                                                                          |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| IR types (`DocNode`, `DocFile`, `DocProject`, `DocParam`, `DocReturn`) | ✅     | Per [`DESIGN.md` §6](./DESIGN.md#6-intermediate-representation-ir)                             |
| `OvellumConfig` schema                                                 | ✅     | Full reference in [`CONFIG.md`](./CONFIG.md). Includes `site`, `protect`, format, mode, paths. |
| `defineConfig()` helper                                                | ✅     | Identity function for type-safe `ovellum.config.ts`.                                           |
| `loadOvellumConfig({ cwd, configFile })`                               | ✅     | Loads via `c12`; applies defaults; validates. Returns `{ config, configFile, cwd }`.           |
| `loadDirectoryOverride(rootCwd, targetDir, root)`                      | ✅     | Walks from root → target, merges every nested `ovellum.config.*` (deepest wins).               |
| `parseFrontmatterOverride(frontmatter)`                                | ✅     | Extracts `ovellum:` block from `.md` frontmatter for per-file mode overrides.                  |
| `mergeConfig(base, override)`                                          | ✅     | Shallow merge; arrays replaced wholesale; `protect` and `site` merged field-by-field.          |
| `validateUserConfig(input)`                                            | ✅     | Hand-rolled validator; throws `ConfigError` with `code` + `hint`.                              |
| `OvellumError` / `ConfigError`                                         | ✅     | Typed error base + config-specific subclass.                                                   |

**Tests:** 29 vitest cases — defaults, full config, every validation error, merge rules, frontmatter overrides, per-directory loading.

---

## 3. Pipeline (auto + hybrid modes)

### 3.1 Parser (`@ovellum/parser`)

| Symbol kind             | Status | Notes                                                                |
| ----------------------- | ------ | -------------------------------------------------------------------- |
| `function`              | ✅     | Generics + JSDoc + params + return type. Overloads 🚧.               |
| `class`                 | 🟡     | Methods + properties + extends + implements. Constructor section 🚧. |
| `interface`             | ✅     | Properties + methods + extends.                                      |
| `type` alias            | ✅     | Name + RHS + generics.                                               |
| `enum`                  | ✅     | Members with optional initializer values.                            |
| `const` / `let` / `var` | 🚧     | Deferred.                                                            |
| Module-level `@module`  | 🟡     | Only when attached to the first statement of the file.               |

| JSDoc tag                        | Status                                                   |
| -------------------------------- | -------------------------------------------------------- |
| `@param`, `@returns` / `@return` | ✅                                                       |
| `@throws` / `@exception`         | ✅                                                       |
| `@example`                       | ✅                                                       |
| `@deprecated`                    | ✅                                                       |
| `@since`, `@see`                 | ✅ extracted (`@see`/`@since` rendering 🚧 in generator) |
| `@remarks`, `@description`       | ✅                                                       |
| `@preserve` flag                 | ✅ (auto-wrapping in the generator 🚧)                   |
| `@internal` flag                 | ✅                                                       |
| Unknown tags                     | ✅ collected into `tags` bag                             |

| Edge case                      | Status |
| ------------------------------ | ------ |
| Re-exports / barrel files      | 🚧     |
| Circular imports               | 🚧     |
| Overloaded functions           | 🚧     |
| Namespace exports              | 🚧     |
| `declare module` augmentations | 🚧     |

Anchor IDs: ✅ `{relativeFilePath}::{symbolPath}` per [`DESIGN.md` §8.3](./DESIGN.md#83-anchor-ids-and-stability).

**Tests:** 6 vitest smoke tests across symbol types and filtering.

### 3.2 Generator (`@ovellum/generator`)

| Feature                                                                    | Status | Notes                                        |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------- |
| `generateDocs(project, config)` → `Map<outputPath, markdown>`              | ✅     |                                              |
| Output path mapping `src/foo.ts` → `docs/foo.md`                           | ✅     | `.mdx` extension wired but JSX detection 🚧. |
| Frontmatter (`title`, `source`, `generated`, `ovellum: true`)              | ✅     |                                              |
| Function template (signature + params table + returns + throws + examples) | ✅     |                                              |
| Class template (heritage + methods table + properties table)               | 🟡     | Constructor section 🚧.                      |
| Interface template (members table)                                         | ✅     |                                              |
| Type alias template                                                        | ✅     |                                              |
| Enum template (members with values)                                        | ✅     |                                              |
| Variable / const template                                                  | 🚧     |                                              |
| Anchor comments `<!-- ovellum:anchor id="…" generated="…" -->`             | ✅     | On every top-level + child node.             |
| `@deprecated` callout                                                      | 🟡     | Plain blockquote. Styled callout 🚧.         |
| `@since` / `@see` rendering                                                | 🚧     |                                              |
| Sidebar / `_index.md` generator                                            | 🚧     |                                              |
| MDX mode (JSX-in-`@example` detection)                                     | 🚧     |                                              |

**Tests:** 4 vitest cases (function rendering, mdx path mapping, multi-file).

### 3.3 Reader (`@ovellum/reader`)

| Feature                                                              | Status | Notes                                                                                     |
| -------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `readManualDoc(path)` / `parseManualDoc(raw, path)`                  | ✅     |                                                                                           |
| Frontmatter via `gray-matter`                                        | ✅     |                                                                                           |
| Protected zone extraction (`<!-- @manual:start id="…" -->` / `:end`) | ✅     | Regex-based; positional fallback IDs when `id` omitted.                                   |
| Anchor association (block → nearest preceding `ovellum:anchor`)      | ✅     |                                                                                           |
| Error: unclosed / nested / stray `@manual:end`                       | ✅     | `OvellumError` with codes `UNCLOSED_MANUAL_TAG`, `NESTED_MANUAL_TAG`, `STRAY_MANUAL_END`. |
| Positional-fallback warning                                          | 🚧     | Silent today.                                                                             |
| Validation mode (link checker, required frontmatter)                 | 🚧     | Needs `remark` stack.                                                                     |

**Tests:** 9 vitest cases.

### 3.4 Merger (`@ovellum/merger`)

| Feature                                                                     | Status | Notes                                               |
| --------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| `merge(generated, manual, opts?)` → `{ content, orphans, warnings }`        | ✅     |                                                     |
| Section detection (anchor → next heading boundary)                          | ✅     | Splices manual blocks at section end.               |
| Orphan quarantine                                                           | ✅     | Writes `.ovellum/orphans/{YYYY-MM-DD}_{slug}.md`.   |
| `OrphanRecord` metadata (orphaned, source_file, anchor_id, manual_block_id) | ✅     |                                                     |
| Anchor last-seen timestamp on orphans                                       | 🚧     | Needs persisted IR history.                         |
| `@preserve` auto-wrapping in generator                                      | 🚧     | IR carries `isPreserved`; generator wiring pending. |

**Tests:** 8 vitest cases.

### 3.5 CLI (`ovellum`)

See [`CLI.md`](./CLI.md) for full reference.

| Subcommand        | Status |
| ----------------- | ------ |
| `ovellum build`   | ✅     |
| `ovellum watch`   | 🚧     |
| `ovellum check`   | 🚧     |
| `ovellum orphans` | 🚧     |
| `ovellum init`    | 🚧     |
| `ovellum clean`   | 🚧     |

| Flag               | Status          |
| ------------------ | --------------- |
| `--cwd <dir>`      | ✅ (on `build`) |
| `--config <path>`  | ✅ (on `build`) |
| `--strict` global  | 🚧              |
| `--verbose` global | 🚧              |

Exit codes: `0` success · `1` build error · `3` config invalid · `2` (strict) 🚧.

---

## 4. Site builder (`@ovellum/site`)

Powers `mode: 'manual'`. Design lives in [`SITE.md`](./SITE.md).

| Feature                                                                            | Status | Notes                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildSite({ config, cwd })`                                                       | ✅     | Returns `{ pages, warnings, outputDir, assetsDir }`.                                                                                                                 |
| Markdown → HTML via unified + remark + rehype                                      | ✅     |                                                                                                                                                                      |
| Heading slugs (`rehype-slug`) + clickable `#` anchors (`rehype-autolink-headings`) | ✅     |                                                                                                                                                                      |
| Shiki dual-theme code highlighting                                                 | ✅     | `github-light` + `github-dark` via CSS variables. Zero runtime JS for highlighting. Supported langs: ts, tsx, js, jsx, json, bash, shell, markdown, yaml, html, css. |
| Auto-generated sidebar from file tree                                              | ✅     | Titles: frontmatter `title:` → first `# H1` → filename.                                                                                                              |
| `_meta.json` per-directory override                                                | ✅     | Sets directory `title` and `order` (slug list).                                                                                                                      |
| Right-side "On this page" ToC                                                      | ✅     | h2/h3 only.                                                                                                                                                          |
| Pretty URLs (`name/index.html`)                                                    | ✅     |                                                                                                                                                                      |
| Static asset passthrough                                                           | ✅     | Non-`.md` files (images, etc.) copied as-is.                                                                                                                         |
| Top bar with theme toggle                                                          | ✅     | Auto → light → dark cycle; localStorage-backed; applied pre-paint.                                                                                                   |
| Copy buttons on code blocks                                                        | ✅     | Injected client-side; ~50 lines of vanilla JS.                                                                                                                       |
| Default light + dark themes                                                        | ✅     | From `STYLES.md` Tier 2 tokens (hand-ported into `style.css`).                                                                                                       |
| Nord / Solarized themes in switcher                                                | 🚧     | Tokens already in `STYLES.md`.                                                                                                                                       |
| Footer with build timestamp                                                        | ✅     | Configurable; empty string disables.                                                                                                                                 |
| Canonical `<link>` + OG meta                                                       | ✅     | When `site.baseUrl` is set.                                                                                                                                          |
| Search                                                                             | 🚧     | Pagefind candidate.                                                                                                                                                  |
| Sitemap.xml / RSS                                                                  | 🚧     |                                                                                                                                                                      |
| MDX rendering                                                                      | 🚧     | `.md` only in v1.                                                                                                                                                    |
| Multiple bundled templates                                                         | 🚧     | One default for now.                                                                                                                                                 |
| Live reload                                                                        | 🚧     | Pairs with `ovellum watch`.                                                                                                                                          |
| Plugin API for custom templates                                                    | 🚧     |                                                                                                                                                                      |

**Tests:** 11 vitest cases across markdown, nav, template.

---

## 5. Design tokens (`STYLES.md`)

Authoritative reference for color, type, space, rhythm. Site-builder
stylesheet **hand-ports** from this.

| Token group                                                | Status                            |
| ---------------------------------------------------------- | --------------------------------- |
| OKLCH palette: 4 neutrals + 8 accents, 50–950              | ✅                                |
| Type scale (Major Third → Perfect Fourth, fluid)           | ✅                                |
| Space scale (Utopia static + fluid pairs)                  | ✅                                |
| Themes: default light + dark                               | ✅ in stylesheet                  |
| Themes: Nord (light + dark)                                | ✅ in STYLES.md, 🚧 in stylesheet |
| Themes: Solarized (light + dark)                           | ✅ in STYLES.md, 🚧 in stylesheet |
| Token-extraction script (auto-sync stylesheet ← STYLES.md) | 🚧                                |

---

## 6. Examples

| Fixture                                                | Mode     | Demo command            | What it shows                                                                                                               |
| ------------------------------------------------------ | -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`examples/simple-ts/`](../../examples/simple-ts/)     | `hybrid` | `pnpm -w run demo`      | Two TS files → Markdown docs; protected `@manual` blocks survive regeneration; orphans quarantine when a symbol disappears. |
| [`examples/manual-site/`](../../examples/manual-site/) | `manual` | `pnpm -w run demo:site` | Five-page static site with sidebar, right ToC, syntax-highlighted code, auto/light/dark toggle.                             |

Generated outputs are gitignored per-example.

---

## 7. Project plumbing

| Feature                                          | Status | Notes                                                                                                                                                                      |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm workspaces + Turborepo                      | ✅     | Topological build / test / lint / typecheck.                                                                                                                               |
| TypeScript project references                    | ✅     | Every package `composite: true` with `tsBuildInfoFile` inside `dist/`.                                                                                                     |
| Build pattern `tsup && tsc -b --force`           | ✅     | Required for multi-file packages with composite refs. Documented in [`TODO.md` Phase 1 build note](./TODO.md#phase-1---core-types--config-ovellumcore) and project memory. |
| ESM-only for `@ovellum/site`                     | ✅     | Uses `import.meta.url` to resolve bundled template dir.                                                                                                                    |
| Post-build asset copy (site templates → `dist/`) | ✅     | `node -e "require('fs').cpSync(...)"` step.                                                                                                                                |
| Prettier                                         | ✅     | `pnpm format` / `format:check`.                                                                                                                                            |
| ESLint flat config + typescript-eslint           | ✅     | `src/templates/**` excluded for browser-globals.                                                                                                                           |
| changesets                                       | ✅     | Configured; no releases yet.                                                                                                                                               |
| GitHub Actions CI                                | ✅     | `ci.yml` (lint + typecheck + test + build) and `release.yml` (changesets publish).                                                                                         |
| Demo scripts                                     | ✅     | `demo`, `demo:clean`, `demo:site`, `demo:site:clean`.                                                                                                                      |

---

## 8. Tests at a glance

| Package              | Cases  | What's covered                                                                      |
| -------------------- | ------ | ----------------------------------------------------------------------------------- |
| `@ovellum/core`      | 29     | config loading, merge, validation, frontmatter overrides                            |
| `@ovellum/parser`    | 6      | symbol types, filtering, `@preserve`/`@deprecated`                                  |
| `@ovellum/generator` | 4      | function rendering, output paths, multi-file                                        |
| `@ovellum/reader`    | 9      | frontmatter, zones (explicit + positional ids), anchor association, all error paths |
| `@ovellum/merger`    | 8      | splice, orphan quarantine, multi-block, anchorless warning                          |
| `@ovellum/site`      | 11     | markdown pipeline, nav tree, page template                                          |
| **Total**            | **67** |                                                                                     |

Per the cadence rule, this count updates with each commit that adds or removes tests.
