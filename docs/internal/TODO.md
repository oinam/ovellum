# TODO

Living checklist for code / automation work. Update in place as work progresses.
Last updated: 2026-06-14 (0.7.0 → **0.12.0** shipped — see Current state). Previous: 2026-06-12 (full audit → [`ROADMAP.md`](./ROADMAP.md); 0.3.0 live). Older: 2026-05-24 (Chrome split — width unified via `--chrome-max` (topbar + footer never jump width between landing and docs), but **only the footer is chrome-tinted**; topbar reverted to body color with a 1px border-bottom after two passes proving a tinted topbar fights Safari URL-bar sampling and reads noisy against the body. Meta `theme-color` now tracks `--color-bg`, not `--color-bg-chrome`. Also (2026-05-25): auto-theme toggle icon reverted eclipse → monitor (eclipse read weird; monitor is the least-bad option so far). Landing hero imagery removed — `hero.media` dropped from the site config; feature code kept dormant for a later, better imagery pass. Then (2026-05-25, follow-up): **fixed a latent rhythm bug** — `--space-2xl` / `--space-3xl` were referenced by the hero padding + feature-grid margin + 6 other rules but never defined in `style.css` (only in STYLES.md), so those `clamp(var(--space-2xl)…)` declarations were invalid and collapsed to 0. With imagery gone (which had given the hero height via `min-block-size`) the no-media hero went cramped against the topbar — defining the two tokens restores the intended hero top/bottom padding and the hero→body gap. Also **removed the hero's dotted-noise + accent-spotlight pseudo-layers** entirely and **neutralized the background hue site-wide**: `--color-bg` + `--color-bg-chrome` are now pure-neutral grays (chroma 0) in both themes, dropping the faint bluish tint ahead of a planned blended background image. `theme-color` meta hex neutralized to match (#f4f4f4 / #101010).)

> Manual items — prose, decisions, releases, things only a human can do —
> live in [`TODO-Human.md`](./TODO-Human.md). When in doubt: if the work
> needs `git`, `pnpm`, or a code edit, it belongs here; if it needs a brain,
> an account, or a real-world action, it goes there.

**Reference docs:**

User-facing reference now lives on the website (canonical source) — update it
in `website/content/docs/reference/**` in the same commit as any feature change
that touches it:

- [CLI reference](https://ovellum.oss.oinam.com/docs/reference/cli/) — `ovellum` subcommands, flags, exit codes, summary output.
- [Config reference](https://ovellum.oss.oinam.com/docs/reference/config/) — every field in `ovellum.config.*` with types, defaults, and effect.
- [Glossary](https://ovellum.oss.oinam.com/docs/reference/glossary/) — definitions for anchor, protected zone, orphan, etc.
- [Security reference](https://ovellum.oss.oinam.com/docs/reference/security/) — sanitization, shell-out hardening, URL-scheme allowlist.

Still-internal docs:

- [`FEATURES.md`](./FEATURES.md) — what works **right now**, status per item, links to where each feature lives. Keep current alongside code.
- Design intent stays in [`DESIGN.md`](./DESIGN.md), [`SITE.md`](./SITE.md),
  [`STYLES.md`](./STYLES.md); CI/deploy wiring in [`DEPLOY.md`](./DEPLOY.md);
  human-only tasks in [`TODO-Human.md`](./TODO-Human.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Current state (2026-06-14)

**Publish state (read this first):** **`ovellum@0.14.0` is live on npm**
(2026-06-25), matches local. Tree clean on `main`, fully pushed; tag
`ovellum@0.14.0` (signed) pushed + GitHub release published; **no pending
changesets**. Tags `ovellum@0.7.0`…`0.14.0` all up.

**0.14.0 (2026-06-25) — Tier A hybrid-moat completion + CLI polish (5
changesets):** A4/A3 write side `ovellum orphans --reattach` (interactive
reattach/delete; `dev/orphans.ts` `suggestReattachTarget`/`reattachOrphan`); A5
`@preserve` auto-wrap (generator `wrapPreserved` + merger `stripGeneratedBlocks`,
hybrid only); A6 `ovellum check --strict` (positional-zone / stale-anchor /
missing-frontmatter); A7 incremental watch builds (`createIncrementalParser` warm
ts-morph Project + `runIncrementalBuild`; full & incremental share
`buildProjectDocs`); U4 `--verbose` on build/check/diff (stderr `onLog`,
composes with `--json`). **Tier A now COMPLETE (A1–A7).** 130 cli tests + 17
parser; docs en+ja 1:1.

**Shipped in 0.13.0 (2026-06-25, this session — big AI-Ready + hybrid-moat +
security batch).** The per-bullet `(committed …)` / `(uncommitted)` status tags
below are **historical** (everything here shipped in 0.13.0); kept for the
per-feature detail. ROADMAP **Tier A**:
- **A1 — IR persistence (committed `d9478d9`).** Every auto/hybrid build writes
  the parsed `DocProject` to `<cwd>/.ovellum/ir.json` (`dev/ir.ts`
  `writeProjectIR`, envelope `{generator, format, version, project}`), reported
  as the `ir:` build-summary line. Build _state_ at the project root beside
  `.ovellum/orphans/`, unaffected by `--out`, gitignored. Manual mode writes
  none. Changeset `persist-parsed-ir.md`.
- **A2 — `ovellum diff` (uncommitted).** Parses current source, loads the
  snapshot, reports added/removed/changed symbols + which output docs would
  change; writes nothing. `commands/diff.ts` + pure `dev/diff.ts` `diffProjects`;
  anchor-id match (rename = remove+add), flattens members, ignores
  `line`/`filePath`, maps docs via generator `outputPathFor`; `--json`,
  `--exit-code` (git-diff style). Changeset `ovellum-diff.md`. 359 tests
  (`diff.test.ts` +7, cli-smoke +4); docs en+ja (cli.md) re-stamped;
  FEATURES/ROADMAP updated.

- **A4 — `ovellum orphans` (read slice, uncommitted).** Lists quarantined
  manual blocks under `protect.orphanDir`: anchor id, doc, age, last-seen, and
  (vs `.ovellum/ir.json`) whether the anchor is present/gone/unknown. `--stale`
  (> `orphanRetention` days), `--json`. `commands/orphans.ts` + pure
  `dev/orphans.ts` (`parseOrphanFile` round-trips the merger writer,
  `loadOrphans`, `summarizeOrphans`). **A1 wiring:** `run-build.ts` stamps
  `anchorLastSeen` on new orphans from the prior snapshot's `generatedAt`.
  Changeset `orphans-command.md`. **Remaining: interactive reattach/delete**
  (write side). Docs en+ja (cli.md + concepts/orphans.md) re-stamped.

- **A3 — rename detection (suggest-only, uncommitted).** Pure `dev/rename.ts`
  `detectRenames` (kind gate + Levenshtein name sim + signature-shape sim +
  same-file bonus, greedy 1:1 ≥0.6 confidence, name floor 0.34). Surfaced in
  `diff` (likely-renames section + JSON; lifted out of add/remove) and at build
  time (`did X become Y? … reattach` warning, computed over the prior IR
  snapshot in `run-build.ts`). Changeset `rename-detection.md`. Tests
  `rename.test.ts` (6) + `rename-build.test.ts` (1) + a diff case.

- **C2 — `ovellum mcp` server (uncommitted).** Dependency-free stdio MCP server
  (hand-rolled JSON-RPC in `dev/mcp/server.ts` — deliberately no SDK/zod to keep
  the published CLI lean). Tools in `dev/mcp/tools.ts` (all IR-backed): query
  symbol, diff, list orphans, get page, build, and the differentiator
  `ovellum_write_zone` (`dev/mcp/write-zone.ts` `applyWriteZone` — write a
  `@manual` block under an anchor that survives hybrid regen; `dryRun`).
  Changeset `mcp-server.md`. Tests: `mcp-write-zone.test.ts` (4) +
  `mcp-server.test.ts` (6) + stdio smoke (1). **Deferred MCP tools:**
  `ovellum_check` (needs C3 `--json`), `ovellum_search_docs` (Pagefind).

- **C3 — machine-readable CLI (uncommitted).** `--json` on `build`
  (`buildSummaryToJson`) + `check` (`diff` already had it); stable exit codes;
  ConfigError as JSON on the `--json` path. `check` logic extracted to exported
  `runCheck`, reused by a new **`ovellum_check` MCP tool** (so the deferred MCP
  tool is now shipped). New `/docs/guides/automation/` guide (en+ja). Changeset
  `machine-readable-cli.md`. Tests: build/check `--json` smoke (2) + mcp check
  (1). **Remaining (folds U4):** `--verbose`; B8 warning-severity split.

- **C4 — agent packaging (uncommitted).** `ovellum init` scaffolds a mode-aware
  `AGENTS.md` (`renderAgentsMd` in `commands/init.ts`; hybrid/auto lead with the
  protected-zone contract; only-if-absent). Distributable Claude Skill at
  `skills/ovellum-docs/SKILL.md`, documented in the Automation guide. Fixed a
  stale scaffold marker (`ovellum:manual:start` → `@manual:start`). Changeset
  `agent-packaging.md`. Tests `agents-md.test.ts` (4) + init smoke.

- **C5 — positioning (uncommitted, docs-only).** `concepts/ai-ready.md` (en+ja),
  "Ovellum for AI agents" — read-ready / drivable / safely-editable, each claim
  cross-linked to the real feature; reciprocal link from the Automation guide.
  Chose a docs concept page over a landing section (landing redesign is queued).
  **No changeset** — website content only, not in the published package.

- **Security hardening S1–S6 (uncommitted, one slice).** Defense-in-depth, none
  exploitable: argv spawn in `upgrade` (no shell on POSIX); dev-server symlink
  re-check (`containedRealPath`) + request/headers timeouts; site passthrough
  `..`/symlink guard (`isInsideDir`); `site.headExtra` documented as a trust
  boundary (JSDoc + security page en+ja); `init` `validateDir`; update cache
  `0o600` + registry `redirect:'error'` + size guard. Changeset
  `security-hardening.md` (patch). Tests: dev-server symlink-escape +
  `init-validate.test.ts`.

**Tiers DONE through 0.14.0:** Tier A (A1–A7, the hybrid moat — persistence,
diff, orphans+reattach, rename detection, `@preserve` auto-wrap, `check
--strict`, incremental watch); Tier C (C1–C5, AI-Ready); security slice (S1–S6);
U4 (`--verbose` + `--json`). **A7 known limit by design:** the warm parser
re-extracts the whole project each change (cross-file ripples stay correct) but
startup parses twice — initial `runBuild` + seeding the warm parser; acceptable,
could unify later.

**AI-Native MCP (plan: `AI-NATIVE-MCP.md`):** **M1 + M2 done 2026-06-25.** M1 —
MCP Resources + Prompts (`dev/mcp/resources.ts` + `prompts.ts`). M2 — Claude Code
plugin `plugins/ovellum/` (manifest + `.mcp.json` + bundled `ovellum-docs` skill,
moved from old `skills/`) + repo-root `.claude-plugin/marketplace.json` +
cross-tool install snippets + `mcp` in notifier skip list. Changesets
`mcp-resources-prompts.md`, `mcp-plugin.md` (both minor → 0.15.0). **M3 done
2026-06-25:** `ovellum_search_docs` (in-process text search over built `.md`,
`dev/mcp/search.ts` — not Pagefind, browser-only) + `ovellum_reattach`
(non-interactive `orphans --reattach`). Changeset `mcp-search-reattach.md`.
**AI-Native MCP arc COMPLETE (M1–M3).** Only remaining MCP item is the human
registry submission (TODO-Human).

**Still open (pick next from `ROADMAP.md`):** B8 build-output severity levels
(would enrich `--json`); `ovellum_search_docs` MCP tool (Pagefind); usability —
U1 troubleshooting page, U2 migration guide, U3 init protected-zone example,
U5–U7; and the larger untouched **Tier B** (B1 plugin/extension API, B6
versioned docs, B5 composable landing, B2 MDX, B3 wire `links.ts`, B4 fonts, B9
images) + **Tier D** (D2 programmatic `build()` API, D3 lifecycle hooks, D5
recipes). No changesets pending; next feature starts a fresh 0.15.0 batch.

- **0.12.0 — AI-Ready output + portable deploy-anywhere build (343 tests).**
  **C1:** `site.ai` config (`{enabled?,llmsTxt?,fullText?,mdMirror?}`) → `/llms.txt`
  (default on), `/llms-full.txt` (default off), per-page `.md` mirrors at
  `<page>.md` (default on); per-locale, drafts/404 excluded, **HTML
  byte-identical**. Code: `packages/site/src/llms.ts` + `build.ts` (renderOne
  now returns raw `parsed.content`). **D1:** `ovellum build --out <dir>` /
  `--base <path>` per-invocation overrides (`applyOverrides` in `run-build.ts`).
  **D4:** `--manifest` → `<output>/.ovellum/manifest.json` (sha256 inventory;
  `dev/manifest.ts`, OS-junk + own-dir excluded). Principle: *Ovellum builds a
  portable folder; the host deploys it — no GitHub dependency.* Docs en+ja
  (`config.md` `site.ai`, `cli.md` flags) + `FEATURES.md`. **Rest of Tier C/D
  still deferred** — see ROADMAP: C2 MCP (needs A1 IR persistence), C3 `--json`
  (with U4), C4 Skill/`AGENTS.md`, C5 positioning; D2 programmatic `build()` API
  (flips `@ovellum/*` bundled-private), D3 lifecycle hooks (with B1), D5 recipes.
- **0.11.0** — i18n-completion batch + upgrade-local-dep fix (328 tests):
  `upgrade` prefers cwd's local dep; translation-staleness check; chrome-string
  localization + RTL; per-locale `check` link validation; config-text
  localization. **i18n complete end-to-end**; `/ja/` fully Japanese. Only i18n
  gap left: per-locale RSS.
- **0.10.1** — Markdown footnotes (GFM `[^id]`) + doubled-clobber-prefix fix +
  global `scroll-padding-top` (306 tests).
- **0.10.0** — frontmatter `updated:` + git `--follow --diff-filter=AM` ("Edited"
  no longer resets on rename); rewrote Install→Upgrading docs. (0.9.1 folded in.)

Release flow unchanged ([`RELEASE.md`](./RELEASE.md), top to bottom): an agent
preps everything (changeset version, badge bump in `website/ovellum.config.ts`
`site.version`, build, tests), the **maintainer runs the two human-only steps**
— `npm publish` from `packages/cli/` (npm session + OTP) and the signed
`git tag -s` (GPG pinentry) — then the agent cuts the GitHub release. (0.12.0
followed this exactly.)

**What shipped 0.7.0 → 0.10.0 (2026-06-14, this session):**
- **0.7.0** — scoped `<iframe>` video embeds (YouTube/Vimeo allowlist) + native
  `<video>`/`<audio>`; **bundled font picker** (System/Serif/**Inter**/**Geist**,
  webfonts shipped in the package at `templates/default/fonts/`, lazy
  `@font-face`) + 5-step **text-size** scale; **Styleguide** reference page;
  **`site.assetBaseUrl`** (serve `publicDir` from a CDN); **`site.dateFormat`** +
  the "Edited" humanized last-modified line; repo-wide **American-English
  spelling**. Package jumped to ~950 kB (the two webfonts).
- **0.8.0 — i18n / multiple languages.** Opt-in `site.locales` + `site.defaultLocale`
  (BCP 47); content moves to `content/<code>/` subtrees, default at root, others
  `/<code>/`; topbar **language picker** (autonyms), `<html lang>` + hreflang,
  locale-aware config nav links. The Ovellum site ships a **full English +
  Japanese (1:1)** translation. (Engine = two-phase per-locale pass in
  `build.ts`.) Also fixed: breadcrumb dead-links (page-less section crumbs →
  text) and a "Docs shown twice on /ja/" bug (config nav links now locale-prefixed).
- **0.9.0 — drafts ("the Editor" focus).** `draft: true` (frontmatter) /
  `_meta.json "draft"` (folder, cascades) = **dev-visible, production-excluded**
  WIP pages: ribbon + sidebar badge in `dev`/`watch`, dropped from `build` (with
  a count), out of sitemap/RSS. Automatic by command; `build --drafts` /
  `dev|watch --no-drafts` overrides. `BuildSiteOptions.includeDrafts` →
  `buildNav(includeDrafts, stats)`. **Behavior change** from the old
  excluded-everywhere `draft`. New Drafts guide en + ja. 298 tests.
- **0.10.0 — smarter "Edited" dates.** Frontmatter **`updated:`** pins a page's
  date explicitly (`normalizeFrontmatterDate` in page-meta.ts); the git lookup
  moved from `git log -1` to **`git log --follow --diff-filter=AM`** so renames /
  pure moves don't reset "Edited" to "today" (the 0.8.0 i18n `git mv` had made
  every page read "today"). Order: `updated` → git(follow) → fs mtime. Rewrote
  **Install → Upgrading** (en+ja): `npx ovellum upgrade` vs global, `@latest` vs
  the caret-locks-minor-in-0.x trap, and the global-vs-local pitfall. The
  prepped-but-unpublished **0.9.1** (rename-fix patch) folded in here. 301 tests.

**0.10.1 — Markdown footnotes (shipped 2026-06-14):**
- **Markdown footnotes (GFM `[^id]`).** `remark-gfm` already parsed footnotes,
  so this was really fixing a half-working feature. Headline fix: the
  `user-content-` clobber prefix was applied **twice** — `remark-rehype`
  prefixes the footnote id/href pairs, then `rehype-sanitize`'s own
  `clobberPrefix` re-prefixed the `id`s (but not the `href`s), so **every jump
  link was broken**. Fix = `clobberPrefix: ''` in `SANITIZE_SCHEMA` (the single
  remark-rehype prefix stays; protection retained). Also: `collectHeadings` +
  the autolink `test` skip the `sr-only` "Footnotes" `<h2>` so it stays out of
  the ToC / heading-anchor pass; CSS renders the notes as a subtle tinted panel
  one type-step below body prose with `↩` back-refs; and a **global
  `scroll-padding-top: calc(var(--ov-header-h) + var(--space-s))`** on `html`
  now offsets *all* anchor jumps (headings + footnotes) so the target clears the
  sticky topbar instead of hiding behind it. Docs en+ja (manual-mode guide +
  styleguide, with live examples), `FEATURES.md`, 5 new markdown tests. Shipped
  as **0.10.1**.

**Shipped in 0.11.0 (2026-06-14 — the i18n-completion batch):**
- **`ovellum upgrade` prefers the local dep** (patch, `ccf9ac6`). `isLocalInstall`
  now also reads the cwd `package.json` (deps/devDeps/optionalDeps), so a project
  that *declares* ovellum is upgraded locally even via the global binary (the
  notes.oinam.com footgun); the package manager for a local upgrade comes from the
  lockfile (`detectManagerFromLockfile`), and the "Update available" line names
  the target. Docs en+ja (install + cli ref).
- **i18n translation-staleness check** (minor, `7325cc9`). `ovellum check` flags
  `[i18n]` stale/missing/orphan translations via a `sourceHash` frontmatter
  fingerprint of the default-locale source (matched by identical relative path);
  `ovellum check --update-translations` stamps them (surgical 1-line upsert).
  Stamped the website's 21 ja pages. `checkTranslations`/`stampTranslations`/
  `hashBody`/`upsertFrontmatterField` in `commands/check.ts`. Docs en+ja.
- **i18n chrome-string localization + RTL** (minor, `8d1bf35`). All template UI
  strings resolve through a per-locale `UiStrings` table (`packages/site/src/
  strings.ts`): `DEFAULT_STRINGS` (en) → `BUILTIN_STRINGS` (en+ja) →
  `site.locales[].strings` override. `/ja/` now renders Japanese chrome; dates via
  `Intl.DateTimeFormat`; RTL langs get `<html dir="rtl">`; copy-button labels via
  `window.__OV_I18N__`. **Single-language output byte-for-byte identical.** Docs
  en+ja. Re-stamped ja i18n/config after the en doc edits.
- **`ovellum check` per-locale link validation** (patch, `212e889`). `checkManual`
  now lints i18n sites locale-by-locale (`localeViews` → each `content/<code>/`
  subtree's prefixed nav; links validated against the union). Fixed the ~76
  false broken-links on the website (now checks clean). Single-language unchanged.
- **i18n config-text localization** (minor, `11f5d4f`). Config-driven labels/copy
  accept a per-locale map (`LocalizedString = string | Record<code,string>` in
  core): `topbarNav`/`footerNav` labels + landing hero/CTA/feature/install/trust
  text. Resolved via `localize()` in template/build; validator accepts
  string-or-map. The website's landing + nav now ship en/ja maps → **`/ja/` is
  fully Japanese end to end**. Plain strings pass through (byte-identical).

**Standing notes / next i18n slice:**
- **Translation drift is now caught** — `ovellum check` flags stale ja mirrors;
  re-stamp with `ovellum check --update-translations` after syncing. **Every
  English doc edit still needs its `content/ja/` mirror updated**, but now CI
  catches it if you forget.
- **Still not localized:** per-locale RSS feeds (the only remaining i18n gap —
  chrome, page content, AND config-driven text are all localized now; the
  website's `/ja/` is fully Japanese, config labels/hero included).
- **`ovellum check` i18n link validation: FIXED** (was ~76 false broken links on
  the i18n website). `checkManual` now lints per-locale (`localeViews` → each
  `content/<code>/` subtree's prefixed nav; links validated against the union).
  The website now checks fully clean (broken 0 / unsafe 0 / stale 0).
- **"The Editor" theme continues** — drafts were slice 1; natural follow-ons:
  publish/scheduling workflow, in-place preview (both build on the draft plumbing).
- Pick next work from [`ROADMAP.md`](./ROADMAP.md) — v0.8.0 (B7 i18n) and v0.9.0
  (U8 drafts) are now **done**; their design blocks there are historical record.
- **AI-Ready (C1) + portable build (D1/D4) shipped in 0.12.0** — see the Publish
  state block at the top of this Current state for the detail; ja already
  re-stamped, release cut. The **rest of Tier C/D is still the next big work**
  (next bullet + ROADMAP).
- **NEXT BIGGEST RELEASE (rest prepared, not started): Tier D "Embed & deploy
  anywhere"** in `ROADMAP.md` — make Ovellum a portable, embeddable *build step*
  any external tool / CI can drive and **deploy itself**, no GitHub dependency.
  Principle: *Ovellum builds; the host deploys.* **D1** `--out`/`--base` CLI
  overrides + `--json`; **D2** programmatic `build()`/`check()` API from the
  `ovellum` package (flips the parked `@ovellum/*` bundled-private decision —
  Parked #2; also fixes that importing `ovellum` runs the CLI as a side effect);
  **D3** lifecycle hooks (`onBuildComplete({outDir,manifest})` = the deploy
  hook; co-design with B1 plugin API); **D4** `<output>/.ovellum/manifest.json`
  for atomic/incremental CDN deploys; **D5** "deploy anywhere" recipes.
  `config.output` (default `./docs`) ALREADY gives GitHub-Pages-from-`/docs`
  with zero Actions — D fills the tool-driven gap. Maintainer flagged this the
  next big release 2026-06-14; design NOT locked.
- **Task prepared (not started): Tier C "AI-Ready"** in `ROADMAP.md` — make
  Ovellum AI-Native across three surfaces: **C1** AI-friendly docs *output*
  (`llms.txt` + `llms-full.txt` + per-page `.md` mirror), **C2** MCP server
  (`ovellum mcp`; the headline write tool is `ovellum_write_zone` — agents edit
  protected zones that survive regeneration; needs A1 IR persistence first),
  **C3** machine-readable CLI (`--json`, folds in U4), **C4** Claude Skill +
  `AGENTS.md`, **C5** positioning. Design NOT locked; C1 is the cheap standalone
  first slice. **C3 ≈ D1** — share the machine-readable-CLI work. Maintainer
  asked to queue it 2026-06-14, not build yet.

**What shipped 0.4.0–0.6.0 (prior session, 2026-06-13 — history):**
- **0.4.0** — topbar **appearance control**: light/dark/auto mode + five
  page-wide OKLCH palettes (Default/Ovellum, E-ink, Flexoki, Nord, Solarized;
  macOS trialled then dropped) + accent/Color picker; all persisted in
  localStorage, applied pre-paint. All theme colors converted to OKLCH (CSS
  minify drops `minifySyntax` so esbuild can't rewrite oklch→hex). Ovellum
  theme glyph = pen-nib.
- **0.5.0** — optional `site.logo` (theme-flipping mask; removed the hardcoded
  Ovellum mark that wrongly shipped to every site) · `site.favicon` (always
  emits `<link rel=icon>`, default `/favicon.ico`) · always-generated themed
  404 · collapsible sidebar folders (`site.sidebar.collapse`, per-folder
  `_meta.json "collapse"` override) · sidebar scroll-restore to active link ·
  `site.ignoreFiles` globs + **`check` now shares build's exclusions** (was
  linting node_modules) + auto-excludes (dotfiles/node_modules/manifests/config
  /output dir) so `input: "."` is clean · README-as-home + `site.home` ·
  fixed the `dev`/`watch` rebuild loop under `input: "."` · palette-default
  persistence fix.
- **0.5.1** — fix: sidebar scroll-restore was inert (`.offsetHeight` on a
  DOMRect → NaN); now uses `.height`.
- **0.6.0** — **README is the folder index at every level** (build derives page
  URLs from the nav so they never drift) · frontmatter **`permalink`** (URL
  override) + **`tags`** (→ `<meta keywords>`) · **`site.publicDir`** (default
  `public`) reserved → copied to the **site root** (SSG norm; **breaking** vs
  the old `dist/public/`) · configurable **`site.backToTop`** (default
  threshold 360) · footer **`site.credit`** link (default on) · sidebar
  hierarchy polish (indent + bold index-folders) · **`ovellum init` now
  scaffolds a fully-commented `ovellum.config.ts`** (every option documented
  inline). Decision log: `publicDir → root` (not `dist/public/`) is the SSG
  standard and the only place root-required files (favicon/robots/CNAME) work —
  see [[feedback-counter-with-conventions]].

**2026-06-12 — full audit + 10x roadmap.** A four-track audit (CLI, site
builder, engine packages, docs/website) was synthesized into
[`ROADMAP.md`](./ROADMAP.md) — the prioritized 10x plan across features /
security / usability, with verified severities (note: the "upgrade command
injection" a reviewer flagged is a **false positive** — fixed-allowlist
command, recorded there). **Start the next work session from ROADMAP.md**;
its "Suggested sequencing" names slice 1 (security hardening + quick wins)
as the first PR-sized unit.

**2026-06-12/13 — topbar appearance control (shipped in 0.4.0).** The
light/dark cycle toggle is now a
palette-icon **popover** (inlined into the mobile sheet): Mode (auto/light/
dark) + Theme (five palettes: Ovellum, E-ink, Flexoki, Nord, Solarized — line glyphs; macOS dropped 2026-06-13) + Color (drives primary CTA + accent) +
Accent (six presets, native color input, clear swatch). Architecture notes:
each palette re-skins the gray ramp (`:root[data-palette='…']` placed BEFORE
the dark blocks so the reversed-ramp dark remap still wins; per-palette dark
accents after, at (0,3,0); the user-accent override block uses a repeated
`[data-accent]` specificity bump to (0,4,0)). Accent = inline `--ov-accent`
on `<html>`; hover via `color-mix` toward `--color-fg`. Boot script owns the
per-palette `[light,dark]` bg map (`window.__OV_PALETTE_BG__`) for Safari's
`theme-color` — **if a palette bg hex moves, update boot script + the
`.ov-appearance-dot` gradients together**. New config: `site.palette`,
`site.accent` (validated in core). localStorage keys: `ovellum-theme` (mode,
legacy name), `ovellum-palette`, `ovellum-accent`. Tests: 236 passing (+2
core validate, +2 site template). Known minor: with `site.accent` configured,
the in-panel "theme default" swatch clears the accent for the session but the
config accent returns on next page load (server attr + empty localStorage).

**Shipped since 0.2.2 (this session — on `main`, not yet on npm):**
- **coss.com/ui-inspired redesign** of the default theme + website: bordered
  content box w/ drop-shadow, borderless bold-heading sidebar w/ full-length
  active highlight, rounded search, editorial frame rails + `+` intersection
  marks. **Token architecture** refactored to one gray ramp
  (`--color-gray-50…950`) + role triples (primary/secondary/accent
  ×value/-fg/-hover) + Tier-2 semantics; dark = reversed-ramp remap; colors no
  longer synced from STYLES.md (only fonts/space/radii are). Modular type scale
  via named-ratio CSS vars (`--ratio: var(--major-third)`).
- **`site.font: 'sans' | 'serif'`** body-font toggle (system stacks) via the
  `--font-body` indirection + `data-font` on `<html>`.
- **Content exclusion** (`7a55216`): `site.ignoreFolders`, `_meta.json
  "hidden": true`, frontmatter `draft: true`; asset-only folders (`public/`)
  auto-pruned from the sidebar. Build now emits both `dist/404.html` and
  `dist/404/index.html`; page `<title>` falls back to first H1.
- **Search documented** (Pagefind) — new `/docs/guides/search/`.
- **Back-to-top** (`f107adf`, `5f143fe`): part of the global default template.
  Floats while scrolling, parks above the footer via a zero-height
  `position:sticky` anchor (`.ov-to-top-anchor`); smooth scroll is pure CSS
  (`html { scroll-behavior:smooth }` gated by `prefers-reduced-motion`), JS
  click is just `scrollTo({top:0})`. Optional JS custom-easing is a backlog TODO.
- **Website typeface = Geist** (`e7d2b4a`): self-hosted Geist (sans) + Geist
  Mono (code) in `website/content/public/{site.css,fonts/}`, chosen over
  Satoshi (too thin, ~50kb) and Inter (~350kb). Inter + Satoshi kept declared
  as `@font-face` for tinkering (zero cost until selected); live face chosen by
  `data-typeface` on `<html>`, set pre-paint from localStorage (default geist)
  via a `headExtra` script that also exposes `ovSetTypeface()` for console
  auditioning. **Live reference/blueprint** for the backlog "custom fonts via
  config" + a future UI font picker. Default theme package untouched (system-font).
- **CLI update notifier + `ovellum upgrade`** (`9507330` — the headline
  feature). `update` config block (`{ check, intervalHours }`). After a command,
  a one-line "update available" notice (stderr) when npm's `latest` is ahead —
  cached per intervalHours (24h), silent in CI / non-TTY / `NO_UPDATE_NOTIFIER`
  / `--no-update-check` / `update.check:false`, never blocks or fails.
  `ovellum upgrade` does the explicit install (detects mgr + global/local,
  `--dry-run`, `--yes`). **Notice-only by design** (Path A — we explicitly
  rejected silent auto-apply: fights package managers + breaks reproducibility).
  Code: `packages/cli/src/update/{semver,registry,cache,install,notifier}.ts`
  + `commands/upgrade.ts`; hand-rolled semver (no new dep). There are now
  **seven** CLI commands (added `upgrade`).

**Live and shipped (0.2.2 and earlier):**
- `ovellum@0.2.2` on npm — <https://www.npmjs.com/package/ovellum> (published 2026-05-31; tag `ovellum@0.2.2` + GitHub release done). `0.2.1` published 2026-05-30; `0.2.0` first public release 2026-05-17. Tags `ovellum@0.2.0` (retro at `a85aae4`), `0.2.1`, `0.2.2`. `0.2.2` shipped `site.headExtra` (raw `<head>` injection — used for Oinam Analytics on the website only; end-user docs unaffected unless they opt in).
- **Landing install snippets** (`site.landing.install`) render after the hero CTAs: each title folds into the block as a leading comment (language-aware `#`/`//`), but the copy button yields the bare command via `data-copy-text`. Install blocks use a right-centered **icon** copy button and drop the language label; docs code blocks keep the language eyebrow + **text** copy button.
- **Black-monochrome CTAs**: charcoal primary / gray-100 secondary via dedicated `--color-cta-*` tokens. The blue `--color-accent` (links, focus rings, callouts, ToC) is deliberately untouched.
- Website config is now `website/ovellum.config.ts` (was `.json`) — TypeScript so analytics/HTML snippets paste in unescaped via backticks.
- Internal docs pruned: CLI/CONFIG/GLOSSARY/SECURITY removed — the website docs (`/docs/reference/`) are canonical. `docs/internal/` keeps DESIGN/SITE/STYLES/DEPLOY/FEATURES/TODO/TODO-Human. `CLAUDE.md` added (project + role guide); `CLAUDE.local.md` is gitignored private notes.

**Pick up here (open threads):**
- **The 10x roadmap** — [`ROADMAP.md`](./ROADMAP.md) is now the canonical
  open-threads list (it absorbs and supersedes the per-item notes below;
  custom fonts, MDX tier 1, orphans CLI, landing sections etc. all live
  there with priorities). The bullets below are kept for their detail.
- **Light-mode secondary CTA contrast.** "View on GitHub" is gray-100 (`oklch 96.7%`) on a near-identical body (`oklch 97%`) — separated only by the `--color-zinc-300` hairline border. Reads via the border but the fill is near-invisible in light mode. If it looks weak on the live site, bump `--color-cta-secondary-bg` a step (zinc-200) or strengthen the border. Tokens in `style.css` `:root`.
- **MDX in manual mode** is queued (Phase 4.5): tier 1 = widen the `.mdx` discovery regexes in `nav.ts`/`build.ts` (near-trivial); tier 2 = full `remark-mdx`.
- **Process gotcha:** the tool-output channel glitched repeatedly this session (empty/delayed Bash + Read; one bad parallel call canceled a whole batch). Subagents were the reliable path — their final message returns intact. See `CLAUDE.local.md`.
- Docs site live with TLS — <https://ovellum.oss.oinam.com> (version badge now `v0.2.2`)
- All seven CLI commands working: `init`, `build`, `dev`, `watch`, `serve`, `check`, `upgrade`
- Manual-mode static site builder is feature-complete for a real docs site
- Landing feature grid is now a **subtle card** style (`.ov-card` primitive + `--color-surface` token) — reverses the earlier editorial-calm "no cards" experiment. See SITE.md §1.2 + STYLES.md surfaces.
- Workspace test count: **232 vitest cases across 24 files, all passing** (`npm test`); new this session: `packages/cli/src/__tests__/update.test.ts` (semver precedence incl. prerelease, manager detection, command building) + 5 core `validate.test.ts` update-block cases. Coverage tooling added 2026-05-30 (`@vitest/coverage-v8` + root-only `vitest.coverage.ts`, run via `pnpm test:coverage`; deliberately not auto-discovered so `turbo run test` stays per-package). Baseline ~65% lines / 76% branches / 86% funcs. Release-readiness pass hardened the *engine* (the previously 0%-instrumented critical path): hybrid `run-build.ts` 0→91% via an in-process merge-survival golden test (`packages/cli/src/__tests__/merge-survival.test.ts` — asserts protected prose survives rebuilds and is quarantined, not lost, when its symbol is removed); `parser/extractors.ts` 73→99%; `generator/templates.ts` 53→93%. Note: CLI command layer + `site/build.ts` still read ~0% in coverage because `cli-smoke.test.ts` exercises them in a subprocess v8 can't instrument — they ARE tested, just not counted.

**Active focus:** the Agora-inspired landing pass is complete. Imagery hero (2026-05-19) plus interleaved section scenes (2026-05-22) cover the calm-scene direction; both are config-driven so adding/swapping art is a file-drop in `content/public/`. Next focus moves back to the deferred items lower in this file (orphans CLI, MDX, Nord/Solarized page themes) — pick when the maintainer wants something to ship.

**Design language locked in this session** (commits `1b2bc8e` → `812c29b`):
- Typography: h1 -0.03em / h2 -0.02em / h3 -0.015em, h2 lost its border (biggest "template-y" tell removed); content max 76ch on doc pages, 60ch on landing prose.
- Layout: **two** width tokens — `--chrome-max` (constant 1600px) governs the topbar + footer inner contents and never moves; `--page-max` (1600px docs, 1100px landing via `body.ov-body-landing`) governs the main content area. This split kills the "small landing header → wide docs header" jump on click.
- Chrome: topbar and footer are both **full-bleed** outers that constrain inner contents to `--chrome-max` via `.ov-topbar-inner` / `.ov-footer-inner`. Topbar background = body color, separated only by a 1px `border-block-end`. Footer background = `--color-bg-chrome`, two-column grid (`auto 1fr auto`) — copyright left, footerNav right (GitHub / npm / RSS icons + text links).
- Backgrounds: body shifted off pure white (light) / pure black (dark) — `--color-bg = oklch(97% 0.002 286.38)` in light, `zinc-950` in dark. `--color-bg-chrome` (used by **footer only** now) sits ~4% L darker than body in light (`oklch(93% 0.004 286.38)`), ~6% L lighter in dark (`oklch(20% 0.007 285.82)`) — elevation inversion. **Lessons from the design loop:** (1) below ~3% L delta reads as rendering noise; 4-6% is the floor. (2) Sticky translucent backgrounds collapse perceived contrast — opaque only. (3) macOS Safari samples the topbar's visible color into its URL-bar tint, so giving the topbar its own color independently of body causes URL-bar / body mismatches that fight the user's spatial model. Cleanest path: topbar = body color with a hairline border, footer alone carries the chrome tint as a closing baseline. `html { background: var(--color-bg) }` so top-of-page rubber-band continues the topbar; bottom overscroll mismatches the footer's chrome tint (small tradeoff).
- Safari URL bar: `<meta name="theme-color" id="ov-theme-color" data-light="…" data-dark="…">` carries the hex equivalents of **`--color-bg` (body)**, since the topbar is now body color. Inline boot script in `<head>` resolves the right one before paint (no light-flash on dark-OS first load). `script.js` keeps it in sync — `syncThemeColor()` called inside `apply()` for the toggle, and a `matchMedia('(prefers-color-scheme: dark)')` listener for OS changes when stored theme is `auto`. **Gotcha:** if `--color-bg` moves, the hex `data-light` / `data-dark` in `packages/site/src/template.ts` must move with it — flagged in a CSS comment + SITE.md §10.
- Sidebar: subtle left-rule active state (no chip), hairline horizontal dividers between top-level groups, wider 260px.
- Right-rail ToC: continuous 1px vertical track with a 2px accent strip on the current section. IntersectionObserver-based scroll-spy in `script.js`. Trailing `#` stripped from heading text.
- Prev / next: Retype-style bordered button pair with inline `←` / `→` arrows that slide on hover.
- Code blocks: language eyebrow (`data-language` attr + CSS `::before`) top-right; copy button shares the corner and swaps in on hover. Padding bumped on top to clear the eyebrow.
- Inline code: smaller, mono, white-space: nowrap so a long token never wraps mid-chip.
- Tables: editorial — no grid, no `<th>` fill; horizontal rules only, header reads via uppercase eyebrow weight; wrapped in `.ov-table-wrap` with `overflow-x: auto` so wide tables scroll without breaking the column.
- Callouts: GFM alert syntax (`> [!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`) via a custom rehype plugin, styled with type-color left rule + uppercase eyebrow + soft tint.
- Landing: dropped feature cards (border + bg + radius gone), replaced with `border-top: 1px` blocks — reads as a structured grid, not Mintlify cards. Hero noise/spotlight softened (28px / 0.12 alpha; 14% accent mix). Trust strip quieter (fg-subtle, 0.72em label).
- Version badge: small mono chip next to the brand, driven by `site.version` free-form string.
- Brand: dropped a size step (font-size-0 + weight 600), tighter tracking.

**Agora-inspired landing pass — complete (2026-05-22).** Hero variant shipped 2026-05-19; interleaved section scenes shipped 2026-05-22. Imagery now lives in `website/content/public/` (passthrough → `dist/public/`) so the maintainer can drop in new art without touching code. `tmp/` at the repo root is the scratchpad drop-zone (gitignored).

**Parked / deferred:**

1. **CI auto-publish — parked.** `.github/workflows/release.yml` was rewritten on 2026-05-18 to do version-PR opening only; `npm publish` is run locally. History: prior CI attempts 404'd on `PUT https://registry.npmjs.org/ovellum` even with a granular token scoped Read+Write, bypass-2FA, exact-package (confirmed via `npm access list packages`). Suspected cause: `actions/setup-node@v4`'s `registry-url` writes a `~/.npmrc` that conflicts with `changesets/action@v1`'s own auth setup. Not worth chasing right now — local publish works, costs ~30s after each version-PR merge. **Don't forget to bump `site.version` in `website/ovellum.config.json` after publishing** — it drives the badge next to the brand.

    **If we ever un-park CI publish:** do it via npm **Trusted Publishers** (OIDC), not by reviving the `NPM_TOKEN` path. Trusted Publishers issues short-lived per-workflow tokens, so there is no long-lived secret to rotate or leak — and dropping `NPM_TOKEN` / `NODE_AUTH_TOKEN` from the env sidesteps the original `registry-url` collision entirely. Steps when we revisit: (a) on npmjs.com → `ovellum` package settings, add a Trusted Publisher pointing at `oinam/ovellum` + the release workflow filename; (b) add a publish job to `release.yml` with `permissions: id-token: write`, Node ≥22.14, npm ≥11.5.1, and `npm publish --provenance --access public`; (c) `repository.url` in `packages/cli/package.json` already matches `git+https://github.com/oinam/ovellum.git`, so provenance attestations will generate cleanly. Docs: <https://docs.npmjs.com/trusted-publishers>. Do **not** flip the "disallow tokens" switch on the package — it would lock out local publish, which is by design ([[feedback-publish-workflow]]).

2. **Branch protection on `main` — safety-only applied 2026-05-30; upgrades deferred.** A repository ruleset **`main-safety`** (id `17068630`, enforcement active, no bypass actors) now **blocks force-push (`non_fast_forward`) + branch deletion**. Zero workflow impact — direct `git push origin main` still works. Created via `gh api repos/oinam/ovellum/rulesets -X POST` with rules `non_fast_forward` + `deletion`. **Still deferred (the friction-y toggles):** (a) **require CI status checks** (the `CI / Lint, typecheck, test, build (node 20|22)` checks) to pass — would block direct pushes that haven't gone green; (b) **require a PR before merging** — routes every change through CI *and* the PR-only changeset guard (gotcha #3) but ends direct push to `main`. Revisit when the changeset discipline (gotcha #3) starts to matter; add the chosen rules to the existing ruleset rather than a new one.

3. **Release-hygiene gotchas (from the 0.2.1 cut, 2026-05-30):**
   - **Changeset skipped on direct-to-main pushes.** The CI `changeset-status` guard runs on **PRs only**; commits pushed straight to `main` bypass it. That's why a batch of site-builder features (callouts, RSS, footerNav, version badge, landing hero/scenes/cards) landed without changesets and the auto-generated 0.2.1 CHANGELOG under-recorded the release — the missing entries were reconstructed by hand from `git log` and appended under the `## 0.2.1` heading in `packages/cli/CHANGELOG.md`. Fix going forward: author a changeset per user-facing change, or adopt PR-required (gotcha #2).
   - **`npm publish` "bin … invalid and removed" warning is harmless.** npm normalizes `bin` `"./dist/index.js"` → `"dist/index.js"` (strips the leading `./`) and warns loudly while doing it. The published bin is correct. To silence it next release, change `bin.ovellum` in `packages/cli/package.json` to `"dist/index.js"` (no `./`) and bundle it into a changeset.
   - **Plain `git push` doesn't carry annotated tags.** After a release, push tags explicitly (`git push origin ovellum@x.y.z`) or use `git push origin main --follow-tags`.

2. **`@ovellum/*` workspace deps are bundled into `ovellum` at build time** (tsup `noExternal: [/^@ovellum\//]`). Internal packages stay private. Templates copied from `packages/site/src/templates` to `packages/cli/dist/templates` by `scripts/cli-copy-templates.mjs` because `@ovellum/site` resolves templates via `import.meta.url`. If anyone asks for direct `@ovellum/*` imports, the bundling decision needs to flip.

3. **Plugin API for templates is deferred** — multi-day scope; deserves its own design pass. Page-level Nord/Solarized themes (palettes are in `STYLES.md`) are also deferred; `site.codeTheme` ships the code-block theme picker today.

4. **Icon set swappability — deferred until the site is stable.** Lucide is the default today, wired up in `packages/site/src/icons.ts` (per-icon imports for tree-shaking) and called via `renderIcon(name, opts)` in `template.ts`. Revisit once the design language stops shifting. **Triggers for a re-evaluation:** (a) we need a second hand-rolled brand mark (Lucide v1 dropped brands; GitHub is already hand-rolled), or (b) we decide the 2px Lucide stroke reads chunky next to the editorial type. **Most likely successor:** Tabler Icons (same 2px stroke language → near-visual drop-in, ships brand marks). **For a pure editorial feel:** Iconoir (1.5px stroke, needs a per-icon sizing pass). **Swap plan when we do it:** (i) keep the `IconName` union and `renderIcon()` signature stable — every call site goes through it, so the swap is internal to `icons.ts`; (ii) build a one-off visual diff page in `tmp/` that renders the full registry old-vs-new at the topbar / footer / callout sizes we actually use; (iii) re-tune CSS sizing only if stroke weight changes (Lucide → Tabler is no-op, Lucide → Iconoir likely +1px size compensation); (iv) re-run the landing + topbar visual check in both themes before committing. **Do not** abstract behind a "themeable icon provider" interface — overengineering for what is realistically a one-time swap.

**npm token** is still valid (~mid-Aug 2026), but unused by CI now. Local publish uses the maintainer's `oinam` npm session.

**Where to find things:**
- Public docs source: `website/content/` — canonical user-facing reference (cli / config / glossary / security) lives at `website/content/docs/reference/**`, served from <https://ovellum.oss.oinam.com/docs/>.
- Internal design docs: `docs/internal/{DESIGN,SITE,STYLES,DEPLOY}.md` (DEPLOY = CI/deploy wiring).
- Internal feature-state doc that updates in step with code: `docs/internal/FEATURES.md`.
- Internal planning: `docs/internal/{TODO,TODO-Human}.md`.
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
- [x] Token-extraction script: pull current `STYLES.md` values into `style.css` automatically — `scripts/extract-style-tokens.mjs`; npm scripts `extract-tokens` / `check-tokens`; marker-based scope so deliberate deviations stay hand-edited
- [x] Nord + Solarized themes wired into the theme switcher — shipped 2026-06-12 as the **topbar appearance control** (mode + palette + Color popover; palettes Ovellum/E-ink/Flexoki/Nord/Solarized — each a ramp re-skin so light+dark come free; macOS dropped 2026-06-13; `site.palette` / `site.accent` config)
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
- [x] Page-level Nord + Solarized themes — shipped 2026-06-12 via the appearance control (plus Flexoki + E-ink; macOS dropped 2026-06-13). Implemented as gray-ramp re-skins (`:root[data-palette='…']` in `style.css`), not the STYLES.md §7 per-token blocks; dark variants come free from the reversed-ramp remap.
- [x] Token-extraction script: pull current `STYLES.md` values into `style.css` automatically — shipped 2026-05-18
- [x] `_meta.json` title fallback for directories without their own `index.md` — already implemented in `buildNav`'s title resolution chain (`meta.title > indexNode.title > kebab segment > 'Untitled'`); the live website (no index.md in any of `concepts/`, `guides/`, `reference/`) relies on it. Behavior pinned by two explicit tests in `packages/site/src/__tests__/nav.test.ts`.
- [x] RSS feed auto-emit
- [ ] **MDX in manual mode.** Today page discovery skips `.mdx` — `isMarkdown` in `nav.ts` (and the twin in `build.ts`) matches only `.md`/`.markdown`, so `.mdx` files never become site pages. Two tiers: (1) **treat `.mdx` as Markdown** — widen those two regexes + the reader's extension list; near-trivial, no JSX evaluation, ships `.mdx` authoring immediately. (2) **full MDX** — compile JSX/components via `remark-mdx`; a real piece of work. Do tier 1 first.
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
- [x] Image hero variant — shipped 2026-05-19 via `site.landing.hero.media`
- [ ] Video hero variant

### Phase 4.5 follow-up: Agora-inspired landing redesign (started 2026-05-19)

User reference: <https://www.agora.xyz>. Direction: calm, serene
scenes; imagery anchors the page; type stays editorial-calm
(typography, code blocks, callouts, ToC, sidebar all locked — only the
landing's visuals are in scope).

**Decisions taken (2026-05-19):**

- Imagery source: abstract code-generated SVG (hand-authored, no AI/CDN).
- Hero shape: full-bleed visual, title/subtitle/CTA stack centered over it.
- Motion budget: looped animation lives inside the SVG (CSS `@keyframes` +
  `prefers-reduced-motion` no-op fallback). Zero JS, ~2.4KB per asset.
- Asset delivery: `website/content/hero-{light,dark}.svg` via Ovellum's
  manual-mode passthrough convention — swappable by replacing the file.

**Shipped (2026-05-19):**

- [x] `site.landing.hero.media = { light, dark?, alt? }` config in
      `@ovellum/core` (types + validator + tests)
- [x] `renderLanding()` emits `<section class="ov-hero" data-media>`
      with stacked light/dark `<img>` art layer + `.ov-hero-inner`
      wrapper for the text stack
- [x] CSS variant in `packages/site/src/templates/default/style.css`:
      suppresses dotted-noise pseudo-elements, gives the section min-
      block-size + flex centering, bottom mask-image fade so the visual
      recedes into the feature grid below
- [x] Two SVG assets — topographic contour bands, 12 stacked sinusoidal
      waves drifting at varied rates (24-42s loops). Theme-respecting
      stroke color per file.
- [x] `website/ovellum.config.json` wired up; build clean, `ovellum
      check` reports 0 broken links / 0 unsafe schemes; 17 pages

**Section scenes — shipped (2026-05-22):**

- [x] `site.landing.scenes: OvellumLandingScene[]` config in
      `@ovellum/core` (types + validator + tests). Each scene is
      `{ light, dark?, alt? }` — same shape as `hero.media`. SVG/PNG
      both supported; constraint relaxed from "SVG only" once user
      dropped photographic PNGs to seed the look.
- [x] `renderLanding()` interleaves scenes between rendered sections in
      order; extras fall through after the last section. Each
      `<section class="ov-scene">` carries an inline
      `--ov-scene-i` index so the drift animation staggers.
- [x] CSS in `style.css` (search "Ambient \"scenes\"") — centered
      inside landing column (inherits `--page-max: 1100px`),
      `aspect-ratio: 16 / 9`, `object-fit: contain` so the SVG keeps
      its intrinsic proportions, top+bottom mask-image fade. Wrapper
      is intentionally still; per-element animation lives inside each
      SVG asset (mirrors the hero pattern).
- [x] Imagery folder convention: user drops files in
      `{input}/public/` → build copies verbatim to `dist/public/<file>`.
      Hero SVGs migrated to the same folder; `tmp/` at the repo root
      is the maintainer's scratchpad (gitignored).
- [x] Website scenes re-authored as hand-rolled SVGs after a first pass
      with Gemini PNG drops — same three subjects (tree-house,
      farm-drone, woman-reading), now ~10KB each (was ~7MB PNG each).
      Each asset has named `.layer-*` / `.feature-*` / `.anim-*`
      groups with embedded `<style>` + `@keyframes` + a
      `prefers-reduced-motion` no-op fallback. Animated elements per
      scene: clouds, birds, canopy sway, stream shimmer (tree-house);
      windmill, drones, propellers, water shimmer (farm-drone); lake
      ripples, tower glow, falling leaves, robot tilt (woman-reading).
- [x] Hero references updated to `/public/hero-{light,dark}.svg`.
      Build clean: 17 pages, 0 warnings, 0 broken links, 0 unsafe
      schemes. Combined imagery footprint for the landing dropped
      from ~21MB raster to ~34KB SVG.

Touchstones used during the design: agora.xyz (calm chapter scenes),
Linear (motion budget reference), Stripe shape pages. Anti-example
held: Vercel homepage motion budget.

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
- [x] Cloudflare gray-cloud DNS setup documented in `guides/deploy.md`
- [x] `reference/security.md` public page (HTML sanitization, command-injection resistance, URL allowlist)
- [x] `guides/development.md` (init → dev → check → build workflow)
- [x] RSS auto-emit
- [x] Lighthouse CI workflow — informational only; uploads report as PR artifact, doesn't gate merges

> Phase 4.6 v0 (2026-05-16): the site builds locally (`pnpm -w run build:website`)
> with 15 pages and zero warnings. Deploy workflow committed.
>
> Phase 4.6 v1 (2026-05-17): live at <https://ovellum.oss.oinam.com> via
> GH Pages + Cloudflare DNS (gray cloud, Let's Encrypt cert from GH).
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
- [ ] Write unit tests for citty argument parsing (smoke tests cover the end-to-end behavior)

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

- [ ] **Custom font families via config (beyond the `site.font: 'sans' \| 'serif'` toggle).** The 2026-06-04 redesign shipped a system-font sans/serif switch (`site.font` → `data-font` on `<html>` → `--font-body` swaps `--font-sans`/`--font-serif`; code stays `--font-mono`). Future: let users name their own family — likely `site.font` accepts an object (e.g. `{ body, mono, source: 'system' | 'google' | 'local' }`) alongside the current string enum. Open design questions: webfont loading (the locked "no webfonts" principle in `STYLES.md §1.3` would need an explicit opt-out + FOUT handling), `@font-face`/preload injection, self-host vs CDN, and how it interacts with `headExtra`. **Not wired** — the enum is the only supported shape today; the CSS indirection (`--font-body`) is the seam a future implementation hangs off. **Live reference (2026-06-07):** the Ovellum website itself self-hosts Geist (sans) + Geist Mono (code) entirely from userland — `@font-face` + `--font-sans`/`--font-mono` overrides in `website/content/public/site.css`, preload + a pre-paint `data-typeface` script in `headExtra` (Inter/Satoshi kept declared for tinkering, `ovSetTypeface()` console helper). That's exactly what this feature should let users express via config instead of hand-rolled CSS, and the `data-typeface` attribute + localStorage + pre-paint pattern is a working blueprint for a future UI font picker (mirrors the theme toggle).
- [ ] **`site.minify` — minify USER-supplied assets at `ovellum build` (default on).** Today (2026-06-06) only the *default theme's* `style.css` / `script.js` ship minified — done at our package-build via `scripts/build-templates.mjs` (esbuild, dev-only), so no minifier ships to users and `ovellum build` stays a plain copy. That covers the common case (most users never touch the theme code; source is on GitHub for those who do). **Gap:** user-supplied assets aren't minified — forked templates, `.css`/`.js` dropped in `content/**` (passthrough), `site.headExtra` HTML, and the generated HTML pages. A future `site.minify` (default `true`) would minify the emitted CSS/JS (and optionally HTML) during the build. Implementation note: lazy-`import('esbuild')` so the lean-install promise survives — minify if esbuild is present, else copy verbatim with a one-line warning; or gate the esbuild dep behind the flag. Seam: `writeStaticAssets()` + the `content/**` passthrough branch in `build.ts`.
- [ ] **More customizable Home / Landing page.** Today the landing is config-driven but **fixed-shape**: `site.landing` renders hero → install snippets → feature grid → `_landing.md` pitch → trust strip in a hard-coded order, with scenes interleaved between them (see `renderLanding()` in `packages/site/src/template.ts`). Most people building a custom landing will want control over *where things go* — reorder/omit sections, repeat a section, add custom/free-form sections, choose per-section layout (e.g. feature grid columns, hero alignment, full-bleed vs contained), and drop in arbitrary markdown/HTML blocks. Likely direction: a `site.landing.sections: [...]` array (ordered, typed blocks: `hero` | `features` | `install` | `prose` | `trust` | `custom-html` | `scene` | …) that replaces the implicit order, with the current flat config kept as a shorthand/back-compat. Open questions: how composable to make it before it becomes a page-builder (scope creep), how it interacts with the planned plugin/template-override API, and whether `_landing.md` grows section markers vs staying a single pitch body. **Not scheduled** — flagged because the current fixed order is the first thing a custom-landing author hits.
- [ ] **i18n / multi-language docs (human languages — distinct from the source-language parsing below).** Make a site easy to author and ship in multiple languages, and localize the theme chrome. Two layers: **(1) Content i18n** — a per-locale content convention (`content/<locale>/…` vs a frontmatter `lang:`), locale-aware nav + routing, a language switcher in the topbar, `hreflang`/`<link rel="alternate">` between locale variants, per-locale `sitemap.xml` + RSS, and a fallback policy for untranslated pages. Pagefind already does **multilingual indexing** (it shards the index by the page's `lang`), so search mostly comes for free once pages carry the right `lang`. **(2) Chrome i18n** — the theme's UI strings are currently hard-coded English in `template.ts` ("On this page", "Previous"/"Next", "Edit this page", "N min read", "Updated", breadcrumb/aria labels, the default 404, etc.); extract them into a translatable strings table (per-locale, overridable). Plus `renderShell` hard-codes `lang="en"` — drive `<html lang>` (and `dir="rtl"` for Arabic/Hebrew) per locale. Likely config shape: `site.locales` + `site.defaultLocale`. Open questions: content layout convention, default-locale URL handling (`/` vs `/en/`), translation fallback, and scope (full i18n is large — could land content-i18n and chrome-i18n in separate passes). Seams: `renderShell` (`lang`/`dir`), the inline UI strings in `template.ts`, `nav.ts` (single-tree today), and the sitemap/RSS generators.
- [ ] **Back-to-top: JS-driven custom easing (optional polish).** Shipped 2026-06-07 as a pure-CSS solution: the button floats while scrolling and parks above the footer via a zero-height `position: sticky` anchor (`.ov-to-top-anchor` in the default theme), and the scroll-to-top uses `html { scroll-behavior: smooth }` gated by `@media (prefers-reduced-motion: reduce)` — the JS click handler is just `scrollTo({ top: 0 })`. **Gap:** `scroll-behavior` exposes no easing control, so the curve is the browser default (and on very long pages the smooth scroll can feel fast). A future enhancement could swap in a tiny (~15-line, no-framework) `requestAnimationFrame` loop with a real ease-out curve and a duration clamp, still honoring `prefers-reduced-motion` (instant jump) — opt-in so the CSS path stays the lean default. Seam: the `backToTop()` IIFE in `packages/site/src/templates/default/script.js`.
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
- [ ] **Ovellum for the AI age — MCP server and/or Claude Skill.** Open question whether the surface is an MCP server (tools like `ovellum_build`, `ovellum_check`, `ovellum_orphans`, `ovellum_query_symbol`, exposing the IR for agents to read/write), a Claude Skill (packaged guidance + scripts the model invokes locally), or both. Likely value: agents authoring docs against the same protected-zone / anchor model humans use — so AI-written prose lands inside `@manual:start` blocks and survives regeneration like any other manual content. Needs a design pass before scoping — pick when the v1 surface stops moving.

---

## Open Questions

Code-affecting design questions. Product decisions that block specific
tickets here (clean behavior, watch reload, `@preserve` semantics,
output-in-VCS default) live in [`TODO-Human.md`](./TODO-Human.md) under
"Product decisions". This section will reflect their outcomes once decided.

- [x] Confirm npm package name availability before Phase 0 is done
