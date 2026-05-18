# Ovellum - Features (current state)

What works **right now**, at this commit. Updated in the same commit as any
change that adds or modifies a user-visible feature.

For the original design vision see [`DESIGN.md`](./DESIGN.md). For roadmap and
deferred items see [`TODO.md`](./TODO.md). For human-only tasks (writing prose,
product decisions, release) see [`TODO-Human.md`](./TODO-Human.md). For
terminology see [`GLOSSARY.md`](./GLOSSARY.md).

Last updated: 2026-05-16 (template anatomy documented in SITE.md §9a)

Status legend:

- `done` — shipped and exercised end-to-end
- `partial` — a v0 slice exists; named gaps live in `TODO.md`
- `deferred` — designed but not yet built (tracked in `TODO.md`)

---

## 1. Modes

Ovellum runs in one of three modes, set via `mode:` in `ovellum.config.{json,ts,js}`.

| Mode     | Status | What it does                                                                                                                                         |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hybrid` | done   | Default. Auto-generates Markdown from TS/JS source, then merges existing `<!-- @manual:start -->` blocks back in. Orphans go to `.ovellum/orphans/`. |
| `manual` | done   | Pure static-site builder from `.md` files → HTML. No source parsing. See §4 ([`@ovellum/site`](#4-site-builder---ovellumsite)).                      |
| `auto`   | done   | Auto-generate Markdown only. Existing output is overwritten. No merge step.                                                                          |

---

## 2. Core (`@ovellum/core`)

Shared types, config schema, error class. Consumed by every other package.

| Feature                                                                | Status | Notes                                                                                          |
| ---------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| IR types (`DocNode`, `DocFile`, `DocProject`, `DocParam`, `DocReturn`) | done   | Per [`DESIGN.md` §6](./DESIGN.md#6-intermediate-representation-ir)                             |
| `OvellumConfig` schema                                                 | done   | Full reference in [`CONFIG.md`](./CONFIG.md). Includes `site`, `protect`, format, mode, paths. |
| `defineConfig()` helper                                                | done   | Identity function for type-safe `ovellum.config.ts`.                                           |
| `loadOvellumConfig({ cwd, configFile })`                               | done   | Loads via `c12`; applies defaults; validates. Returns `{ config, configFile, cwd }`.           |
| `loadDirectoryOverride(rootCwd, targetDir, root)`                      | done   | Walks from root → target, merges every nested `ovellum.config.*` (deepest wins).               |
| `parseFrontmatterOverride(frontmatter)`                                | done   | Extracts `ovellum:` block from `.md` frontmatter for per-file mode overrides.                  |
| `mergeConfig(base, override)`                                          | done   | Shallow merge; arrays replaced wholesale; `protect` and `site` merged field-by-field.          |
| `validateUserConfig(input)`                                            | done   | Hand-rolled validator; throws `ConfigError` with `code` + `hint`.                              |
| `OvellumError` / `ConfigError`                                         | done   | Typed error base + config-specific subclass.                                                   |

**Tests:** 29 vitest cases — defaults, full config, every validation error, merge rules, frontmatter overrides, per-directory loading.

---

## 3. Pipeline (auto + hybrid modes)

### 3.1 Parser (`@ovellum/parser`)

| Symbol kind             | Status   | Notes                                                                      |
| ----------------------- | -------- | -------------------------------------------------------------------------- |
| `function`              | done     | Generics + JSDoc + params + return type. Overloads deferred.               |
| `class`                 | partial  | Methods + properties + extends + implements. Constructor section deferred. |
| `interface`             | done     | Properties + methods + extends.                                            |
| `type` alias            | done     | Name + RHS + generics.                                                     |
| `enum`                  | done     | Members with optional initializer values.                                  |
| `const` / `let` / `var` | deferred | Deferred.                                                                  |
| Module-level `@module`  | partial  | Only when attached to the first statement of the file.                     |

| JSDoc tag                        | Status                                               |
| -------------------------------- | ---------------------------------------------------- |
| `@param`, `@returns` / `@return` | done                                                 |
| `@throws` / `@exception`         | done                                                 |
| `@example`                       | done                                                 |
| `@deprecated`                    | done                                                 |
| `@since`, `@see`                 | partial (extracted; rendering in generator deferred) |
| `@remarks`, `@description`       | done                                                 |
| `@preserve` flag                 | partial (flag on `DocNode`; auto-wrapping deferred)  |
| `@internal` flag                 | done                                                 |
| Unknown tags                     | done (collected into the `tags` bag)                 |

| Edge case                      | Status   |
| ------------------------------ | -------- |
| Re-exports / barrel files      | deferred |
| Circular imports               | deferred |
| Overloaded functions           | deferred |
| Namespace exports              | deferred |
| `declare module` augmentations | deferred |

Anchor IDs: done `{relativeFilePath}::{symbolPath}` per [`DESIGN.md` §8.3](./DESIGN.md#83-anchor-ids-and-stability).

**Tests:** 6 vitest smoke tests across symbol types and filtering.

### 3.2 Generator (`@ovellum/generator`)

| Feature                                                                    | Status   | Notes                                              |
| -------------------------------------------------------------------------- | -------- | -------------------------------------------------- |
| `generateDocs(project, config)` → `Map<outputPath, markdown>`              | done     |                                                    |
| Output path mapping `src/foo.ts` → `docs/foo.md`                           | done     | `.mdx` extension wired but JSX detection deferred. |
| Frontmatter (`title`, `source`, `generated`, `ovellum: true`)              | done     |                                                    |
| Function template (signature + params table + returns + throws + examples) | done     |                                                    |
| Class template (heritage + methods table + properties table)               | partial  | Constructor section deferred.                      |
| Interface template (members table)                                         | done     |                                                    |
| Type alias template                                                        | done     |                                                    |
| Enum template (members with values)                                        | done     |                                                    |
| Variable / const template                                                  | deferred |                                                    |
| Anchor comments `<!-- ovellum:anchor id="…" generated="…" -->`             | done     | On every top-level + child node.                   |
| `@deprecated` callout                                                      | partial  | Plain blockquote. Styled callout deferred.         |
| `@since` / `@see` rendering                                                | deferred |                                                    |
| Sidebar / `_index.md` generator                                            | deferred |                                                    |
| MDX mode (JSX-in-`@example` detection)                                     | deferred |                                                    |

**Tests:** 4 vitest cases (function rendering, mdx path mapping, multi-file).

### 3.3 Reader (`@ovellum/reader`)

| Feature                                                              | Status   | Notes                                                                                     |
| -------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `readManualDoc(path)` / `parseManualDoc(raw, path)`                  | done     |                                                                                           |
| Frontmatter via `gray-matter`                                        | done     |                                                                                           |
| Protected zone extraction (`<!-- @manual:start id="…" -->` / `:end`) | done     | Regex-based; positional fallback IDs when `id` omitted.                                   |
| Anchor association (block → nearest preceding `ovellum:anchor`)      | done     |                                                                                           |
| Error: unclosed / nested / stray `@manual:end`                       | done     | `OvellumError` with codes `UNCLOSED_MANUAL_TAG`, `NESTED_MANUAL_TAG`, `STRAY_MANUAL_END`. |
| Positional-fallback warning                                          | done     | Reader emits one warning per zone that falls back to `manual-block-N`; surfaced through the CLI build summary. |
| Validation mode (link checker, required frontmatter)                 | deferred | Needs `remark` stack.                                                                     |

**Tests:** 9 vitest cases.

### 3.4 Merger (`@ovellum/merger`)

| Feature                                                                     | Status   | Notes                                               |
| --------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| `merge(generated, manual, opts?)` → `{ content, orphans, warnings }`        | done     |                                                     |
| Section detection (anchor → next heading boundary)                          | done     | Splices manual blocks at section end.               |
| Orphan quarantine                                                           | done     | Writes `.ovellum/orphans/{YYYY-MM-DD}_{slug}.md`.   |
| `OrphanRecord` metadata (orphaned, source_file, anchor_id, manual_block_id) | done     |                                                     |
| Anchor last-seen timestamp on orphans                                       | deferred | Needs persisted IR history.                         |
| `@preserve` auto-wrapping in generator                                      | deferred | IR carries `isPreserved`; generator wiring pending. |

**Tests:** 8 vitest cases.

### 3.5 CLI (`ovellum`)

See [`CLI.md`](./CLI.md) for full reference.

| Subcommand        | Status   |
| ----------------- | -------- |
| `ovellum init`    | done     |
| `ovellum build`   | done     | manual / hybrid / auto |
| `ovellum dev`     | done     | manual-only (HTML + live reload) |
| `ovellum watch`   | done     | manual / hybrid / auto |
| `ovellum serve`   | done     |
| `ovellum check`   | done     | manual / hybrid / auto |
| `ovellum orphans` | deferred |
| `ovellum clean`   | deferred |

| Flag               | Status            |
| ------------------ | ----------------- |
| `--cwd <dir>`      | done (on `build`) |
| `--config <path>`  | done (on `build`) |
| `--strict` global  | deferred          |
| `--verbose` global | deferred          |

Exit codes: `0` success · `1` build error · `3` config invalid · `2` (strict) deferred.

---

## 4. Site builder (`@ovellum/site`)

Powers `mode: 'manual'`. Design lives in [`SITE.md`](./SITE.md).

| Feature                                                                            | Status   | Notes                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildSite({ config, cwd })`                                                       | done     | Returns `{ pages, warnings, outputDir, assetsDir }`.                                                                                                                                           |
| Markdown → HTML via unified + remark + rehype                                      | done     |                                                                                                                                                                                                |
| Heading slugs (`rehype-slug`) + clickable `#` anchors (`rehype-autolink-headings`) | done     |                                                                                                                                                                                                |
| Shiki dual-theme code highlighting                                                 | done     | `github-light` + `github-dark` via CSS variables. Zero runtime JS for highlighting. Supported langs: ts, tsx, js, jsx, json, bash, shell, markdown, yaml, html, css.                           |
| Auto-generated sidebar from file tree                                              | done     | Titles: frontmatter `title:` → first `# H1` → filename.                                                                                                                                        |
| `_meta.json` per-directory override                                                | done     | Sets directory `title` and `order` (slug list).                                                                                                                                                |
| Right-side "On this page" ToC                                                      | done     | h2/h3 only.                                                                                                                                                                                    |
| Pretty URLs (`name/index.html`)                                                    | done     |                                                                                                                                                                                                |
| Static asset passthrough                                                           | done     | Non-`.md` files (images, etc.) copied as-is.                                                                                                                                                   |
| **Landing page** (`site.landing.enabled`)                                          | done     | Disabled by default. When enabled: full-width hero + feature grid + optional `_landing.md` prose + optional trust strip rendered at `/`. Doc pages keep their URLs. Top-bar gains a Docs link. |
| Top bar with theme toggle                                                          | done     | Auto → light → dark cycle; localStorage-backed; applied pre-paint. Icons (monitor/sun/moon) swap by `data-theme`.                                                                              |
| Right-aligned topbar nav with mobile sheet                                         | done     | Driven by `site.topbarNav`. External links get a small SVG arrow. Below 720px the nav collapses into a hamburger that opens a full-width sheet.                                                |
| Inline SVG icon registry (Lucide)                                                  | done     | `renderIcon(name)` returns a 24×24 currentColor SVG with Lucide's canonical attributes (stroke-width 2, round caps). Path data imported per-icon from `lucide` (tree-shaken: ~100B per icon). Public set: menu, close, sun, moon, monitor, chevron-down, github (hand-rolled — Lucide v1 dropped brand marks), external-link, search, check. |
| Hero with dotted-noise + spotlight bg                                              | done     | Landing hero gets two stacked pseudo-elements: a 24px dotted SVG pattern (theme-aware, masked to fade at the edges) and a radial accent spotlight. No images shipped; both are data-URL/CSS-only. |
| Copy buttons on code blocks                                                        | done     | Injected client-side; ~50 lines of vanilla JS.                                                                                                                                                 |
| Default light + dark themes                                                        | done     | From `STYLES.md` Tier 2 tokens (hand-ported into `style.css`).                                                                                                                                 |
| Nord / Solarized themes in switcher                                                | deferred | Tokens already in `STYLES.md`.                                                                                                                                                                 |
| Footer with build timestamp                                                        | done     | Configurable; empty string disables.                                                                                                                                                           |
| Canonical `<link>` + OG meta                                                       | done     | When `site.baseUrl` is set.                                                                                                                                                                    |
| `site.basePath` (Jekyll-style sub-path hosting)                                    | done     | Prepended to every internal URL, asset path, canonical link, sitemap entry. Empty by default.                                                                                                  |
| Prev / next page navigation                                                        | done     | Auto-rendered at the bottom of each doc page from the sidebar order.                                                                                                                          |
| `sitemap.xml`                                                                      | done     | Auto-generated when `site.baseUrl` is set. `/404/` excluded by default. `<lastmod>` from git mtime deferred.                                                                                  |
| Search (Pagefind)                                                                  | done     | Opt-in via `site.search.enabled`. `ovellum build` runs the Pagefind indexer against `dist/` and the topbar mounts the default Pagefind UI (themed via CSS variables to match Ovellum's tokens). |
| Breadcrumbs                                                                        | done     | Auto-rendered above the article when the page sits at least two levels deep in the nav (top-level pages get none). Last entry marked `aria-current="page"`.                                  |
| Custom 404 layout                                                                  | done     | `/404/` gets `body.ov-body-404`: sidebar, ToC, prev/next, breadcrumbs, and edit-this-page are hidden; the article centres on a narrower column with a larger heading.                        |
| Print stylesheet                                                                   | done     | `@media print` hides chrome (topbar, sidebar, ToC, search, prev/next, edit link), widens content to full width, prints external link URLs inline, and avoids page-breaks inside code blocks. |
| Reading time + last-modified                                                       | done     | Per-page meta line above the article: `N min read · Updated YYYY-MM-DD`. Word count strips code blocks/HTML; ~200 wpm. Date prefers `git log -1`, falls back to fs mtime. Toggle each half via `site.pageMeta.{readingTime,lastModified}`. |
| RSS feed (`feed.xml`)                                                              | done     | Auto-generated when `site.baseUrl` is set. Items sorted by `lastModified` desc, capped at 20; `/` and `/404/` excluded; channel-level `<atom:link rel="self">`; head `<link rel="alternate">` on every page for auto-discovery. |
| MDX rendering                                                                      | deferred | `.md` only in v1.                                                                                                                                                                              |
| Multiple bundled templates                                                         | deferred | One default for now.                                                                                                                                                                           |
| Live reload                                                                        | deferred | Pairs with `ovellum watch`.                                                                                                                                                                    |
| Plugin API for custom templates                                                    | deferred |                                                                                                                                                                                                |

**Template anatomy**: where the bundled template lives, what format each
piece is in, and how to change the design — see
[`SITE.md` §9a](./SITE.md#9a-template-anatomy).

**Tests:** 81 vitest cases in `@ovellum/site` (markdown incl. sanitization, nav, template, landing, sitemap, rss, url helpers, page-meta incl. command-injection resistance, icons) plus 8 in `ovellum` (CLI URL-scheme allowlist).

**Security:** sanitization policy, shell-out hardening, and URL-scheme allowlist are documented in [`SECURITY.md`](./SECURITY.md).

---

## 5. Design tokens (`STYLES.md`)

Authoritative reference for color, type, space, rhythm. Site-builder
stylesheet **hand-ports** from this.

| Token group                                                | Status                                    |
| ---------------------------------------------------------- | ----------------------------------------- |
| OKLCH palette: 4 neutrals + 8 accents, 50–950              | done                                      |
| Type scale (Major Third → Perfect Fourth, fluid)           | done                                      |
| Space scale (Utopia static + fluid pairs)                  | done                                      |
| Themes: default light + dark                               | done                                      |
| Themes: Nord (light + dark)                                | partial (in STYLES.md; not in stylesheet) |
| Themes: Solarized (light + dark)                           | partial (in STYLES.md; not in stylesheet) |
| Token-extraction script (auto-sync stylesheet ← STYLES.md) | deferred                                  |

---

## 6. Examples

| Fixture                                                | Mode     | Demo command            | What it shows                                                                                                               |
| ------------------------------------------------------ | -------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [`examples/simple-ts/`](../../examples/simple-ts/)     | `hybrid` | `pnpm -w run demo`      | Two TS files → Markdown docs; protected `@manual` blocks survive regeneration; orphans quarantine when a symbol disappears. |
| [`examples/manual-site/`](../../examples/manual-site/) | `manual` | `pnpm -w run demo:site` | Five-page static site with sidebar, right ToC, syntax-highlighted code, auto/light/dark toggle.                             |

Generated outputs are gitignored per-example.

---

## 6.5 Official website (`website/`)

Ovellum's own site, built with Ovellum in manual mode and deployed to
GitHub Pages on every push to `main`. Lives in
[`website/`](../../website/). Design lives in [`DEPLOY.md`](./DEPLOY.md).

| Feature                                     | Status   | Notes                                                                                                              |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| Landing + 15 doc pages built from Markdown  | done     | `pnpm -w run build:website` → `website/dist/`.                                                                     |
| Custom domain via `CNAME`                   | done     | `website/content/CNAME` passes through to `dist/CNAME`. Target: `ovellum.oss.oinam.com` (DNS pending; TODO-Human). |
| `404.html` for missing paths                | done     | `content/404.md` builds to `dist/404/index.html`; the post-build script also copies it to `dist/404.html`.         |
| Deploy workflow (`deploy-website.yml`)      | done     | Push to `main` → build → `actions/deploy-pages@v4`. Concurrency-cancellation enabled.                              |
| PR preview workflow (`website-preview.yml`) | done     | Pull-request builds upload `website-dist` as an artifact; no deploy.                                               |
| pnpm + Node cache in CI                     | done     | `actions/setup-node@v4` with `cache: pnpm`.                                                                        |
| `site.basePath` for subpath hosting         | deferred | Needed only if hosting from `<user>.github.io/<repo>/` instead of a custom domain.                                 |
| Pagefind search integration                 | deferred | Post-build indexer + ~50 KB client. Separate slice.                                                                |
| Sitemap.xml / RSS                           | done     | Both auto-emit when `site.baseUrl` is set. RSS items sorted by lastmod desc, capped at 20.                          |
| Lighthouse CI                               | done     | `.github/workflows/lighthouse.yml` runs `@lhci/cli autorun` against the built site on each PR; report uploaded as artifact. Informational only — no merge gate. |

---

## 7. Project plumbing

| Feature                                          | Status | Notes                                                                                                                                                                      |
| ------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm workspaces + Turborepo                      | done   | Topological build / test / lint / typecheck.                                                                                                                               |
| TypeScript project references                    | done   | Every package `composite: true` with `tsBuildInfoFile` inside `dist/`.                                                                                                     |
| Build pattern `tsup && tsc -b --force`           | done   | Required for multi-file packages with composite refs. Documented in [`TODO.md` Phase 1 build note](./TODO.md#phase-1---core-types--config-ovellumcore) and project memory. |
| ESM-only for `@ovellum/site`                     | done   | Uses `import.meta.url` to resolve bundled template dir.                                                                                                                    |
| Post-build asset copy (site templates → `dist/`) | done   | `node -e "require('fs').cpSync(...)"` step.                                                                                                                                |
| Prettier                                         | done   | `pnpm format` / `format:check`.                                                                                                                                            |
| ESLint flat config + typescript-eslint           | done   | `src/templates/**` excluded for browser-globals.                                                                                                                           |
| changesets                                       | done   | Configured; no releases yet.                                                                                                                                               |
| GitHub Actions CI                                | done   | `ci.yml` (lint + typecheck + test + build) and `release.yml` (changesets publish).                                                                                         |
| Demo scripts                                     | done   | `demo`, `demo:clean`, `demo:site`, `demo:site:clean`, `build:website`, `build:website:clean`.                                                                              |
| Website deploy + PR preview workflows            | done   | `.github/workflows/{deploy-website,website-preview}.yml` + `scripts/website-postbuild.mjs`. See [`DEPLOY.md`](./DEPLOY.md).                                                |

---

## 8. Tests at a glance

| Package              | Cases  | What's covered                                                                      |
| -------------------- | ------ | ----------------------------------------------------------------------------------- |
| `@ovellum/core`      | 29     | config loading, merge, validation, frontmatter overrides                            |
| `@ovellum/parser`    | 6      | symbol types, filtering, `@preserve`/`@deprecated`                                  |
| `@ovellum/generator` | 4      | function rendering, output paths, multi-file                                        |
| `@ovellum/reader`    | 9      | frontmatter, zones (explicit + positional ids), anchor association, all error paths |
| `@ovellum/merger`    | 8      | splice, orphan quarantine, multi-block, anchorless warning                          |
| `@ovellum/site`      | 18     | markdown pipeline, nav tree, page template, landing renderer                        |
| **Total**            | **74** |                                                                                     |

Per the cadence rule, this count updates with each commit that adds or removes tests.
