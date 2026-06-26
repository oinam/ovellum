# ovellum

## 0.16.0

### Minor Changes

- 1d48e86: Publish Ovellum to the MCP Registry.

  The package now carries an `mcpName` (`io.github.oinam/ovellum`) and the repo
  ships a `server.json` manifest, so the Ovellum MCP server is listed in the
  official [MCP Registry](https://registry.modelcontextprotocol.io). MCP clients
  that browse the registry can discover and install it; the manifest passes the
  `mcp` subcommand so it runs as `npx ovellum mcp`.

## 0.15.0

### Minor Changes

- 7b1bfff: One-step MCP adoption: a Claude Code plugin + cross-tool install.

  Ovellum is now installable as a **Claude Code plugin** that bundles the
  `ovellum-docs` skill and registers the MCP server in one step:

  ```
  /plugin marketplace add oinam/ovellum
  /plugin install ovellum@ovellum
  ```

  For other MCP clients (Cursor, Windsurf, Cline, VS Code), add `ovellum` to the
  tool's MCP config — `{ "command": "npx", "args": ["-y", "ovellum", "mcp"] }`. The
  [Automation guide](https://ovellum.oss.oinam.com/docs/guides/automation/) has
  per-tool snippets.

  Also: `ovellum mcp` is now explicitly excluded from the update-notifier, so
  nothing but JSON-RPC ever reaches stdout when running as a server.

- 0e23a66: MCP server: add Resources and Prompts.

  `ovellum mcp` is now a first-class MCP server, not just a bag of tools. It
  advertises `resources` and `prompts` capabilities alongside `tools`:
  - **Resources** — Ovellum's read surface as pullable context: `ovellum://llms.txt`
    / `ovellum://llms-full.txt` (the AI output), `ovellum://page/{path}` (a built
    page's Markdown), `ovellum://ir` (the IR snapshot), and `ovellum://orphans`.
  - **Prompts** — guided workflows the client surfaces: `set-up-ovellum`,
    `document-symbol` (read a symbol, draft prose, and write it into a protected
    zone that survives regeneration — the differentiator), and `review-doc-drift`.

  Still dependency-free (hand-rolled JSON-RPC, no SDK).

- d860c33: MCP server: add `ovellum_search_docs` and `ovellum_reattach` tools.

  The `ovellum mcp` server gains two tools that round out the agent surface:
  - **`ovellum_search_docs`** — full-text search over the built docs, returning
    ranked pages (path, title, score, snippet). It's a built-in term-frequency
    search over the output Markdown, so it works in every mode with no extra
    runtime.
  - **`ovellum_reattach`** — the non-interactive counterpart of
    `ovellum orphans --reattach`: splice an orphan's prose back into a protected
    zone under a target anchor (defaulting to the suggested present-again /
    renamed one) and remove the archive, or delete the orphan — so an agent can
    rescue orphaned prose after a refactor.

- 26edfb1: Add a programmatic API — drive Ovellum in-process.

  You can now import Ovellum as a library instead of shelling out to the CLI:

  ```ts
  import { build, watch } from 'ovellum';

  const summary = await build({ cwd: 'docs', out: '../site/public/docs', base: '/docs' });
  const watcher = await watch({ cwd: 'docs', onBuild: () => devServer.reload() });
  ```

  - `build(options)` returns the same structured `BuildSummary` the CLI computes.
  - `watch(options)` returns a handle with `close()`; rebuilds are incremental in
    auto/hybrid mode.
  - `loadConfig(options)` returns the resolved config; `defineConfig` and the
    config / summary types are re-exported.

  `import 'ovellum'` is now **side-effect-free** — the CLI is a separate binary, so
  importing the package no longer runs it. This makes it clean to wire Ovellum into
  a framework dev server, a monorepo task runner, or a custom build step. The
  package is ESM-only (`type: module`); use a dynamic `import()` from CommonJS.

## 0.14.0

### Minor Changes

- 8b2e0a9: `ovellum check --strict` — opt-in stricter validation.

  `--strict` adds three checks on top of the defaults (broken links, unsafe URL
  schemes, stale translations):
  - **Positional protected zones** — a `<!-- @manual:start -->` with no `id=`.
    Id-less zones fall back to positional matching, so reordering can lose them.
  - **Stale anchors** — a generated-doc anchor whose symbol no longer exists in the
    source (a delete, or a rename you haven't rebuilt). Rebuild, or reattach the
    prose with `ovellum orphans --reattach`.
  - **Title-less pages** — a page with neither a frontmatter `title:` nor a
    top-level `# heading`.

  Strict issues are tagged `[STRICT]` and counted under `strict issues:` (and
  `counts.strictIssues` in `--json`); they exit `1` like any other issue. It's off
  by default, so existing `ovellum check` behavior is unchanged. The MCP
  `ovellum_check` tool also gains a `strict` option.

- 172af81: Incremental watch builds for auto/hybrid projects.

  `ovellum watch` (and `dev`) used to re-parse the entire project on every
  keystroke. Now, in auto and hybrid modes, the watcher keeps the TypeScript
  parser warm: when you save a file it re-parses only that file, then rebuilds only
  the docs whose content actually changed — much faster once a codebase grows past
  a handful of files.

  It stays correct: the whole project is re-extracted from the warm in-memory AST
  (so a cross-file type change still ripples into every doc that references it),
  the persisted `.ovellum/ir.json` snapshot continues to reflect the whole
  project, and hybrid protected zones are preserved exactly as in a full build.
  Manual-mode sites and config-file changes still do a full rebuild.

  No new flags — it's automatic under `ovellum watch`/`dev`.

- 4d03712: `ovellum orphans --reattach` — interactively rescue quarantined prose.

  When a refactor orphans a protected block, getting the prose back used to be a
  copy-paste chore. `ovellum orphans --reattach` now walks the archive one orphan
  at a time and, for each, offers to:
  - **Reattach** it to a suggested anchor — the same anchor if the symbol is back
    in the source, or a name-similar one if it was likely renamed (or type a
    different anchor id). The prose is spliced into a `@manual` protected zone
    under that anchor, so the next build preserves it, and the archive file is
    removed.
  - **Delete** the orphan (with confirmation), or **skip** it.

  It reads the current anchors from the last build's IR snapshot, so run
  `ovellum build` first; the reattach target is a built doc, so the change lands
  exactly where a rebuild keeps it. This completes the hybrid loop: a rename can
  orphan prose, and now you can put it back in one interactive pass.

- e71c847: `@preserve` auto-wrapping — keep a symbol's docs hand-owned across regeneration.

  Tag a JSDoc comment with `@preserve` (the configurable inline tag) and, in
  **hybrid** mode, Ovellum now wraps that symbol's generated section in a `@manual`
  protected zone automatically. The first build seeds the zone with the generated
  content; after that, anything you edit inside it survives every regeneration —
  the same guarantee as a hand-authored zone — and if the symbol is deleted or
  renamed, the prose is orphaned (to `.ovellum/orphans/`) rather than lost.

  The anchor comment stays outside the zone, so reattach and orphan tracking keep
  working. Class methods are wrapped too; properties (rendered as a table) are
  not. `auto` mode regenerates fully each build, so it emits no zones.

- 8d1e1c5: Add `--verbose` to `build`, `check`, and `diff`.

  `--verbose` prints diagnostic detail — which config was resolved, the build's
  per-stage and file-I/O steps (parse timing, what was generated / written /
  merged, where the IR and manifest landed), the scanned file count for `check`,
  and the snapshot/diff summary for `diff`.

  It writes to **stderr**, so it composes cleanly with `--json` — stdout stays
  pure JSON for tooling while the verbose trace goes to stderr. Handy for figuring
  out why a build picked the wrong config, didn't see a file, or merged
  unexpectedly.

## 0.13.0

### Minor Changes

- 7b31133: Tell AI agents how to use Ovellum: scaffolded `AGENTS.md` + a Claude Skill.
  - `ovellum init` now scaffolds an **`AGENTS.md`** at the project root — the
    cross-tool convention for "instructions to coding agents." It's mode-aware:
    hybrid and auto projects lead with the protected-zone contract (what survives
    regeneration, what gets overwritten, where orphans go) so an agent edits in
    the right place; manual projects lead with "edit the Markdown, never the
    output." Written only if one doesn't already exist.
  - A ready-to-use **Claude Skill** ("set up and maintain Ovellum docs") ships in
    the repo at `skills/ovellum-docs/`. Copy it into `.claude/skills/` and Claude
    Code can scaffold, build, and safely edit Ovellum docs on request.

  Also fixed a stale protected-zone marker in the `init` next-steps hint
  (`<!-- ovellum:manual:start -->` → `<!-- @manual:start -->`).

- a0a4c54: Machine-readable CLI: `--json` on `build` and `check`.

  An agent or CI job shouldn't have to scrape human-formatted output. `build` and
  `check` now take `--json` (joining `diff`, which already had it): stdout becomes
  a single JSON object, with no decorative output and nothing on stderr on
  success.
  - `build --json` → `{ ok, command, mode, durationMs, config, warnings, … }`
    (mode-specific fields for auto/hybrid vs manual).
  - `check --json` → `{ ok, mode, pages, counts, issues[] }`, where each issue is
    `{ file, line, kind, message }`.

  Exit codes are stable across commands — `0` success, `1` issues/build error,
  `3` config error (emitted as `{ ok: false, error, hint }` on the JSON path) — so
  a script can branch without parsing text.

  A new [Automation & AI agents](https://ovellum.oss.oinam.com/docs/guides/automation/)
  guide documents the JSON schemas, exit codes, the MCP server, and the
  AI-friendly output. The `ovellum mcp` server also gains an `ovellum_check` tool,
  sharing the same check implementation.

- 89e817f: Add `ovellum mcp` — drive Ovellum from an AI agent over MCP.

  `ovellum mcp` runs Ovellum as a [Model Context
  Protocol](https://modelcontextprotocol.io) server over stdio, so an agent can
  use it as a first-class tool. It's built into the CLI — no extra dependency to
  install.

  Tools exposed:
  - `ovellum_query_symbol` — look up a symbol by anchor id or name in the IR
    snapshot (signature, source location, params, returns).
  - `ovellum_diff` — added / removed / changed / renamed symbols vs the last
    build, and which docs would change.
  - `ovellum_list_orphans` — quarantined manual blocks, with reattachability.
  - `ovellum_get_page` — the built Markdown for one page (the AI-friendly mirror).
  - `ovellum_build` — run a build and return its summary.
  - `ovellum_write_zone` — **write Markdown into a protected `@manual` zone** under
    an anchor id. The hybrid merge engine preserves it across the next
    regeneration — the one thing no other docs server offers: an agent's prose
    that survives rebuilds instead of being overwritten. Supports `dryRun`.

  Add it to a client, e.g. Claude Code:

  ```bash
  claude mcp add ovellum -- npx ovellum mcp --cwd /path/to/project
  ```

- 90d0424: Add `ovellum orphans` — review quarantined manual blocks.

  When a protected `@manual` block's anchor disappears during a hybrid build, its
  prose is moved to `.ovellum/orphans/` instead of being lost. `ovellum orphans`
  is how you review what's accumulated, without writing anything:
  - Default: lists each orphan's anchor id, the doc it came from, when it was
    orphaned (and how long ago), the last build that still saw the anchor, and —
    when an IR snapshot exists — whether that anchor is **back in the source**
    (reattachable) or **gone**.
  - `--stale` shows only orphans older than `protect.orphanRetention` days
    (default 90) — the quarterly-review filter.
  - `--json` emits the list for CI and tooling.

  Builds also now record when an anchor was last seen: a freshly-orphaned block is
  stamped with the timestamp of the last build that still contained its anchor,
  read from the persisted IR snapshot.

  Reattaching and deleting orphans is still done by hand; an interactive flow is
  planned.

- d41de1f: Add `ovellum diff` — preview what a rebuild would change.

  `ovellum diff` parses your current source and compares it against the IR
  snapshot from the last build (`.ovellum/ir.json`), reporting added, removed, and
  changed symbols plus which output docs they'd touch — without writing anything.
  - Matches symbols by their stable anchor id, so a rename surfaces as a removed
    symbol plus an added one (dedicated rename detection comes later).
  - Ignores edits that only shift line numbers; a change is reported only when the
    documented surface actually differs (signature, params, return, description,
    deprecation, JSDoc tags, export/visibility), including nested class and
    interface members.
  - `--json` emits a machine-readable diff for CI and tooling.
  - `--exit-code` makes it exit `1` when changes are found (git-diff style); by
    default it always exits `0` so it can be run informationally.

  Auto/hybrid only — manual builds parse no source and keep no IR. Run
  `ovellum build` first to record the baseline snapshot.

- d9478d9: Persist the parsed IR after every auto/hybrid build.

  `ovellum build` (and `watch`) now write the parsed `DocProject` to
  `<project>/.ovellum/ir.json` on every `auto` / `hybrid` build — a snapshot of
  the symbols, anchors, and signatures Ovellum just read from your source. The
  file is a small JSON envelope (`{ generator, format, version, project }`) and is
  reported as a new `ir:` line in the build summary.

  It's build _state_, not deploy output: it lives at the project root beside
  `.ovellum/orphans/`, stays there regardless of `--out`, and `.ovellum/` is
  gitignored by the default scaffold. This is the foundation for upcoming
  source-diff, rename detection, and anchor last-seen tracking — and you can read
  it yourself for any tooling that wants a structured view of your API surface.

  Manual-mode builds parse no source and write no IR.

- 8f047ac: Detect likely renames instead of orphaning blindly (suggest-only).

  Refactors are the #1 cause of orphaned manual blocks: rename a symbol and the
  prose tied to its old anchor has nowhere to go. Ovellum now spots this.

  When an anchor disappears and a similar symbol appears the same build — same
  kind, similar name, matching signature shape — the two are paired as a likely
  rename:
  - `ovellum diff` shows a **likely renames** section (with a confidence score),
    lifting the pair out of the raw added/removed lists, and includes `renames` in
    its `--json` output.
  - At build time, when a protected block is orphaned but its anchor probably just
    moved, the build warns: `did src/date.ts::formatDate become
src/date.ts::formatDateUTC? a protected block was orphaned — reattach it under
the new anchor`.

  This is suggest-only — performing the re-attach is still a manual step.

### Patch Changes

- fce6ba4: Security hardening (defense-in-depth; none were exploitable).
  - **Upgrade spawn** — `ovellum upgrade` now runs the package-manager command as
    an argv array **without a shell** on macOS/Linux (the command was already
    built from a fixed allowlist; this removes the shell entirely so a future
    refactor can't reintroduce injection). Windows keeps a shell because its
    `.cmd` shims require one.
  - **Dev/serve server** — `resolveFilePath` now resolves symlinks and re-verifies
    the result stays under the served root (closes a symlink escape on top of the
    existing `..` containment check). Added request/headers timeouts; binding
    stays localhost-only by default.
  - **Site build** — passthrough asset copy skips any path containing `..` or a
    symlink that resolves outside the content directory, with a warning.
  - **`site.headExtra`** — documented as a trust boundary (it's injected verbatim
    by design): admin-only, never derived from untrusted input. Strengthened the
    type JSDoc and the security reference page.
  - **`ovellum init`** — validates prompted content/output directories, rejecting
    absolute paths and `..` segments.
  - **Update check** — the version cache is written with `0o600`; the registry
    fetch uses `redirect: 'error'` and bails on an unexpectedly large response.

## 0.12.0

### Minor Changes

- a1bf832: AI-Ready output + portable deploy-anywhere build.

  **AI-friendly documentation output (`site.ai`).** The manual-mode build now
  emits machine-readable companions alongside the HTML so coding agents and LLMs
  can read the docs cleanly, per the llmstxt.org convention:
  - **`/llms.txt`** — a link-first index of every page (`- [Title](link): summary`)
    in sidebar order. On by default.
  - **`/llms-full.txt`** — the whole docs corpus concatenated as one Markdown
    stream. Off by default (can be large).
  - **per-page `.md` mirror** at `<page>.md` (`/guide/intro/` → `/guide/intro.md`,
    `/` → `/index.md`). On by default; `llms.txt` links point at these mirrors.

  Configured via `site.ai: { enabled?, llmsTxt?, fullText?, mdMirror? }`. Drafts
  and the 404 are excluded (same rule as sitemap/RSS); each locale gets its own
  set on i18n sites. The HTML output is byte-identical — these are additive
  files. Set `site.ai: { enabled: false }` to opt out.

  **Portable, deploy-anywhere build.** `ovellum build` gains:
  - `--out <dir>` — override the output directory per-invocation (point a CI /
    deploy pipeline at any folder, e.g. a repo's `/docs`).
  - `--base <path>` — override `site.basePath` per-invocation.
  - `--manifest` — write `<output>/.ovellum/manifest.json`, a hashed inventory of
    every built file (path, bytes, sha256) for atomic / incremental deploys and
    completeness checks.

  Ovellum builds a portable static folder; the host deploys it however it likes —
  no dependency on GitHub or any specific host.

## 0.11.0

### Minor Changes

- 8d1bf35: Localize the static-site template's **UI chrome** for i18n sites. Every
  hardcoded English string the template renders — "On this page", the "Edited"
  line and its dates, "min read", the appearance-panel labels, prev/next, the 404
  page, back-to-top, breadcrumbs, the draft ribbon, nav aria-labels, and the
  copy-code button — now resolves through a per-locale string table. Built-in
  translations ship for English and Japanese; any other locale falls back to
  English per string, and you can override or add any string via
  `site.locales[].strings`. Dates render with `Intl.DateTimeFormat` for the
  locale, and right-to-left languages get `<html dir="rtl">`.

  Single-language sites are unaffected — output is byte-for-byte identical (no
  `dir` attribute, no injected strings, English chrome throughout).

- 11f5d4f: Localize config-driven landing + navigation text for i18n sites. Any
  user-facing label or copy string in the config — `topbarNav`/`footerNav`
  labels, and the `landing` hero title/subtitle, CTA labels, feature
  titles/descriptions, install titles, and trust-strip text — now accepts a
  per-locale map (`{ 'en-US': '…', ja: '…' }`) in place of a plain string,
  resolved to the current locale (falling back to the default locale). A plain
  string still works and shows in every locale, so you only translate the strings
  you want to. Combined with the chrome-string localization, an i18n site's
  `/ja/` pages can now be fully Japanese end to end.
- 7325cc9: Add an i18n **translation-staleness check** to `ovellum check`. On sites with
  two or more `site.locales`, each translated page carries a `sourceHash` in its
  frontmatter — a fingerprint of the default-locale page it mirrors (matched by
  identical path across the `content/<code>/` folders). `check` recomputes the
  source's fingerprint and flags, tagged `[i18n]`, any translation whose source
  changed since it was stamped (stale), is missing its hash, or has no matching
  source page (orphan). Any of these exits `1`, so CI catches translation drift.

  Run `ovellum check --update-translations` to stamp (or re-stamp) every
  translation's `sourceHash` to the current source after syncing — it touches only
  that one frontmatter line. The fingerprint covers the page body (frontmatter
  excluded) with normalized line endings, so reformatting won't trip a false
  "stale".

### Patch Changes

- 212e889: Fix `ovellum check` reporting false broken internal links on i18n sites. It now
  validates links **per-locale**: each `content/<code>/` subtree builds its own
  locale-prefixed nav, and links are checked against the union of all locales'
  URLs — so locale-prefixed (`/ja/…`), cross-locale (`/docs/…` to the default
  locale), and relative links all resolve correctly. Single-language sites are
  unaffected.
- ccf9ac6: `ovellum upgrade` now prefers the project's local dependency. When the current
  directory's `package.json` declares `ovellum` (in `dependencies`,
  `devDependencies`, or `optionalDependencies`) — or it's already in
  `node_modules` — the upgrade targets the project (`… add -D ovellum@latest`)
  even when you invoke the global binary, instead of silently bumping the
  unrelated global install. For a local upgrade the package manager is taken from
  the project's lockfile (`pnpm-lock.yaml`, `yarn.lock`, …), so a pnpm/yarn
  project upgrades with its own manager even from a bare global binary. The
  "Update available" line now names which install it will touch.

## 0.10.1

### Patch Changes

- 09577d5: Add Markdown **footnotes**. Use the standard GFM convention — a `[^id]`
  reference in the prose and a matching `[^id]:` definition anywhere in the file.
  References render as small superscript markers that link down to a tinted
  footnotes panel at the foot of the page (one type-step below body text), each
  note carries a `↩` link back to where you were reading, and notes are numbered
  by the order references first appear.

  This also fixes a latent bug that broke every footnote jump link: `remark-rehype`
  prefixes footnote id/href pairs with `user-content-` to guard against DOM
  clobbering, but `rehype-sanitize`'s own `clobberPrefix` re-prefixed the `id`s a
  second time (leaving the `href`s untouched), so references and back-references
  pointed at anchors that no longer existed. The sanitizer now keeps the single
  prefix `remark-rehype` already applied, so both ends stay in sync. The
  visually-hidden "Footnotes" label is also kept out of the right-side ToC and
  off the heading-anchor pass.

## 0.10.0

### Minor Changes

- 72cf526: Add a frontmatter **`updated:`** date override for the page "Edited" line. Set
  it (e.g. `updated: 2026-05-20`) to pin the displayed date explicitly, instead of
  relying on git history or filesystem mtime — useful when you want the date to
  reflect a meaningful edit rather than git mechanics (a move, a bulk reformat, a
  fresh checkout). Resolution order is now: frontmatter `updated` → git
  (`git log --follow --diff-filter=AM`) → filesystem mtime. An unparseable
  `updated` value warns and falls back to git.

### Patch Changes

- faaa11d: Fix: the "Edited" date now follows file renames and ignores pure moves, so a
  `git mv` no longer resets every page to "Edited today". The last-modified
  lookup changed from `git log -1` to `git log --follow --diff-filter=AM`, which
  tracks a file across renames and counts only commits that changed its content.
  (Symptom: after reorganizing content — e.g. moving everything into a locale
  folder for i18n — every page read "Edited today" even when unchanged.)

## 0.9.0

### Minor Changes

- 2e626b1: Add **drafts** — work-in-progress pages you preview locally but never publish.

  Mark a page with frontmatter `draft: true`, or a whole folder with
  `_meta.json "draft": true` (cascades to everything inside). Drafts are:
  - **shown in `ovellum dev` / `watch`** with a ribbon across the top
    (_"Draft — visible locally only, never published"_) and a **Draft** badge in
    the sidebar, so work-in-progress is never mistaken for live content, and
  - **excluded from `ovellum build`** (production), which prints how many drafts
    it dropped. They're also kept out of the sitemap and RSS.

  It's automatic by command — no flag to remember — with overrides when you want
  them: `ovellum build --drafts` (include them) and `ovellum dev --no-drafts`
  (preview exactly what production publishes).

  **Behavior change:** previously `draft: true` excluded a page _everywhere_
  (including dev). It now means dev-visible / production-excluded — the standard
  draft model. To exclude a file entirely (never parsed or rendered), use
  `site.ignoreFiles`. See the new **Drafts** guide.

## 0.8.0

### Minor Changes

- d2507d8: Add **multiple-language (i18n) support** to the manual-mode site builder.

  Declare your languages with `site.locales` (and optional `site.defaultLocale`)
  and Ovellum publishes the same site in each:

  ```ts
  site: {
    defaultLocale: 'en-US',
    locales: [
      { code: 'en-US', label: 'English' },
      { code: 'ja', label: '日本語' },
    ],
  }
  ```

  - **Opt-in, zero breakage** — a single-language site (no `site.locales`) behaves
    exactly as before; no locale folders, no migration.
  - **Per-locale content** in `content/<code>/` subtrees, named by BCP 47 tag
    (`en-US`, `ja`, `zh-Hans`). The default locale serves at the **root**
    (`/guide/`); others serve under their code (`/ja/guide/`). Pages map across
    languages by identical relative path.
  - **Language picker** in the topbar (a globe dropdown of each language's
    autonym). Switching takes the reader to the same page in that language, or
    falls back to that locale's home when it isn't translated yet — so partial
    translations are fine.
  - Each page gets `<html lang>`, `hreflang` alternates (+ `x-default`), and a
    per-locale entry in the sitemap. Config-driven nav links (`topbarNav` /
    `footerNav`) are localized to the current locale, so they stay in-language
    (asset and external links are left untouched). The reserved `publicDir` stays
    shared across locales.

  UI/chrome strings (the appearance-panel labels, "Edited", the landing hero) are
  still English for now — translating those is a planned follow-up. See the new
  **"Multiple languages (i18n)"** guide.

### Patch Changes

- f9d82a2: Fix: a breadcrumb crumb for a section folder with no index page now renders as
  plain text instead of a dead link. Previously "Docs › Guides › Page" linked the
  "Guides" crumb to `/docs/guides/`, which isn't generated when the folder has no
  `index.md`/`README.md` — a 404. Real (linkable) section crumbs are unaffected.

## 0.7.0

### Minor Changes

- a4aee0f: Add `site.assetBaseUrl` — serve the reserved `publicDir` from a CDN. When set
  (e.g. `'https://cdn.example.com/site'`), Ovellum stops copying `publicDir` into
  the build and rewrites every reference to a `public/` file in the rendered HTML
  to that base, so `/report.pdf` resolves to
  `https://cdn.example.com/site/report.pdf`. You keep authoring the same
  root-absolute paths — the same idea as Vite's `base` / Next's `assetPrefix`.
  Assets co-located with your content are part of the HTML site and are left
  untouched; only `publicDir` moves to the CDN. (Query-stringed and `srcset` refs
  aren't rewritten — reference those by their final CDN URL.) The "Assets &
  downloads" guide and config reference document it.
- 380fe10: Humanize the page meta date and tidy two appearance details.
  - The last-modified line is relabeled **"Edited"** (from "Updated"), and its
    date is now humanized by default: `today` / `yesterday` for recent edits,
    otherwise a friendly `Jun 14, 2026`. A new **`site.dateFormat`** config
    controls this — `'humanized'` (default) or `'iso'` for the raw `2026-06-14`.
    The machine-readable ISO date always stays in the `<time datetime>` attribute.
  - The **search box** gets a subtle background fill so it reads as a distinct
    field against the page/topbar background, in both light and dark.
  - The font picker's system option is now labeled **"Sans-Serif (Default)"**
    instead of just "Default", so it's clear what the default is.

- fe8cb6c: Allow `<video>` / `<audio>` embeds in Markdown. The HTML sanitizer now permits
  `<video>`, `<audio>`, and their `<source>`/`<track>` children with
  presentational/playback attributes (`controls`, `poster`, `width`, `loop`,
  `muted`, `autoplay`, `playsinline`, …) — so you can embed a native media player
  inline, not just link to the file. `src`/`poster` are still scheme-checked
  (`http(s)`/relative) and event handlers are stripped, so an embed can't carry
  script. New **"Assets & downloads"** guide documents where to put images,
  video/audio, PDFs, and other downloads (co-located vs the `public/` root) and
  how to reference, embed, or link them.
- ed241c9: Add reader **Text size** and **Font** controls to the appearance panel — and
  they ship in the bundled template, so every Ovellum site gets them, not just the
  docs.
  - **Text size** — a five-step scale (two smaller, default in the middle, two
    larger) shown as a graduated "A" ramp, like a Kindle / Safari Reader stepper.
    It scales the whole modular type scale (body + every heading) proportionally.
  - **Font** — Default (system sans) / Serif / Inter / Geist. Inter and Geist are
    variable webfonts **bundled with the template** and served from
    `/assets/fonts/`; their `@font-face` rules are lazy, so a font downloads only
    when a page actually uses it. The default site stays zero-webfont and fast,
    and a custom font costs only on opt-in — no reload, no CDN, no extra config.

  `site.font` now accepts `'inter'` and `'geist'` (in addition to `'sans'` /
  `'serif'`) to set the initial font. Both new controls persist in `localStorage`
  and apply before paint. Existing mode / theme / color controls are unchanged.

- 0954436: Allow scoped `<iframe>` video embeds in Markdown. Paste the embed code straight
  from YouTube or Vimeo ("Share → Embed", verbatim — fixed `width`/`height`,
  `frameborder`, `?si=` and all) and it just works. Ovellum permits `<iframe>`
  **only** from known video hosts (`youtube.com`, `youtube-nocookie.com`,
  `vimeo.com`) and strips any iframe pointing elsewhere (or at a
  relative/`javascript:` src). Survivors are hardened automatically —
  `loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`,
  `allowfullscreen` — and wrapped in a responsive 16:9 frame that overrides the
  snippet's pixel dimensions. Native `<video>` / `<audio>` embeds are unchanged.
  The new **Styleguide** reference page
  (`/docs/reference/styleguide/`) documents the type scale, vertical rhythm, and
  color system and renders every content element — headings, prose, lists,
  callouts, code, tables, images, and a live video embed — as a working showcase.

## 0.6.0

### Minor Changes

- 68fab9c: Configurable back-to-top, and a fully-commented config from `ovellum init`.
  - **`site.backToTop`** — `{ enabled, threshold }`, default `{ enabled: true,
threshold: 360 }` (was a hardcoded 600px). Lower the threshold so the button
    appears sooner on short-page sites, or set `enabled: false` to remove it.
  - **`ovellum init` now scaffolds a fully-annotated `ovellum.config.ts`** (was a
    minimal `.json`): every option is present — the ones you chose are set, the
    rest are commented with their defaults and allowed values — so you can tinker
    entirely in that file without opening the docs. It uses
    `import type { OvellumUserConfig } from 'ovellum'` + `satisfies` (erased at
    load, so no runtime dependency). The existing-config guard now recognizes any
    `ovellum.config.{ts,js,mjs,cjs,json}`.

- fb520e3: Footer "Built with Ovellum" credit link, controlled by `site.credit` (default
  `true`). It renders a small credit link to <https://ovellum.oss.oinam.com> in
  the footer; set `site.credit: false` to remove it entirely — crediting is
  appreciated but never required. `site.footer` now defaults to `''` (the credit
  is the default attribution; set `footer` for your own copyright line).
- 2fbd4b8: README-as-index everywhere, more frontmatter, and a reserved `public/` assets dir.
  - **`README.md` is the folder index at every level** (was root-only). A folder
    resolves its page to `index.*` first, then `README.md` — the GitHub norm. To
    keep this consistent, `build` now derives page URLs from the nav, so the
    emitted files always match the sidebar/links.
  - **Frontmatter `permalink`** overrides a page's URL (normalized to a
    root-absolute, trailing-slash path); **`tags`** become `<meta name="keywords">`.
    (`title` and `description` were already respected.)
  - **`site.publicDir`** (default `'public'`) — a **reserved** static-assets folder
    copied to the **output root**, the SSG convention (Next/Astro/Vite/Hugo):
    `public/favicon.ico` → `/favicon.ico`. Use it for root-served files (favicon,
    `robots.txt`, `CNAME`, OG images) and other static assets. Nothing inside is
    processed (no pages, no sidebar; even a `.md` is copied as-is). Renamable via
    config; static files outside it still pass through keeping their path.

    **Breaking:** previously `content/public/` was copied to `dist/public/`; it now
    copies to the output **root**. Drop the `/public` prefix from any references
    (e.g. `/public/logo.svg` → `/logo.svg`), or set `site.publicDir` to a different
    folder name to keep path-preserving passthrough behavior for that folder.

### Patch Changes

- 09c858a: Sidebar hierarchy polish: sub-items are now indented a little under their
  category to show nesting, and a folder's heading is **bold like every other
  category even when it has its own `index.md`** (it becomes a bold, clickable
  category heading rather than a plain link).

## 0.5.1

### Patch Changes

- d8fd1af: Fix the sidebar scroll-restore (shipped in 0.5.0 but inert). It read
  `.offsetHeight` off a `getBoundingClientRect()` result (a `DOMRect`, which only
  has `.height`), so the scroll offset computed to `NaN` and the sidebar never
  moved — long nav menus still snapped back to the top on navigation. Now the
  active link is centered in the sidebar viewport on load as intended.

## 0.5.0

### Minor Changes

- 4879ee0: Collapsible sidebar folders, collapsed by default.

  Each sidebar folder is now a no-JS `<details>` disclosure with a chevron that
  rotates on open. Folders are **collapsed by default** — the branch containing
  the current page stays open so the active item is always visible. Set
  `site.sidebar.collapse: false` to render the whole tree auto-expanded.

- 662f770: More manual-mode dogfooding fixes:
  - **Home page resolution.** `/` now resolves automatically to `site.home`
    (explicit), else root `index.md`, else a root **`README.md`** — so an
    existing repo README becomes the docs home with no config. The file renders
    at `/` (not `/README/`); opt out by adding `README.md` to `ignoreFiles` or
    pointing `site.home` elsewhere.
  - **`ovellum dev`/`watch` rebuild loop fixed.** The watcher no longer watches
    the output dir, `node_modules`, dot-dirs, or `ignoreFolders` — under
    `input: "."` it was rebuilding endlessly (each build wrote `dist/`, which
    re-triggered the watch).
  - **Sidebar keeps its place.** On navigation the sidebar now scrolls the active
    link into view instead of resetting to the top (matters with a long nav).
  - **Per-folder sidebar collapse.** A folder's `_meta.json "collapse"` overrides
    the global `site.sidebar.collapse` (`false` = always open, `true` = always
    collapsed).

- 662f770: Manual-mode fixes from dogfooding an `input: "."` site: consistent file/folder
  exclusion across `build` and `check`, and a theme-persistence fix.
  - **`check` now honors the same exclusions as `build`.** Previously `ovellum
check` walked `node_modules` and reported bogus "broken links" inside
    dependency READMEs. Exclusion logic is now centralised (`content-filter.ts`)
    and shared by `build`, the nav builder, and `check`.
  - **`site.ignoreFiles` (globs)** — exclude individual files (Markdown pages and
    passthrough assets), e.g. `["README.md", "drafts/**"]`. Supports `*`, `**`,
    `?` with gitignore-style basename-vs-path matching.
  - **Auto-excludes for `input: "."`** — dotfiles, `node_modules`, package
    manifests/lockfiles, the `ovellum.config.*`, and the **output dir itself**
    are always skipped, so project files no longer leak into the build and the
    output dir can't recurse into itself on rebuild. No config needed.
  - **Theme persistence:** picking the default ("Ovellum") palette now persists
    across navigation. It was stored as "no override", which reverted to a
    configured non-default `site.palette` (e.g. `"eink"`) on the next page.

- 068aee7: Optional brand logo, configurable favicon, and an always-generated 404.
  - **`site.logo` is now optional and no longer hardcoded.** Earlier builds
    embedded Ovellum's own brand mark into every site's topbar; that's gone.
    Set `site.logo` to a path/URL for a brand mark (rendered as a theme-flipping
    monochrome silhouette via a CSS mask) — leave it unset and the site title
    stands alone.
  - **`site.favicon`** — a `<link rel="icon">` is emitted on every page,
    defaulting to a root `/favicon.ico` (drop one at your project root and it
    works) and overridable to any path/URL. basePath-aware.
  - **Every build now ships a 404 page.** If you don't write `content/404.md`,
    Ovellum generates a default "Page not found" that matches the template. Both
    `dist/404/index.html` and a root `dist/404.html` are emitted (the default 404
    is infrastructure, so it isn't counted in the build's page total).

## 0.4.0

### Minor Changes

- 867c540: Topbar appearance control with page-wide theme palettes and a custom accent.

  The single light/dark cycle toggle is replaced by a palette-icon popover
  (inlined into the mobile menu sheet) with three controls:
  - **Mode** — auto / light / dark segmented control (`<html data-theme>`).
  - **Theme** — five bundled palettes, each with light + dark variants and a
    crisp monochrome line glyph: Ovellum (the monochrome base), E-ink (warm
    paper + ink black), Flexoki, Nord, Solarized (`<html data-palette>`).
  - **Color** — the primary color the CTA buttons, links, focus rings, and the
    ToC indicator all derive from; six presets, a native color picker, and a
    leading "Default" swatch that returns to the theme's own primary (hover
    states mixed automatically).

  All selections persist in `localStorage` and apply before paint (no flash;
  Safari's `theme-color` tracks the active palette). New config defaults:
  `site.palette` ('default' | 'nord' | 'flexoki' | 'solarized' | 'eink') and
  `site.accent` (any CSS color value).

## 0.3.0

### Minor Changes

- 9507330: Add an update notifier and an `ovellum upgrade` command.

  After a command finishes, the CLI prints a one-line "update available" notice when a newer version is published on npm. The check is cached per `update.intervalHours` (default 24h) so most runs do no network I/O, and it stays silent in CI, in non-interactive shells, and when `NO_UPDATE_NOTIFIER`, `--no-update-check`, or `update.check: false` are set. It never installs anything and never delays or fails a run.

  `ovellum upgrade` performs the explicit install: it checks npm, detects your package manager (npm/pnpm/yarn/bun) and install scope (global vs. local devDependency), shows `current → latest`, and runs the matching install command (`--dry-run` to print only, `--yes` to skip the prompt). Adds an `update` config block (`{ check, intervalHours }`).

### Also in this release

The update notifier above is the only changeset-tracked change. The following
landed on `main` without changesets between 0.2.2 and this release (and the
0.2.3 `--version` fix below, never published on its own, also ships here). All
of it is in the bundled site builder / core:

- **Default theme — monochrome editorial redesign.** Bordered content card,
  borderless sidebar with a full-length active highlight, rounded search with
  full-width clickable results, a distinct code-block surface, refined topbar.
  Rebuilt on a single gray ramp + role-token color system (light/dark from one
  source) and a ratio-driven type scale; theme CSS/JS now ship minified.
- **Content exclusion** — `site.ignoreFolders` (by folder name, any depth),
  `_meta.json` `"hidden": true`, and frontmatter `draft: true`. Asset-only
  folders (e.g. `public/`) are auto-pruned from the sidebar.
- **`site.font: 'sans' | 'serif'`** — switch the whole site between the system
  sans and serif stacks; code stays monospace.
- **Back-to-top button** on long pages — floats while scrolling, parks above
  the footer, smooth-scrolls (respecting `prefers-reduced-motion`).
- **Landing** — install snippets (`site.landing.install`) and black-monochrome
  CTAs.
- **404** — the build emits both `dist/404.html` and `dist/404/index.html`, so
  static hosts serve a custom 404 with no extra config.
- Page `<title>` falls back to the first `# H1` on frontmatter-less pages.

## 0.2.3

### Patch Changes

- Fix `ovellum --version` (and `-v`) reporting `No version specified` — the
  package version is now wired into the CLI's command metadata, inlined at
  build time.

## 0.2.2

### Patch Changes

- Add `site.headExtra` — raw HTML injected verbatim into `<head>` on every page
  (after the search assets, before the inline theme-boot script). Unset by
  default, so generated docs are unaffected unless a project opts in. Intended
  for analytics snippets and similar third-party `<script>`/`<link>`/`<meta>`
  tags; the string is not escaped, so only set markup you control.

## 0.2.1

### Patch Changes

- 82cdb1f: Add `publishConfig.access: public` and `sideEffects: false` to the package
  manifest — release-hygiene only, no behavioral change.

### Also in this release

The manifest patch above is the only changeset-tracked change. The following
user-facing improvements to the manual-mode site builder landed on `main`
without changesets between 0.2.0 (2026-05-17) and this release, and ship in
the bundled site builder:

- **GFM alert callouts** — `> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` /
  `[!WARNING]` / `[!CAUTION]` render as styled callouts.
- **RSS feed** — `feed.xml` (RSS 2.0) is emitted when `site.baseUrl` is set.
- **Configurable two-column footer** via `site.footerNav`.
- **Version badge** next to the brand, driven by `site.version`.
- **Landing** — optional imagery hero (`site.landing.hero.media`), interleaved
  section scenes (`site.landing.scenes`), and a subtle feature-card style.
- **Topbar** — centered search, icon buttons, the real Ovellum logo.
- GFM enabled so Markdown **tables render**; wide tables scroll in a container.
- Right-rail ToC strips a trailing `#` and uses a Retype-style active indicator.
- The reader **warns when a protected zone falls back to a positional id**, so
  drift surfaces in the build summary.

## 0.2.0

### Minor Changes

- a85aae4: First public release. `ovellum` is now installable from npm:

  ```bash
  npx ovellum init           # scaffold a new project
  npx ovellum dev            # build + watch + serve + live-reload
  ```

  What ships:
  - Three modes: `manual` (Markdown-first static site), `hybrid` (auto + manual merged), `auto` (pure auto-generation from TS/JS source).
  - Six CLI commands: `init`, `build`, `dev`, `watch`, `serve`, `check`.
  - Manual-mode static-site features: sidebar nav, "on this page" ToC, breadcrumbs, prev/next, reading time, last-modified, Pagefind search, sitemap, custom 404, print stylesheet, edit-this-page link, Mintlify-style landing page.
  - Themeable: auto/light/dark with OKLCH palette, Utopia type/space scales, Lucide icons, `site.codeTheme` for code blocks (`github` / `nord` / `solarized`).
  - Security: HTML sanitization via rehype-sanitize, command-injection-resistant git lookups (`execFile`), URL-scheme allowlist enforced in `ovellum check`.
  - 169 tests across the workspace, including CLI smoke tests against fixture projects.

  Status: `v0.1.x` — public and early. APIs may shift before `v1.0`.

  Docs: <https://ovellum.oss.oinam.com>
