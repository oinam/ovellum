# Ovellum - Features (current state)

What works **right now**, at this commit. Updated in the same commit as any
change that adds or modifies a user-visible feature.

For the original design vision see [`DESIGN.md`](./DESIGN.md). For roadmap and
deferred items see [`TODO.md`](./TODO.md). For human-only tasks (writing prose,
product decisions, release) see [`TODO-Human.md`](./TODO-Human.md). For
terminology see the [glossary](https://ovellum.oss.oinam.com/docs/reference/glossary/).

Last updated: 2026-06-07 (CLI update notifier + `ovellum upgrade`; `update` config block)

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
| `OvellumConfig` schema                                                 | done   | Full reference in the [config reference](https://ovellum.oss.oinam.com/docs/reference/config/). Includes `site`, `protect`, format, mode, paths. |
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

**Tests:** 12 vitest cases — symbol types and filtering, plus complex-type extraction (generics, optional/default/rest params, union/intersection types, interface heritage, generic union type aliases, the `includePrivate` gate).

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
| `@deprecated` callout                                                      | partial  | Plain blockquote. Could wrap in `> [!WARNING]` for the rendered site to pick up the styled callout. |
| `@since` / `@see` rendering                                                | deferred |                                                    |
| Sidebar / `_index.md` generator                                            | deferred |                                                    |
| MDX mode (JSX-in-`@example` detection)                                     | deferred |                                                    |

**Tests:** 7 vitest cases (function rendering, mdx path mapping, multi-file, plus node-kind rendering: deprecated/since banners, class Properties/Methods grouping, enum members).

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

See the [CLI reference](https://ovellum.oss.oinam.com/docs/reference/cli/) for full reference.

| Subcommand        | Status   |
| ----------------- | -------- |
| `ovellum init`    | done     |
| `ovellum build`   | done     | manual / hybrid / auto |
| `ovellum dev`     | done     | manual-only (HTML + live reload) |
| `ovellum watch`   | done     | manual / hybrid / auto |
| `ovellum serve`   | done     |
| `ovellum check`   | done     | manual / hybrid / auto |
| `ovellum upgrade` | done     | npm dist-tag check; detects mgr + global/local; `--dry-run`, `--yes` |
| `ovellum orphans` | deferred |
| `ovellum clean`   | deferred |

Update notifier: after a command completes, a one-line "update available"
notice prints when the npm `latest` dist-tag is newer than the running CLI.
Cached per `update.intervalHours` (default 24h); silent in CI / non-TTY /
`NO_UPDATE_NOTIFIER` / `--no-update-check` / `update.check: false`; never
blocks or fails a run. Notice only — install is the explicit `upgrade`
command. Code: `packages/cli/src/update/{semver,registry,cache,install,notifier}.ts`.

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
| Markdown → HTML via unified + remark + rehype                                      | done     | CommonMark + GFM (tables, strikethrough, task lists, literal autolinks) via `remark-gfm`.                                                                                                       |
| Heading slugs (`rehype-slug`) + clickable `#` anchors (`rehype-autolink-headings`) | done     |                                                                                                                                                                                                |
| Shiki dual-theme code highlighting                                                 | done     | `github-light` + `github-dark` via CSS variables. Zero runtime JS for highlighting. Supported langs: ts, tsx, js, jsx, json, bash, shell, markdown, yaml, html, css.                           |
| Auto-generated sidebar from file tree                                              | done     | Titles: frontmatter `title:` → first `# H1` → filename. When a site funnels every page through a single top-level section (e.g. all content under `/docs`), the sidebar roots at that section — its pages sit at the top level (no redundant wrapper) with the section index as the lead item, and stray root entries (404, asset dirs) drop out. Multi-section sites keep the full tree. Asset-only folders (no Markdown, e.g. `public/`) are pruned from the nav automatically (their files still copy). |
| Content exclusion (ignoreFolders / hidden / draft)                                 | done     | Three ways to keep content out of the manual-mode build (nav **and** output): `site.ignoreFolders: string[]` (folder names, any depth — not rendered, not copied); `_meta.json` `"hidden": true` (a folder opts itself out); frontmatter `draft: true` (unpublish one page). `public/`-style asset folders need none of these — they're auto-pruned from the nav. Seams: `nav.ts` (walk skips ignore/hidden dirs, prunes empty, drops draft pages) + `build.ts` (`walkContent` skips ignore/hidden dirs, `renderOne` returns null on draft). |
| `_meta.json` per-directory override                                                | done     | Sets directory `title` and `order` (slug list).                                                                                                                                                |
| Right-side "On this page" ToC                                                      | done     | h2/h3 only.                                                                                                                                                                                    |
| Pretty URLs (`name/index.html`)                                                    | done     |                                                                                                                                                                                                |
| Static asset passthrough                                                           | done     | Non-`.md` files (images, etc.) copied as-is.                                                                                                                                                   |
| **Landing page** (`site.landing.enabled`)                                          | done     | Disabled by default. When enabled: full-width hero + feature grid + optional `_landing.md` prose + optional trust strip rendered at `/`. Doc pages keep their URLs. Top-bar gains a Docs link. Feature grid renders as subtle cards via the reusable `.ov-card` primitive (`--color-surface` + hairline border + `--radius-lg`). |
| Topbar appearance control (mode + palette + accent)                                | done     | Palette-icon popover (inlined into the mobile sheet) replacing the old cycle toggle (2026-06-12). **Mode**: auto/light/dark segmented control → `data-theme`. **Theme**: five bundled palettes — Ovellum (the monochrome base, id `default`, pinned first), then alphabetical E-ink (warm paper + ink black), Flexoki, Nord, Solarized → `data-palette`; each is shown with a crisp monochrome Lucide line glyph (pen-tool for Ovellum — a nib echoing the brand mark / book-open / feather / snowflake / sun-dim) rather than the old colour-swatch dot. Each palette re-skins the grey ramp in `style.css`, so light + dark come free from the reversed-ramp remap (palette blocks sit before the dark blocks; per-palette dark accents after, at higher specificity). macOS was dropped 2026-06-13. **All values in OKLCH** per the design principle (canonical palette hex kept in trailing comments as the fidelity reference); shipped CSS stays all-OKLCH because `scripts/build-templates.mjs` minifies CSS with whitespace/identifier passes only — esbuild's `minifySyntax` would rewrite in-gamut `oklch()` back to hex, so it's deliberately off for CSS (kept on for JS). **Color** (renamed from "Accent"): six presets + native colour input + a leading "Default" swatch (filled with `--color-fg`, clears the override) → inline `--ov-accent` + `data-accent` on `<html>`; the override block drives **both** the primary role (CTA buttons) and the accent role (links/focus/ToC), hover via `color-mix`, with a repeated-attribute specificity bump to beat palette+mode combos. All three (mode/palette/colour) persisted in localStorage (`ovellum-theme` / `ovellum-palette` / `ovellum-accent`) and applied pre-paint by the boot script, which also owns the per-palette bg map driving Safari's `theme-color` (`window.__OV_PALETTE_BG__`; a stale stored palette like the removed `macos` degrades gracefully to default). Config defaults: `site.defaultTheme`, `site.palette`, `site.accent`. |
| Version badge next to the brand                                                    | done     | Driven by `site.version` (free-form string, e.g. `"v0.2.1"`). Rendered as a small mono chip baseline-aligned with the brand title. Omitted when `site.version` is unset.                       |
| Right-aligned topbar nav with mobile sheet                                         | done     | Driven by `site.topbarNav`. Brand (logo mark + wordmark + version) on the left; the search box fills a centered zone; on the right, text links → icon-only links (via `icon`) → divider → appearance control, each a rounded-square button. External text links get a small SVG arrow. Below 720px the top row keeps logo + version + centered search + hamburger; the nav and the appearance panel move into the full-width sheet (icon links regain their label there). |
| Two-column footer (copyright + footerNav)                                          | done     | `site.footerNav` populates the right column; items with `icon` render as icon-only Lucide glyphs (`github` / `rss` / `mail` / `package`), items without as text. Footer outer boundary tracks the topbar's max-inline-size and gutters so all three rails align. |
| Inline SVG icon registry (Lucide)                                                  | done     | `renderIcon(name)` returns a 24×24 currentColor SVG with Lucide's canonical attributes (stroke-width 2, round caps). Path data imported per-icon from `lucide` (tree-shaken: ~100B per icon). Public set: menu, close, sun, moon, monitor, chevron-down, github (hand-rolled — Lucide v1 dropped brand marks), external-link, search, check, copy, rss, mail, package, palette, and the appearance-panel theme glyphs pen-tool / book-open / feather / snowflake / sun-dim. |
| Hero with dotted-noise + spotlight bg                                              | done     | Default landing hero: two stacked pseudo-elements (a 24px dotted SVG pattern + a radial accent spotlight). No images shipped; both data-URL/CSS-only. Suppressed when `site.landing.hero.media` is set.                                                |
| Imagery hero (`site.landing.hero.media`)                                           | done     | Opt-in full-bleed visual layer behind the title/subtitle/CTAs. Stacks two `<img>` tags (light + dark) and toggles them via `[data-theme]` so the page-level theme switch flips assets without JS. Bottom edge softly fades into the page via CSS mask. Animation, theme-respecting fills, and `prefers-reduced-motion` handling live **inside** the SVG asset itself — swap the file to change motion or palette. |
| Landing install snippets (`site.landing.install`)                                  | done     | Optional titled command snippets spliced between the hero CTAs and the feature grid. Each `{ title, code, lang? }` runs through the same markdown/shiki pipeline as doc code blocks (highlighting + `data-language` + `data-copy`) and the section is wrapped in `.ov-prose`. Inside `.ov-install` the language eyebrow is suppressed and the copy button is rendered as an icon, vertically centered on the right edge (copy glyph → check); doc code blocks elsewhere keep their eyebrow + text copy button. `lang` defaults to `bash`. |
| Section scenes (`site.landing.scenes`)                                             | done     | Optional ambient visuals interleaved between landing sections in order. Each scene is a centered figure (inherits landing's `--page-max`, 16:9 aspect, `object-fit: contain`) with top/bottom mask-fade. Bundled scenes are hand-authored SVGs with named groups so per-element animation (windmill blades, drones, leaves, ripples, etc.) lives **inside** each asset alongside its own `prefers-reduced-motion` handling — mirrors the hero pattern. Light/dark variants follow the same `[data-theme]` flip as the hero. `aria-hidden` by default; set `alt` to opt into AT announcement. |
| Copy button on code blocks                                                         | done     | Injected client-side; vanilla JS. Docs code blocks get a text **Copy** button (top-right, hover-revealed, label → "Copied"). Install snippets (inside `.ov-install`) get an icon button instead (copy glyph → check on success) vertically centered on the right edge; subtle by default, full-strength on hover / keyboard focus. Icons (`copy`/`check`) live in the icon registry. Install snippets carry a `data-copy-text` attribute (set in `build.ts`) so the copy button yields only the command, never the folded-in title comment; docs blocks have no such attribute and copy full `innerText`. |
| Language eyebrow on highlighted code blocks                                        | done     | CSS `::before attr(data-language)` uppercase label in the top-right of every doc code block; hover-fades so it doesn't fight the copy button. Suppressed inside `.ov-install` (install snippets stand alone with just the icon copy button). `data-language` is emitted by the markdown pipeline (drives syntax highlighting + the comment prefix). |
| Default light + dark themes                                                        | done     | Token architecture (2026-06-06): one generic grey ramp `--color-gray-50…950` (+ white/black, Tailwind-"neutral" values) → role triples (`--color-primary/-secondary/-accent` ×value/-fg/-hover) → semantic surfaces/text. All colour lives in `style.css` (not synced from STYLES.md). Dark = the same ramp remapped to reversed steps (one block, no separate colour values). |
| Monochrome CTA buttons                                                             | done     | Landing CTAs read the `--color-primary` / `--color-secondary` role triples (no separate `--color-cta-*` set). Default theme: primary = dark grey fill, secondary = light fill + hairline; dark remaps to a white primary + recessed `gray-800` secondary. Fully monochrome, all from the grey ramp. |
| Monochrome chrome + editorial frame                                                | done     | Site-wide redesign (2026-06-04). **Fully monochrome in both themes** — chrome AND callouts are neutral; the only colour on a page is code syntax highlighting. `--color-accent`/`--color-link` resolve to `--color-fg`, focus ring to neutral gray; callout type tokens are fg-derived (`--color-fg` rule/label on `--color-bg-subtle`), defined once in `:root` and auto-adapting to dark (dark blocks no longer redeclare accent/link/callouts). Borders are translucent `color-mix` tints of `--color-fg`. A fixed, `pointer-events:none` `.ov-frame` (`renderFrame()`) draws two faint `--color-frame-line` vertical rules hugging the content edges, marked at the header baseline by a small darker **`+`** (a 10px box of two crossing 1px `--color-fg-subtle` gradients — no fill/border, so it reads as a quiet cross not a dot); the **footer mirrors the `+`** at its top border via `.ov-footer-inner::before/::after`. Aligned to `--chrome-max` so rules + marks match topbar/footer edges on every page; hidden below 720px and in print. Header is a fixed-height (`--ov-header-h: 4rem`) frosted bar. System-font + OKLCH principles unchanged. |
| Boxed content card on doc pages                                                    | done     | The reading column (breadcrumbs + page-meta + article + edit link) is wrapped in `.ov-content-card`: a light `--color-surface` box with a hairline border, `--radius-lg` corners, and a soft drop-shadow, lifted off the body (coss-style). Width is capped via `--content-card-max` (prose measure + card padding) so the box hugs the reading column; the prose's own cap is released inside. Prev/next sits below the card (sibling, same width cap, no top rule). Neutralised on the centred 404 and in print; landing pages keep their own section layout. |
| Serif / sans-serif body font (`site.font`)                                         | done     | `site.font: 'sans' \| 'serif'` (default `'sans'`) sets `data-font` on `<html>`; `[data-font='serif']` swaps the `--font-body` role from `--font-sans` to `--font-serif`, so body + headings + prose follow while code stays `--font-mono`. Both are system-font stacks (no webfonts). Applies to docs + landing. Custom families are a backlogged future extension (see TODO.md). |
| Quiet sidebar + roomier content (2026-06-04)                                       | done     | Sidebar has **one** left border — the frame's left rail itself (no separate track). `.ov-layout` uses asymmetric inline padding (left `--frame-inset` flush onto the rail; right `--frame-inset + --frame-gutter` so the ToC clears the right rail). Group headings + links (incl. nested children) share one flush-left edge with a minimal `--space-2xs` inset — a flat list, no indent hierarchy. The active item reads via darker colour (`--color-fg`, not bold) + a 2px `--color-fg` `::before` strip that lands on the rail. Column gaps widened to `--space-xl`. Prev/next hover darkened (foreground-strength border + `--color-bg-muted` fill). Search input rounds to `--radius-xl` (0.75rem). |
| Nord / Solarized themes in switcher                                                | done     | Shipped as palettes in the appearance control (plus Flexoki + E-ink, beyond the original plan; macOS was trialled then dropped 2026-06-13). Implemented as ramp re-skins, not the STYLES.md §7 per-token blocks — see the appearance-control row above. |
| Footer with build timestamp                                                        | done     | Configurable; empty string disables.                                                                                                                                                           |
| Canonical `<link>` + OG meta                                                       | done     | When `site.baseUrl` is set.                                                                                                                                                                    |
| Raw `<head>` injection (`site.headExtra`)                                          | done     | Verbatim HTML injected into `<head>` on every page, after the search bits and before the inline theme-boot script. Not escaped/sanitised — author-controlled markup only. Unset by default. Primary use: analytics snippets. |
| `site.basePath` (Jekyll-style sub-path hosting)                                    | done     | Prepended to every internal URL, asset path, canonical link, sitemap entry. Empty by default.                                                                                                  |
| Prev / next page navigation                                                        | done     | Auto-rendered at the bottom of each doc page from the sidebar order.                                                                                                                          |
| Minified CSS + JS                                                                  | done     | The default template's `style.css` / `script.js` ship **minified** in `dist/assets/ovellum.{css,js}` (~42% / ~56% smaller; comments stripped). Done at package-build time via `scripts/build-templates.mjs` (esbuild `transform`, a dev-only dep) while copying `src/templates → dist/templates`; `ovellum build` stays a plain copy, so no minifier ships to users and the source files stay readable. |
| `sitemap.xml`                                                                      | done     | Auto-generated when `site.baseUrl` is set. `/404/` excluded by default. `<lastmod>` from git mtime deferred.                                                                                  |
| Search (Pagefind)                                                                  | done     | Opt-in via `site.search.enabled`. `ovellum build` runs the Pagefind indexer against `dist/` and the topbar mounts the default Pagefind UI (themed via CSS variables to match Ovellum's tokens). |
| Breadcrumbs                                                                        | done     | Auto-rendered above the article when the page sits at least two levels deep in the nav (top-level pages get none). Last entry marked `aria-current="page"`.                                  |
| Custom 404 layout                                                                  | done     | `/404/` gets `body.ov-body-404`: sidebar, ToC, prev/next, breadcrumbs, and edit-this-page are hidden; the article centres on a narrower column with a larger heading. Excluded from the reading flow — sidebar, sitemap, RSS, **and prev/next** (`findAdjacent` filters `/404/`, so the first real page's "Previous" is empty, not the 404). Documented user-facing in the [manual-mode guide](https://ovellum.oss.oinam.com/docs/guides/manual-mode/#the-404-page). Core `ovellum build` emits **both** `dist/404/index.html` and the top-level `dist/404.html` (since 2026-06-06), so the custom 404 triggers on GitHub Pages/Netlify/Cloudflare with no extra step — the old website-only `scripts/website-postbuild.mjs` copy was retired. |
| Print stylesheet                                                                   | done     | `@media print` hides chrome (frame, topbar, sidebar, ToC, search, prev/next, edit link), widens content to full width, prints external link URLs inline, and avoids page-breaks inside code blocks. |
| Reading time + last-modified                                                       | done     | Per-page meta line above the article: `N min read · Updated YYYY-MM-DD`. Word count strips code blocks/HTML; ~200 wpm. Date prefers `git log -1`, falls back to fs mtime. Toggle each half via `site.pageMeta.{readingTime,lastModified}`. |
| RSS feed (`feed.xml`)                                                              | done     | Auto-generated when `site.baseUrl` is set. Items sorted by `lastModified` desc, capped at 20; `/` and `/404/` excluded; channel-level `<atom:link rel="self">`; head `<link rel="alternate">` on every page for auto-discovery. |
| Callouts (GitHub alert syntax)                                                     | done     | `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]` blockquotes render as labelled panels via a rehype plugin. Editorial-calm styling: 3px left rule + uppercase eyebrow + faint type-color tint. Tokens (`--callout-{type}-{fg,bg}`) live in style.css and pull from STYLES.md palette ramps via `pnpm extract-tokens`. |
| MDX rendering                                                                      | deferred | `.md` only in v1.                                                                                                                                                                              |
| Multiple bundled templates                                                         | deferred | One default for now.                                                                                                                                                                           |
| Live reload                                                                        | deferred | Pairs with `ovellum watch`.                                                                                                                                                                    |
| Plugin API for custom templates                                                    | deferred |                                                                                                                                                                                                |

**Template anatomy**: where the bundled template lives, what format each
piece is in, and how to change the design — see
[`SITE.md` §9a](./SITE.md#9a-template-anatomy).

**Tests:** ~100 vitest cases in `@ovellum/site` (markdown incl. sanitization + callouts + language-label tagging, nav, template, landing incl. imagery-hero variant + scene interleaving, sitemap, rss, url helpers, page-meta incl. command-injection resistance, icons) plus the `ovellum` CLI suite (URL-scheme allowlist, dev-server path-traversal defense, spawn-based smoke tests, and an in-process **merge-survival golden test** driving parser → generator → reader → merger → orphan-writer end-to-end).

**Coverage:** `pnpm test:coverage` (root-only `vitest.coverage.ts`, `@vitest/coverage-v8`) aggregates the whole workspace into one report — baseline ~65% lines / 76% branches. The CLI command layer and `site/build.ts` read low only because the spawn-based smoke tests run them in a subprocess v8 can't instrument; they are exercised, not uncovered.

**Security:** sanitization policy, shell-out hardening, and URL-scheme allowlist are documented in the [security reference](https://ovellum.oss.oinam.com/docs/reference/security/) (defenses-in-code map in [`DESIGN.md`](./DESIGN.md#where-the-security-defenses-live)).

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
| `404.html` for missing paths                | done     | `content/404.md` builds to `dist/404/index.html` **and** a top-level `dist/404.html` (both emitted by core `ovellum build`), the file GitHub Pages/Netlify/Cloudflare serve for missing paths.         |
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
| Website deploy + PR preview workflows            | done   | `.github/workflows/{deploy-website,website-preview}.yml`. See [`DEPLOY.md`](./DEPLOY.md). (The old `scripts/website-postbuild.mjs` 404 copy was retired once core started emitting `dist/404.html`.)                                                |

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
