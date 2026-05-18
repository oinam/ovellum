# TODO

Living checklist for code / automation work. Update in place as work progresses.
Last updated: 2026-05-18 (CI auto-publish parked — chosen path is local `npm publish`; design polish in flight for manual-mode docs UI)

> Manual items — prose, decisions, releases, things only a human can do —
> live in [`TODO-Human.md`](./TODO-Human.md). When in doubt: if the work
> needs `git`, `pnpm`, or a code edit, it belongs here; if it needs a brain,
> an account, or a real-world action, it goes there.

**Reference docs (kept current alongside code):**

- [`FEATURES.md`](./FEATURES.md) — what works **right now**, status per item, links to where each feature lives.
- [`CONFIG.md`](./CONFIG.md) — every field in `ovellum.config.*` with types, defaults, and effect.
- [`CLI.md`](./CLI.md) — `ovellum` subcommand reference with flags, exit codes, summary output.
- [`GLOSSARY.md`](./GLOSSARY.md) — definitions for anchor, protected zone, orphan, etc.

These four update **in the same commit** as any feature change that touches
them. Design intent stays in [`DESIGN.md`](./DESIGN.md), [`SITE.md`](./SITE.md),
[`STYLES.md`](./STYLES.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Current state (2026-05-18)

**Live and shipped:**
- `ovellum@0.2.0` on npm — <https://www.npmjs.com/package/ovellum>
- Docs site live with TLS — <https://ovellum.oss.oinam.com>
- All six CLI commands working: `init`, `build`, `dev`, `watch`, `serve`, `check`
- Manual-mode static site builder is feature-complete for a real docs site
- 169 vitest cases across the workspace

**Active focus:** manual-mode docs UI polish — tighter, cleaner typography / layout / chrome than Mintlify or Retype, so teams can start writing on Ovellum immediately. Tracked further down this file under Phase 4.5.

**Parked / deferred:**

1. **CI auto-publish — parked.** `.github/workflows/release.yml` was rewritten on 2026-05-18 to do version-PR opening only; `npm publish` is run locally. History: prior CI attempts 404'd on `PUT https://registry.npmjs.org/ovellum` even with a granular token scoped Read+Write, bypass-2FA, exact-package (confirmed via `npm access list packages`). Suspected cause: `actions/setup-node@v4`'s `registry-url` writes a `~/.npmrc` that conflicts with `changesets/action@v1`'s own auth setup. Not worth chasing right now — local publish works, costs ~30s after each version-PR merge. **If we revisit:** drop `registry-url` from setup-node and / or add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to the workflow env. Manual recipe: `docs/internal/TODO-Human.md` → Release & launch.

2. **`@ovellum/*` workspace deps are bundled into `ovellum` at build time** (tsup `noExternal: [/^@ovellum\//]`). Internal packages stay private. Templates copied from `packages/site/src/templates` to `packages/cli/dist/templates` by `scripts/cli-copy-templates.mjs` because `@ovellum/site` resolves templates via `import.meta.url`. If anyone asks for direct `@ovellum/*` imports, the bundling decision needs to flip.

3. **Plugin API for templates is deferred** — multi-day scope; deserves its own design pass. Page-level Nord/Solarized themes (palettes are in `STYLES.md`) are also deferred; `site.codeTheme` ships the code-block theme picker today.

**npm token** is still valid (~mid-Aug 2026), but unused by CI now. Local publish uses the maintainer's `oinam` npm session.

**Where to find things:**
- Public docs source: `website/content/`
- Internal design docs: `docs/internal/{DESIGN,SITE,STYLES,DEPLOY,SECURITY}.md`
- The four "what is" reference docs that update in step with code: `docs/internal/{FEATURES,CONFIG,CLI,GLOSSARY}.md`
- Site builder package: `packages/site/`
- CLI: `packages/cli/`

---

## Phase 0 - Repository & Tooling Setup

- [x] Confirm project name (check npm availability: `ovellum`, `folia`, `meld`, `strata`)
- [x] Create GitHub repository (public, MIT license)
- [x] Initialize monorepo with `pnpm workspaces`
- [x] Set up Turborepo (`turbo.json` with `build`, `test`, `lint`, `typecheck` pipelines)
- [x] Add root `tsconfig.json` (strict mode, ESM, Node 20+)
- [x] Configure ESLint (`typescript-eslint` flat config + `eslint-config-prettier`)
- [x] Configure Prettier (`.prettierrc`)
- [x] Set up `changesets` for versioning and changelog
- [x] Add `.editorconfig`
- [x] Add `.nvmrc` / `.node-version` pinned to Node 20 LTS (Node 18 reached EOL in April 2025)
- [x] Create `packages/` directory stubs: `core`, `parser`, `generator`, `merger`, `reader`, `cli`
- [x] Scaffold each package with its own `package.json`, `tsconfig.json`, `src/index.ts`
- [x] Configure `tsup` build in each package
- [x] Wire up `pnpm build`, `pnpm test`, `pnpm typecheck` via Turborepo
- [x] Set up GitHub Actions: `ci.yml` (lint + typecheck + test + build on PR, matrix Node 20 + 22)
- [x] Set up GitHub Actions: `release.yml` (changesets publish on main merge)
- [x] Add issue templates: bug report, feature request
- [x] Add `PULL_REQUEST_TEMPLATE.md`
- [x] Write initial `CONTRIBUTING.md`
- [x] Write initial `README.md`
- [x] Add `LICENSE` (MIT)
- [x] Add `.gitignore` (node_modules, dist, `.ovellum/cache`, NOT `.ovellum/orphans`)

---

## Phase 1 - Core Types & Config (`@ovellum/core`)

- [x] Define all IR types (`DocNode`, `DocFile`, `DocProject`, `DocParam`, `DocReturn`) - see DESIGN.md §6
- [x] Define `OvellumConfig` type with full schema - see DESIGN.md §7
- [x] Define `ProtectedBlock` and `ManualDoc` types for merger
- [x] Define `OrphanRecord` type (metadata stored in quarantine files)
- [x] Implement `defineConfig()` helper (re-exports user config with type safety)
- [x] Implement config loader using `c12`
  - [x] Load `ovellum.config.ts` / `.js` / `.json` from project root
  - [x] Support per-directory config merging (child wins on conflict)
  - [x] Support frontmatter `ovellum:` block as per-file override
  - [x] Validate config against schema; throw descriptive errors on invalid input
  - [x] Apply defaults for all optional fields
- [x] Export `OvellumError` base class for typed error handling
- [x] Write unit tests for config loader (valid config, invalid config, defaults, merge)

> Phase 0 build note (encountered during Phase 1 & 2): tsup's `dts: true` rolls up
> declarations using its own pipeline and chokes on `composite: true` projects
> with multi-file imports (TS6307 "not listed within the file list of project").
> Resolved by switching each multi-file package to `tsup && tsc -b --force` with
> `emitDeclarationOnly: true` and `tsBuildInfoFile: "./dist/.tsbuildinfo"`. The
> `--force` flag is required because tsup's `clean: true` wipes the tsbuildinfo
> mid-build, leaving tsc unable to tell what changed. Pattern applied to: core,
> parser, generator, cli. `reader` and `merger` still ship the original `tsup`
> with `dts: true` (their stubs are single-file).

---

## Phase 2 - Source Parser (`@ovellum/parser`)

- [x] Install and configure `ts-morph`
- [~] Set up project loader (accepts inline compiler options only; tsconfig.json path passthrough deferred)
- [x] Implement file discovery (respects `include` / `exclude` globs from config)
- [~] Implement symbol extractors:
  - [x] `function` declarations (name, params, return type, generics, JSDoc) — overloads deferred
  - [x] `class` declarations (methods, properties, extends, implements, JSDoc) — constructor extraction deferred
  - [x] `interface` declarations (name, properties + methods, extends, JSDoc)
  - [x] `type` alias declarations (name, definition, JSDoc)
  - [x] `enum` declarations (name, members with values, JSDoc)
  - [ ] `const` / `let` / `var` (exported only, unless `includeInternal`)
  - [~] Module-level JSDoc (`@module` tag) — extracted but only when attached to first statement
- [~] Implement JSDoc tag parser:
  - [x] `@param`, `@returns` / `@return`
  - [x] `@throws` / `@exception`
  - [x] `@example`
  - [x] `@deprecated`
  - [x] `@since`, `@see`
  - [x] `@remarks`, `@description`
  - [x] `@preserve` (flag on DocNode)
  - [x] `@internal` (flag on DocNode)
  - [x] Unknown tags → `tags` bag
- [x] Implement anchor ID generator (`{relativeFilePath}::{symbolPath}`)
- [x] Implement export filter (respect `isExported`, `includeInternal`, `includePrivate` flags)
- [ ] Handle edge cases:
  - [ ] Re-exports and barrel files (warn on duplicates, deduplicate by anchor ID)
  - [ ] Circular imports (warn and continue; partial IR acceptable)
  - [ ] Overloaded functions (collapse to single DocNode with union signatures)
  - [ ] Namespace exports (warn; skip in v1)
  - [ ] `declare module` augmentations (warn; skip in v1)
- [x] Return fully typed `DocProject` IR
- [~] Write unit tests:
  - [x] Each symbol type — smoke test only, full per-tag coverage TBD
  - [x] Exported vs. non-exported filtering
  - [x] `@internal` / `@preserve` flags
  - [ ] Anchor ID stability (formal test)
  - [ ] Overloads
  - [ ] Edge cases (re-exports, circular, empty file)

> Phase 2 v0 slice (2026-05-13): the parser handles enough of TS to power the
> `pnpm demo` end-to-end. Deferred: const/let/var extraction, function
> overloads, re-exports/barrels, circular imports, namespace handling. See
> `examples/simple-ts/` for what currently parses cleanly.

---

## Phase 3 - Markdown Generator (`@ovellum/generator`)

- [x] Accept `DocProject` IR + config, return `Map<filePath, string>` (output path → Markdown content)
- [x] Implement output path mapping (`src/utils/format.ts` → `docs/utils/format.md`)
- [~] Implement per-file Markdown builder:
  - [x] File-level frontmatter (`title`, `source`, `generated`, `ovellum: true`)
  - [x] Module description (from `@module` JSDoc) — rendered when present
  - [x] Section per exported symbol
- [~] Implement per-symbol Markdown templates:
  - [x] `function`: signature code block, description, params table, returns, throws, examples
  - [~] `class`: signature, description, methods + properties tables — constructor section deferred
  - [x] `interface`: signature, description, members table
  - [x] `type`: definition code block, description
  - [x] `enum`: members table with values
  - [ ] `variable`: type + description
- [ ] Implement `_index.md` / sidebar table of contents generator
- [ ] MDX output mode: emit `.mdx`, detect JSX in `@example` blocks, warn user (path mapping done; detection TBD)
- [~] Handle `@deprecated` symbols: blockquote callout (full styled callout TBD)
- [ ] Handle `@since`: add "Since: vX.X" note
- [ ] Handle `@see`: add "See also" section with links
- [x] Attach anchor comments to each section for merge engine targeting:
  - [x] `<!-- ovellum:anchor id="{anchorId}" generated="{timestamp}" -->`
- [~] Write unit tests:
  - [x] Function rendering smoke test (frontmatter, signature, params, returns, example)
  - [x] Output path mapping (md + mdx)
  - [x] Multi-file emission
  - [ ] Class, interface, type, enum dedicated tests
  - [ ] MDX mode tests
  - [ ] Deprecation callout test
  - [ ] TOC generation tests

> Phase 3 v0 slice (2026-05-13): output is clean for functions/classes/
> interfaces/types/enums against `examples/simple-ts/`. Deferred: sidebar
> generation, MDX JSX detection, variable rendering, dedicated callout styling.

---

## Phase 4 - Manual Doc Reader (`@ovellum/reader`)

- [~] Install `unified`, `remark`, `remark-parse`, `remark-stringify`, `gray-matter`, `remark-mdx` — only `gray-matter` installed; regex was enough for tag extraction. Pull in the remark stack when validation mode lands.
- [x] Implement file reader: accepts a file path, returns `ManualDoc`
- [x] Implement frontmatter extractor (using `gray-matter`)
- [~] Implement protected zone extractor:
  - [x] Find all `<!-- @manual:start -->` / `<!-- @manual:end -->` pairs
  - [x] Extract `id` attribute if present; generate positional fallback if not
  - [x] Warn when positional fallback used
  - [x] Store: `{ id, content: string, startLine, endLine, anchorId? }`
  - [x] Detect and error on unclosed tags
  - [x] Detect and error on nested tags
- [x] Implement anchor association: map each protected block to the nearest preceding `<!-- ovellum:anchor id="..." -->` comment
- [ ] Validate mode: in `manual` mode only, also run:
  - [ ] Internal link checker (relative `[text](./path.md)` links that resolve to nothing)
  - [ ] Missing required frontmatter fields (configurable list)
  - [ ] Malformed protected zone tags
- [x] Return `ManualDoc` with full protected zone map
- [~] Write unit tests:
  - [x] Protected zone extraction (with ID, without ID)
  - [x] Unclosed tag error
  - [x] Nested tag error + stray `@manual:end`
  - [x] Frontmatter parsing
  - [x] Anchor association (single + multiple)
  - [ ] Link validation (manual mode) — deferred with validation mode

> Phase 4 v0 slice (2026-05-14): reader handles enough of the spec to feed
> the merger. Validation mode (link checking, required frontmatter fields)
> remains deferred. Positional-fallback warning landed 2026-05-18.

---

## Phase 4.5 - Manual-Mode Static Site Builder (`@ovellum/site`)

New phase introduced 2026-05-15. Design lives in [`SITE.md`](./SITE.md).

- [x] Scaffold `@ovellum/site` (tsup + tsc -b --force pattern; ESM-only due to `import.meta.url`)
- [x] Add `site` sub-config to `OvellumConfig` (title, description, baseUrl, defaultTheme, footer) + merge / validate / defaults
- [x] Markdown → HTML pipeline (unified + remark-parse + remark-rehype + rehype-slug + rehype-autolink-headings + rehype-stringify)
- [x] Shiki dual-theme code-block highlighting (github-light + github-dark via CSS variables)
- [x] Heading collection for the right-side "On this page" ToC (h2/h3)
- [x] Auto-generated sidebar from the file tree (with optional `_meta.json` per directory for title + order)
- [x] Default template (HTML shell, sidebar, content, right ToC, footer, top bar with theme toggle)
- [x] Stylesheet hand-ported from `STYLES.md` Tier 1 + Tier 2 default-light / default-dark
- [x] Client JS: theme toggle (auto → light → dark) + copy buttons on code blocks
- [x] buildSite() orchestrator: discovers `.md`, renders, writes pretty URLs (`name/index.html`), copies static assets, writes `assets/ovellum.{css,js}`
- [x] CLI manual-mode wiring: `ovellum build` routes to `buildSite()` when `config.mode === 'manual'`
- [x] `examples/manual-site` fixture (5 pages, nested guides/, `_meta.json` ordering)
- [x] `pnpm -w run demo:site` end-to-end
- [x] Smoke tests: 11 tests across markdown.ts, nav.ts, template.ts
- [ ] Token-extraction script: pull current `STYLES.md` values into `style.css` automatically (avoid manual resync)
- [ ] Nord + Solarized themes wired into the theme switcher (palettes already in STYLES.md)
- [x] `_meta.json` title fallback for directories without their own `index.md` — already implemented in `buildNav`'s title resolution chain (`meta.title > indexNode.title > kebab segment > 'Untitled'`); the live website (no index.md in any of `concepts/`, `guides/`, `reference/`) relies on it. Behavior pinned by two explicit tests in `packages/site/src/__tests__/nav.test.ts`.
- [x] Search (Pagefind integration as a separate package or `--search` flag)
- [x] Sitemap.xml + RSS
- [x] Search via Pagefind (`site.search.enabled`; client + indexer)
- [x] Sitemap.xml (auto-emitted when `site.baseUrl` set; basePath-aware)
- [x] `site.basePath` (Jekyll-style sub-path hosting)
- [x] `site.editUrlPattern` per-page edit link
- [x] Breadcrumbs above the article on nested pages
- [x] Per-page meta line (reading time + last-modified via `git log` → mtime)
- [x] Print stylesheet (`@media print`)
- [x] Custom 404 layout (`/404/` → `body.ov-body-404`)
- [x] Topbar redesigned (right-aligned `site.topbarNav` + mobile sheet)
- [x] Lucide-backed icon registry (`renderIcon(name, opts)`)
- [x] Hero with dotted-noise SVG pattern + radial accent spotlight
- [x] Cmd/Ctrl+K to focus search + platform-aware kbd hint
- [x] Live reload via SSE (paired with `ovellum dev`)
- [x] `site.codeTheme: 'github' | 'nord' | 'solarized'`
- [x] HTML sanitization (rehype-raw + rehype-sanitize before shiki)
- [x] Body type tightened to 15→16 px (Option A)
- [ ] Page-level Nord + Solarized themes (palettes in STYLES.md; `codeTheme` ships but a full Tier-2 page theme switcher is still TODO)
- [ ] Token-extraction script: pull current `STYLES.md` values into `style.css` automatically
- [x] `_meta.json` title fallback for directories without their own `index.md` — already implemented in `buildNav`'s title resolution chain (`meta.title > indexNode.title > kebab segment > 'Untitled'`); the live website (no index.md in any of `concepts/`, `guides/`, `reference/`) relies on it. Behavior pinned by two explicit tests in `packages/site/src/__tests__/nav.test.ts`.
- [x] RSS feed auto-emit
- [ ] MDX rendering via `remark-mdx`
- [ ] Plugin API for custom templates (deferred — needs its own design pass)
- [ ] Multi-version / multi-language docs

> Phase 4.5 v0 (2026-05-15): a Jekyll-style static site can be built from
> a folder of Markdown files with `ovellum build` (mode: manual). Demo at
> `examples/manual-site/`.
>
> Phase 4.5 v1 (2026-05-17): feature-complete for a real docs site — search,
> sitemap, basePath, breadcrumbs, page-meta, print, 404, redesigned topbar
> with Lucide icons, hero artwork, Cmd+K, live reload via `ovellum dev`,
> code-theme picker, HTML sanitization. 73 vitest cases in `@ovellum/site`.

### Phase 4.5 follow-up: landing page (2026-05-16)

Configurable landing / homepage rendered at `/` when enabled. Inspired by
Material for MkDocs. Disabled by default.

- [x] `OvellumLandingConfig` type + DEFAULT_CONFIG + merge + validate in `@ovellum/core`
- [x] `renderLanding()` in `@ovellum/site/src/template.ts` (hero + feature grid + pitch + trust strip)
- [x] `buildSite()` detects `site.landing.enabled`; reads optional `content/_landing.md` body; writes landing to `dist/index.html`; warns + skips `content/index.md` when present
- [x] Topbar gains a Docs link via `site.landing.docsHref` (falls back to first sidebar child)
- [x] CSS: `.ov-hero`, `.ov-hero-title`, `.ov-cta-row`, `.ov-cta--primary/--secondary`, `.ov-feature-grid`, `.ov-feature-card`, `.ov-pitch`, `.ov-trust`, responsive collapses
- [x] `examples/manual-site` switched to demo the landing
- [x] 7 vitest cases for the landing renderer
- [x] Docs updated: CONFIG.md (§4 `site.landing`), FEATURES.md, GLOSSARY.md (Landing page / Hero / CTA / Feature card / Trust strip / `_landing.md`), SITE.md (§2a)
- [ ] Multiple bundled landing templates / hero variants
- [ ] Live GitHub stars / sponsor APIs in trust strip
- [ ] Image / video hero variants

### Phase 4.6 - Official website + GitHub Pages deploy (2026-05-16)

Ovellum dogfooded against itself. Lives in [`website/`](../../website/);
deploy design in [`DEPLOY.md`](./DEPLOY.md).

- [x] `website/ovellum.config.json` with landing config (hero + 6 features + trust strip)
- [x] `website/content/_landing.md` (Why-Ovellum pitch)
- [x] 14 doc pages: getting-started, install, concepts/{modes, anchors-and-zones, orphans}, guides/{manual-mode, hybrid-mode, themes, deploy}, reference/{config, cli, glossary}, contributing
- [x] `website/content/404.md` → `dist/404/index.html`; post-build script copies to `dist/404.html` for GH Pages
- [x] `website/content/CNAME` (custom-domain marker) — passes through to `dist/CNAME`
- [x] `pnpm -w run build:website` + `build:website:clean`
- [x] `.github/workflows/deploy-website.yml` (push to `main` → build → upload artifact → deploy-pages)
- [x] `.github/workflows/website-preview.yml` (PR build → artifact upload; no deploy)
- [x] Concurrency cancellation (`group: pages, cancel-in-progress: true`)
- [x] pnpm + Node 20 caching
- [x] `docs/internal/DEPLOY.md` internal-design doc + user-facing `website/content/guides/deploy.md`
- [x] `site.basePath` config (documented in `guides/deploy.md` Hosting-under-a-subpath section)
- [x] Pagefind search wired into the website (`site.search.enabled: true` in `website/ovellum.config.json`)
- [x] Sitemap.xml auto-emit (basePath-aware)
- [x] DNS + cert verified live at <https://ovellum.oss.oinam.com>
- [x] Cloudflare grey-cloud DNS setup documented in `guides/deploy.md`
- [x] `reference/security.md` public page (HTML sanitization, command-injection resistance, URL allowlist)
- [x] `guides/development.md` (init → dev → check → build workflow)
- [x] RSS auto-emit
- [x] Lighthouse CI workflow — informational only; uploads report as PR artifact, doesn't gate merges

> Phase 4.6 v0 (2026-05-16): the site builds locally (`pnpm -w run build:website`)
> with 15 pages and zero warnings. Deploy workflow committed.
>
> Phase 4.6 v1 (2026-05-17): live at <https://ovellum.oss.oinam.com> via
> GH Pages + Cloudflare DNS (grey cloud, Let's Encrypt cert from GH).
> 16 published pages. `ovellum check` on the rebuilt site reports 0 broken
> links, 0 unsafe schemes.

---

## Phase 5 - Merge Engine (`@ovellum/merger`)

- [x] Implement `merge(generated: string, manual: ManualDoc): MergeResult`
- [x] Parse generated content into sections keyed by anchor ID
- [x] For each anchor section:
  - [x] Look up anchor ID in `manual.protectedBlocks`
  - [x] If found: splice protected block at the end of the anchor's section (right before the next heading)
  - [x] Mark block as "placed"
- [x] Collect unplaced protected blocks → these are orphans
- [x] Implement orphan handler:
  - [x] Write `OrphanRecord` to `.ovellum/orphans/{YYYY-MM-DD}_{anchorId}.md`
  - [x] Include full metadata header (source file, anchor ID, manual block ID)
  - [ ] Anchor last-seen timestamp (deferred — needs a persisted IR history store)
  - [x] Collect all orphan paths → returned via CLI summary; `MergeResult.orphans[]` carries the records
- [x] Implement `MergeResult` with `content`, `orphans`, `warnings`
- [ ] Implement `ovellum orphans` subcommand (Phase 6 still has it open)
- [ ] Handle `@preserve`-tagged source symbols:
  - [ ] Generator emits protected zone wrappers around `@preserve` content automatically
  - [ ] Merger treats them identically to `<!-- @manual:start -->` blocks
  - Note: the IR already carries `isPreserved`; just needs generator wiring
- [~] Write unit tests:
  - [x] Protected block survives regeneration
  - [ ] Protected block without ID (positional fallback) — needs dedicated test
  - [x] Orphan is quarantined when anchor disappears
  - [x] Orphan file has correct metadata
  - [x] Multiple protected blocks per file (same anchor)
  - [ ] Merge output validated as Markdown (dedicated test deferred)
- [ ] Write integration tests (fixture-based - see Phase 7)

> Phase 5 v0 slice (2026-05-14): the merger handles the canonical case end
> to end — manual block survives regeneration, orphans are quarantined to
> `.ovellum/orphans/` with full metadata. Deferred: `ovellum orphans`
> subcommand, `@preserve`-driven auto-wrapping in the generator, anchor
> last-seen tracking.

---

## Phase 6 - CLI (`ovellum`)

- [x] Install `citty` for CLI framework
- [x] Implement `ovellum build` (manual / hybrid / auto). Summary lines per mode. Exit codes 0/1/3.
- [x] Implement `ovellum init` (interactive scaffolder via `@inquirer/prompts`; `--yes` for non-interactive)
- [x] Implement `ovellum watch` (chokidar + 300 ms debounce; dispatches to manual / auto / hybrid via shared `runBuild` helper)
- [x] Implement `ovellum check` (broken-link + unsafe-URL-scheme lint; manual walks input, auto/hybrid walks output)
- [x] Implement `ovellum dev` (manual-only — build + watch + serve + live-reload via SSE)
- [x] Implement `ovellum serve` (pure static server for `dist/`)
- [x] CLI smoke tests (8 spawn-based vitest cases in `packages/cli/src/__tests__/cli-smoke.test.ts`)
- [x] Wire `bin.ovellum` in `packages/cli/package.json`
- [ ] Implement `ovellum orphans`:
  - [ ] List mode (default)
  - [ ] `--stale` flag
  - [ ] Interactive reattach / delete (optional `--interactive` flag)
- [ ] Implement `ovellum clean`:
  - [ ] Identify and remove auto-generated files (by `ovellum: true` frontmatter)
  - [ ] Preserve manual-only files
  - [ ] Dry-run mode by default; `--confirm` to actually delete
- [ ] `ovellum dev` for auto / hybrid (today manual-only; auto/hybrid produce `.md` so there's nothing to live-reload but a "rebuild on TS change" loop would still be useful — overlaps with `watch`)
- [ ] Add `--strict` global flag
- [x] `--config` + `--cwd` available on `build`, `check`, `watch`, `dev`, `serve`
- [ ] Add `--verbose` global flag (debug output)
- [ ] Write unit tests for citty argument parsing (smoke tests cover the end-to-end behaviour)

> Phase 6 v0 (2026-05-13): only `ovellum build` was wired.
>
> Phase 6 v1 (2026-05-17): init, build, dev, watch, serve, check all
> implemented and tested. `orphans` and `clean` remain deferred (no
> blocker — surface area on top of features that exist). Workspace test
> count: 169.

---

## Phase 7 - Integration Tests & Fixtures

- [ ] Set up integration test runner (Vitest, runs `ovellum build` via `execa` against fixtures)
- [ ] Create fixture: `auto-simple` - basic TS file, pure auto mode, verify output
- [ ] Create fixture: `manual-passthrough` - only .md files, manual mode, verify unchanged
- [ ] Create fixture: `hybrid-protected-survives` - protected zone intact after regeneration
- [ ] Create fixture: `hybrid-orphan-quarantine` - anchor deleted, block quarantined, file written
- [ ] Create fixture: `hybrid-no-id-fallback` - protected zone without `id`, positional fallback
- [ ] Create fixture: `hybrid-preserve-tag` - `@preserve` JSDoc tag in source
- [ ] Create fixture: `frontmatter-mode-override` - file uses `ovellum: { mode: manual }`
- [ ] Create fixture: `class-full` - class with constructor, methods, properties
- [ ] Create fixture: `interface-type-enum` - interface, type alias, enum
- [ ] Create fixture: `barrel-file` - re-exports, verify deduplication
- [ ] Create fixture: `deprecated-symbols` - `@deprecated` tags in output
- [ ] Create fixture: `mdx-output` - MDX format config
- [ ] Create fixture: `strict-mode` - orphans present, verify exit code 2
- [ ] All fixtures produce deterministic output (timestamps mocked in tests)

---

## Phase 8 - Documentation & Self-Hosting

Code-side scaffolding for self-hosting. The actual prose authorship for
`README.md`, `CONTRIBUTING.md`, and the `docs/*.md` pages lives in
[`TODO-Human.md`](./TODO-Human.md).

- [ ] Wire `ovellum build` against the repo itself: root `ovellum.config.ts` pointing at `packages/*/src/`, output to `docs/api/`
- [ ] Verify `ovellum build` on itself produces clean output (CI step)
- [ ] Once `docs/api/` generates cleanly, link it from `docs/getting-started.md`
      (the manual page lands via `TODO-Human.md`)

---

## Phase 9 - Pre-release Polish

Automated polish only. Manual smoke-tests, release notes, npm publish, and
announcements are in [`TODO-Human.md`](./TODO-Human.md).

- [ ] Full lint pass across all packages
- [ ] Full typecheck with `--strict` across all packages
- [ ] Coverage report: all packages at 90%+ line coverage
- [ ] Run `ovellum check --strict` on own docs (exit 0)
- [ ] Review all `TODO`, `FIXME`, `HACK` comments in source - resolve or track as issues
- [ ] Run `npm pack` on CLI package locally - verify contents look correct (automated check; the live `npx`-from-tarball smoke test is in TODO-Human)
- [ ] Add an `examples/` integration job that runs `ovellum build` in `auto` and `hybrid` modes and diffs against expected output

---

## Backlog (Post-v1, not scheduled)

- [ ] Plugin API for custom IR transforms and output formats
- [ ] Static site renderer (the hosting platform)
- [ ] Python language support
- [ ] Go language support
- [ ] Rust language support
- [ ] `@ovellum-id` JSDoc tag for stable custom anchor IDs
- [ ] Per-symbol mode override via JSDoc tag
- [ ] Search index generation (Pagefind / Algolia)
- [ ] VS Code extension (protected zone highlighting, source navigation)
- [ ] GitHub App: auto-PR when docs drift from source
- [ ] `ovellum diff` command: show what would change without writing

---

## Open Questions

Code-affecting design questions. Product decisions that block specific
tickets here (clean behavior, watch reload, `@preserve` semantics,
output-in-VCS default) live in [`TODO-Human.md`](./TODO-Human.md) under
"Product decisions". This section will reflect their outcomes once decided.

- [x] Confirm npm package name availability before Phase 0 is done
