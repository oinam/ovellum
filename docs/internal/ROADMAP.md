# ROADMAP — the 10x plan

Written 2026-06-12, after a full four-track audit of the codebase at v0.3.0
(CLI, site builder, engine packages, docs/website — each swept end-to-end).
This is the prioritized plan to make Ovellum 10x better on **features**,
**security**, and **usability**. Work items graduate from here into
`TODO.md` when they're picked up.

Legend: effort **S**mall (≤half day) / **M**edium (1–3 days) / **L**arge (multi-day, needs a design pass).

---

## Where we are (verified strengths — don't break these)

The audit confirmed the security posture is genuinely good; these are
verified properties, keep them pinned:

- **Escaping is systematic**: `escapeHtml`/`escapeAttr` on every text/attr
  interpolation in `template.ts`; `escapeXml` in sitemap/RSS; dedicated
  `escapeCopyAttr` in `build.ts`.
- **Sanitize-before-Shiki order is correct** in `markdown.ts` (rehype-raw →
  rehype-sanitize → shiki), pinned by tests.
- **No shell-string execution on user data**: `page-meta.ts` uses `execFile`
  with array args (test pins metacharacter safety); orphan filenames are
  slugified (`merger/src/orphans.ts`) so anchor IDs can't traverse paths.
- **No ReDoS** in the zone/anchor regexes (fixed patterns, no nested
  quantifiers); gray-matter YAML is safe-schema; config validation is
  exhaustive and eval-free.
- **Merger never silently loses prose** — every unplaced block is orphaned
  with metadata and a warning; the cursor logic can't skip or duplicate
  content (audited + tested).

**Audit false-positive on record:** a subagent flagged the `shell: true`
spawn in `commands/upgrade.ts` as a critical command injection. Verified
NOT exploitable — the command string comes only from the fixed
manager/scope allowlist in `update/install.ts` (`upgradeCommand()`); no
user input flows in. It stays on the hardening list (S1) as
defense-in-depth, not as a vulnerability.

---

## 1. Security hardening (near-term, all small — do as one slice)

None of these are exploitable today; they remove latent foot-guns and
document trust boundaries.

- [ ] **S1 (S)** `commands/upgrade.ts`: replace `spawn(command, {shell:true})`
      with argv-array spawn (split the allowlisted command ourselves). Removes
      the only `shell:true` in the codebase so future refactors can't make it
      dangerous.
- [ ] **S2 (S)** `dev/server.ts` `resolveFilePath()`: after the
      normalize+relative containment check, `realpathSync` the final path and
      re-verify it's under `rootDir` (closes the symlink escape). Also set
      `server.requestTimeout`/`headersTimeout` sane defaults and confirm/
      document localhost-only binding for `dev`/`serve`.
- [ ] **S3 (S)** `site/src/build.ts` passthrough copy: reject any
      `relFromInput` containing `..` (and skip symlinks that resolve outside
      the input dir) with a one-line warning. Today only an in-repo symlink
      could trigger it — cheap to close.
- [ ] **S4 (S)** **Document `site.headExtra` as a trust boundary**: JSDoc on
      the field in `@ovellum/core` types + a paragraph on the site's
      `reference/security` page ("headExtra is injected verbatim by design;
      only admins should set it"). It's intentional and tested — it just needs
      to say so where users read.
- [ ] **S5 (S)** `commands/init.ts`: validate the prompted input/output dirs —
      reject absolute paths and `..` segments before `path.join(cwd, …)`.
- [ ] **S6 (S)** `update/cache.ts`: write the cache file with mode `0o600`.
      `update/registry.ts`: add `redirect: 'error'` to the fetch and keep the
      response-size expectation tight.

## 2. Features — the 10x bets

### Tier A — deepen the moat (the hybrid merge engine)

Nobody else has the protected-zone/orphan model; these multiply it.
A1 unlocks A2–A4.

- [x] **A1 (M)** **IR persistence** — write the parsed `DocProject` IR to
      `.ovellum/ir.json` after each auto/hybrid build. Foundation for diff,
      rename detection, and last-seen tracking. **Done 2026-06-24:**
      `dev/ir.ts` `writeProjectIR` persists `{generator, format, version,
      project}` to `<cwd>/.ovellum/ir.json` (project root, not output dir;
      unaffected by `--out`); reported as the `ir:` summary line. Next: A2/A4
      read it.
- [x] **A2 (M)** **`ovellum diff`** — compare current source IR against the
      persisted one; report added/removed/changed symbols (and which docs
      would change) without writing. CI-friendly `--json`. **Done 2026-06-24:**
      `commands/diff.ts` + pure `dev/diff.ts` `diffProjects`; matches by anchor
      id (rename = remove+add, A3 separate), flattens members, ignores
      `line`/`filePath`, maps docs via `outputPathFor`; `--json` + `--exit-code`
      (git-diff style). Next consumer of the A1 snapshot; A3/A4 still open.
- [x] **A3 (L)** **Rename detection (suggest-only)** — when an anchor disappears
      and a similar symbol (same signature shape, fuzzy-matched name, same-file
      or moved-file) appears, offer the remap instead of orphaning. Kills the #1
      cause of orphans (refactors). **Done 2026-06-24:** pure `dev/rename.ts`
      `detectRenames` (kind gate + Levenshtein name sim + signature-shape sim +
      same-file bonus, greedy 1:1 ≥0.6); surfaced in `diff` (likely-renames
      section + JSON) and at build time (`did X become Y? … reattach` warning
      over the prior snapshot). **Remaining: the actual `--reattach` write
      action** (folds into A4's interactive slice).
- [~] **A4 (M)** **`ovellum orphans` CLI** — list (default), `--stale`,
      interactive reattach/delete. The merger already returns full
      `OrphanRecord`s; this is surface area, long promised in docs (marked
      "planned"). Populate `anchorLastSeen` from the persisted IR (A1).
      **Read slice done 2026-06-24:** `commands/orphans.ts` + pure
      `dev/orphans.ts` (`parseOrphanFile` round-trips the writer, `loadOrphans`,
      `summarizeOrphans`); default list + `--stale` + `--json`; anchor
      present/gone/unknown vs the IR snapshot; `run-build.ts` now stamps
      `anchorLastSeen` from the prior snapshot. **Remaining: interactive
      reattach/delete** (the write side).
- [ ] **A5 (S)** **`@preserve` auto-wrapping** — generator emits
      `@manual:start/end` around `@preserve`-tagged JSDoc content; merger
      already treats them uniformly. IR flag (`isPreserved`) exists; this is
      generator wiring.
- [ ] **A6 (M)** **Validation mode in reader** (`ovellum check --strict`
      grows): warn on positional-fallback zones (no `id=`), anchors pointing
      at no-longer-existing symbols, required frontmatter fields.
- [ ] **A7 (L)** **Incremental watch builds** — re-parse only changed files,
      re-merge only affected outputs. Matters once real codebases (>100
      files) adopt hybrid mode.

### Tier B — site-builder parity (vs Docusaurus/VitePress/Starlight)

- [ ] **B1 (L)** **Plugin/extension API** — two seams: (a) user-supplied
      remark/rehype plugins via config, (b) template overrides (start with
      "bring your own template directory", not a component system). This is
      the single most-requested-shaped gap; everything custom today requires
      forking. Needs its own design pass (already flagged in TODO).
- [ ] **B2 (S)** **MDX tier 1** — treat `.mdx` as Markdown: widen the two
      `isMarkdown` regexes (`nav.ts`, `build.ts`) + reader extension list. No
      JSX evaluation; ships `.mdx` authoring immediately. (Tier 2 full
      `remark-mdx` stays deferred.)
- [ ] **B3 (S)** **Wire `links.ts` into the build** — `extractMarkdownLinks()`
      exists, is exported, and is never called. Surface broken internal links
      as build warnings (and let `check` share the implementation).
- [ ] **B4 (M)** **Custom fonts via config** — `site.font` accepts an object
      (`{ body, mono, source }`); the website's self-hosted Geist setup is the
      working blueprint (`data-typeface` + pre-paint script + `@font-face` in
      userland CSS). Includes the FOUT/opt-out story per STYLES.md §1.3.
- [ ] **B5 (M)** **Composable landing** — `site.landing.sections: [...]`
      ordered typed blocks (hero | features | install | prose | trust |
      scene | custom-html); current flat config stays as shorthand. First
      thing every custom-landing author hits today.
- [ ] **B6 (L)** **Versioned docs** — directory-per-version + version
      selector in the topbar. Table-stakes for libraries with maintained
      majors.
- [x] **B7 (L)** **i18n / multi-language — SHIPPED (v0.8.0 + v0.11.0).** Full
      engine + English↔Japanese 1:1 site; chrome-string localization + RTL;
      per-locale `check` + translation-staleness. Only gap left: per-locale RSS.
      Design locked
      2026-06-14 (planning session). Scope agreed: build the full engine + a
      **single Japanese demo** on 2–3 pages (landing + getting-started), English
      canonical + fallback. **Skip `en-GB`** — after standardizing on American
      spelling it's a near-duplicate differing only in spelling; pure
      maintenance, no reader value. More languages = community PRs later.
  - **Language codes = BCP 47** (not "EN"/"jp"/"ch"): `en-US`, `ja`, `zh-Hans`
        (Simplified) / `zh-Hant` (Traditional), `ko`, etc. UK English is
        **`en-GB`** (GB, not UK). Selector labels use the **autonym** (語: 日本語,
        简体中文, …), not the English name.
  - **Opt-in, zero breakage:** unset `site.locales` → today's single-language
        behavior unchanged. i18n activates only when locales are defined.
  - **Content = locale subtrees:** `content/<locale>/…` (e.g. `content/en-US/`,
        `content/ja/`). Pages map across languages by **identical relative
        path** (that's what the selector follows). Per-locale `_meta.json`/nav.
  - **URLs = default-at-root, others prefixed:** `defaultLocale` → `/guide/`;
        others → `/ja/guide/`. A site adding i18n moves existing content into
        `content/<defaultLocale>/` once; non-i18n sites untouched.
  - **Config shape:** `site.defaultLocale` + `site.locales: [{ code, label }]`.
  - **Selector placement (maintainer-specified):** right cluster, **after the
        "Docs" link, before the divider** preceding the GitHub/npm icons. Globe
        dropdown of autonyms; switching → same page in target locale, else
        **fall back** to that locale's home (partial translations are fine).
  - **Per-page:** `<html lang>`, `hreflang` alternates between translations,
        per-locale sitemap/RSS, Pagefind per-`lang` shard (already supported).
  - **"Written or generated":** tool renders whatever's in each locale folder;
        author by hand or pre-translate however you like.
  - **Chrome strings:** second pass — extract hard-coded English UI strings in
        `template.ts` (e.g. "Edited", "min read", "On this page", appearance
        labels) into a per-locale string table; drive `<html dir>` for RTL
        (Arabic/Hebrew) — RTL itself deferred past v0.8.0.
  - **On-brand differentiator (consider for v0.8.0 or headline v0.9.0):**
        **translation-staleness check** — store the source page's content hash
        in each translation's frontmatter; `ovellum check` flags "English
        changed, `ja` is stale." This is the anti-drift identity applied to
        translations — no static i18n does it well. Strong fit.
- [ ] **B8 (M)** **Build-output severity levels** — split the `warnings[]`
      bag into info/warning (or add a severity enum) so real problems aren't
      buried under "sitemap skipped" notes; CLI renders them distinctly.
- [ ] **B9 (M)** **Image optimization** (lazy-import `sharp`, same pattern as
      the planned `site.minify` esbuild gating) and, later, OG-image
      generation per page.

### Tier C — the AI age ("AI-Ready" theme)

**Theme (proposed, design NOT yet locked — task prepared 2026-06-14 on
maintainer request; "we won't do now, but prepare").** Make Ovellum
**AI-Ready / AI-Native** along three independent surfaces — the docs it
*emits*, the tool an agent *drives*, and the packaging that tells an agent
*how*. They ship as separate slices; C1 (output) is cheap and standalone, C3
(CLI) overlaps U4, C2 (MCP) is the headline and needs IR persistence (A1)
first. Sequence: **C1 → C3 → C2 → C4/C5**.

The framing to hold: Ovellum's identity is the anti-drift hybrid contract —
hand prose and generated docs co-exist and survive regeneration. The
AI-Ready story is *the same contract extended to agents*: an agent reads the
docs as clean Markdown (C1), drives builds/checks with machine-readable I/O
(C3), and writes prose into protected zones over MCP that survives the next
regeneration exactly as a human's does (C2). That last point is the
differentiator no other docs tool can make.

#### C1 — AI-friendly documentation output (the `llms.txt` standard)

- [x] **C1 (S–M) — SHIPPED 2026-06-14.** `site.ai` block; `/llms.txt` (default
      on), `/llms-full.txt` (default off), per-page `.md` mirrors (default on);
      per-locale, drafts/404 excluded, HTML byte-identical. Code in
      `packages/site/src/llms.ts` + `build.ts`; `llms.test.ts`. **Deferred
      follow-up:** head `<link rel="alternate" type="text/markdown">` +
      `robots.txt` mention. Original plan below. — Emit AI-consumable docs
      alongside the HTML at build. We
      already hold the rendered Markdown, so most of this is plumbing + a
      config gate. Three artifacts, per the emerging
      [llmstxt.org](https://llmstxt.org) convention:
  - **`/llms.txt`** (site root) — a curated, link-first **index**: site title
        + one-line description, then a flat or sectioned list of every page as
        `[Title](url): one-line summary`. Summary comes from frontmatter
        `description` → first paragraph fallback. This is the map an agent
        fetches first.
  - **`/llms-full.txt`** — the **entire docs corpus concatenated** as one
        Markdown stream (front-matter-stripped, H1-delimited per page, in
        sidebar order). One fetch, whole-site context. Gate behind a size note
        — warn if it gets large.
  - **Per-page `.md` mirror** — the raw Markdown for each page at a
        predictable URL. Convention to settle in the design pass: **append
        `.md` to the page URL** (`/guide/intro/` → `/guide/intro.md` or
        `/guide/intro/index.md`). Lets an agent (or a human `curl`) get clean
        source for any single page without HTML-stripping.
  - **Config:** opt-in `site.ai` block — at minimum `{ llmsTxt?: boolean,
        fullText?: boolean, mdMirror?: boolean }` (bikeshed names in design).
        Decide default-on vs default-off: leaning **default-on for `llms.txt`
        + `.md` mirror** (cheap, pure upside, strong adoption signal) and
        **default-off for `llms-full.txt`** (can be heavy). Single-language
        output must stay byte-identical when the block is unset.
  - **i18n:** per-locale variants — `/llms.txt` for the default locale,
        `/ja/llms.txt` for others (reuses the locale-subtree plumbing). Drafts
        excluded always (same rule as sitemap/RSS/hreflang).
  - **Discoverability:** optional `<link rel="alternate" type="text/markdown">`
        per page pointing at its `.md` mirror; mention `llms.txt` in
        `robots.txt`/head if cheap.
  - **Hybrid/auto mode bonus:** when docs are generated from source, the `.md`
        mirror is *already* the merger's canonical Markdown — the AI mirror and
        the human source are the same artifact. Worth calling out as the
        natural fit.

#### C2 — MCP server (the headline; needs A1 first)

- [~] **C2 (L)** Ship Ovellum as an **MCP server** so agents drive it as a
      first-class tool. Form: a new `ovellum mcp` subcommand launching a
      **stdio MCP server** (preferred over a separate package — one install,
      one binary; revisit if it bloats the CLI). Needs its own design pass.
      **A1 (IR persistence) is the hard prerequisite** for the query/write
      tools — they read `.ovellum/ir.json`. **Done 2026-06-24:** `ovellum mcp`,
      a **dependency-free** hand-rolled JSON-RPC stdio server (`dev/mcp/`, no SDK
      so the published CLI stays lean). Tools: `ovellum_query_symbol`,
      `ovellum_diff`, `ovellum_list_orphans`, `ovellum_get_page`,
      `ovellum_build`, and the differentiator **`ovellum_write_zone`**
      (`applyWriteZone` — write prose into a `@manual` zone that survives hybrid
      regen; `dryRun`). **Deferred:** `ovellum_check` (needs C3 JSON),
      `ovellum_search_docs` (Pagefind index). If the no-SDK choice ever fights
      protocol drift, revisit `@modelcontextprotocol/sdk`.
  - **Read tools (ship first, low risk):** `ovellum_build`, `ovellum_check`
        (returns structured findings — reuse C3's JSON), `ovellum_query_symbol`
        (look up a symbol in the persisted IR — signature, anchor, source loc),
        `ovellum_search_docs` (over the site's Markdown/Pagefind index),
        `ovellum_get_page` (the C1 `.md` mirror for one page),
        `ovellum_list_orphans` (once A4 lands).
  - **The write tool (the differentiator):** `ovellum_write_zone` — an agent
        writes prose into a **protected zone** addressed by anchor id; the
        merge engine guarantees it survives the next regeneration, exactly the
        contract a human editing between `@manual:start/end` gets. This is the
        single feature no other docs MCP can offer — it's the hybrid moat
        exposed to agents. Design must cover: addressing (anchor id vs
        symbol), conflict/orphan behavior on write, and a dry-run/preview.
  - **Packaging overlap with C4** (Claude Skill) — decide whether the Skill
        wraps the MCP server or stands alone.
  - Backlog already sketches this; keep the tool surface small and
        IR-backed rather than shelling out per call where avoidable.

#### C3 — AI-usable CLI (machine-readable I/O — folds in U4)

- [ ] **C3 (M)** An agent shouldn't *need* MCP to drive Ovellum — a clean CLI
      contract is the floor. **Largely the same work as U4** (`--json` +
      `--verbose`); pull it forward under the AI-Ready theme and treat the
      machine-readable surface as a first-class deliverable, not a CI
      afterthought.
  - **`--json` on `build` / `check` / `diff`** — structured results (counts,
        warnings with severity per B8, broken links, stale translations, draft
        exclusions, orphan list) as a stable schema an agent parses. No
        decorative output on the JSON path.
  - **Stable exit codes + structured errors** — distinct codes for
        config-invalid / build-failed / check-found-issues so an agent
        branches without scraping stderr.
  - **Quiet/non-TTY hygiene** — already good (update notifier suppresses in
        CI); confirm every command degrades cleanly when piped.
  - **Document the contract** — a `/docs/guides/automation/` (or
        `…/ai-agents/`) page: the JSON schemas, exit codes, and "drive Ovellum
        from a script/agent" recipes. This is also where C1/C2 get
        cross-referenced.

#### C4 — agent packaging (Claude Skill / `AGENTS.md`)

- [ ] **C4 (S–M)** Tell agents *how* to use Ovellum, in the formats agents
      look for. Two cheap, high-signal artifacts:
  - **A Claude Skill** (`SKILL.md` + the MCP wiring or CLI recipes) — "set up
        and maintain Ovellum docs" — so it's one-step adoptable in Claude Code.
  - **An `AGENTS.md`** at the repo root (and/or scaffolded by `ovellum init`)
        describing the hybrid contract, protected-zone rules, and the commands
        an agent should run. This is the convention coalescing across tools for
        "instructions to coding agents." Cheap to write, meets agents where
        they look.

#### C5 — positioning (do alongside C1, not as code)

- [ ] **C5 (S)** Once C1 ships, say so where adopters read: a short
      **"Ovellum for AI / agents"** landing or docs section — "your docs are
      `llms.txt`-ready out of the box; agents can read and *safely edit* them."
      Editorial-calm, no hype. This is the close-circle-announcement-grade
      surface the maintainer cares about (no stale facts) — write it only after
      the feature is real.

### Tier D — Embed & deploy anywhere ("the portable build" — NEXT BIGGEST RELEASE)

**Theme (maintainer-requested 2026-06-14, flagged "the next biggest
release"; design NOT yet locked).** Make Ovellum a clean, embeddable **build
step** that any external tool / CI / framework can drive and then **deploy on
its own terms** — never dependent on GitHub (or any specific host). The
driving principle, and the message to lead with:

> **Ovellum builds; the host deploys. Deploy is not Ovellum's job.** Ovellum's
> one guarantee is a *portable, deterministic static folder*. What happens to
> that folder — GitHub Pages from `/docs`, Netlify, Vercel, Cloudflare Pages,
> S3/CDN sync, or a host tool's own pipeline — is the host's choice. Our repo's
> GitHub Actions is *our site's* wiring, not a product requirement.

This matters most for **hybrid builds embedded in someone else's system**: the
host project runs Ovellum as a step (merging generated API docs + hand prose),
gets a static `dist`/`docs` folder, and its existing deploy takes over. The
"hook to let their tool deploy" is really three layered contracts below.

**Where we already are (verified 2026-06-14):** `config.output` exists (default
`./docs`) — so *GitHub Pages from a repo's `/docs/` folder already works with
**zero** Actions* (`ovellum build` → static files → Pages serves them). The gap
is everything that lets a *non-human tool* drive it cleanly + know what came
out.

- [x] **D1 (S) — `--out`/`--base` SHIPPED 2026-06-14** (`applyOverrides` in
      `run-build.ts`; flags on the build command). **Still in C3:** the
      `--json` machine-readable output (deferred with U4) and the
      idempotent-clean-output semantics (today the build `mkdir`s but doesn't
      clean — left as-is, documented behavior). Original below. — Add
      `ovellum build --out <dir>` and `--base <path>` overrides (output is
      config-only today — no `.option()` on `build`). Pair with **C3's
      `--json`** so a host pipeline parses the result instead of scraping
      stdout. Guarantee **idempotent output** — clean-or-reconcile the target
      dir so repeated builds are diffable and deploys atomic (today the build
      `mkdir`s but doesn't clean — confirm + document the semantics).
- [ ] **D2 (M) — Programmatic build API (the real "hook").** Export a public
      `build()` / `check()` from the **`ovellum`** package returning a
      structured `BuildResult { outDir, pages[], assets[], warnings[], locales }`
      — `import { build } from 'ovellum'` (or subpath `ovellum/api`). **This
      flips the parked decision** (TODO "Parked" #2: `@ovellum/*` bundled-private
      — "if anyone asks for direct imports, the bundling decision needs to
      flip"). Expose a **curated facade from `ovellum`**, NOT raw `@ovellum/*`
      imports (keep internals private; we control the surface). **Concrete
      prerequisite/bug:** today `ovellum`'s `exports["."]` runs the CLI as a
      *side effect* (`runMain` in `index.ts`) — importing it executes the CLI.
      Split the entry: `bin` stays the CLI runner; `main`/`exports["."]` (or
      `exports["./api"]`) becomes the side-effect-free library. `buildSite()`
      (in `@ovellum/site`) already returns `BuildSiteResult{ outputDir, … }` —
      this is mostly surfacing it through a stable public type.
- [ ] **D3 (M–L) — Build lifecycle hooks (the literal deploy hook; shares B1's
      seam).** `onResolveConfig`, `onBuildStart`, `transformPage` (per-page
      HTML/MD), `onBuildComplete({ outDir, manifest })`. **A host tool's deploy
      logic lives in `onBuildComplete`.** This is the same plugin seam as **B1**
      (plugin/extension API) — design them together; the deploy hook is the
      first concrete consumer that justifies B1. Keep it a thin, typed lifecycle
      (config-supplied functions) before any component system.
- [x] **D4 (S–M) — SHIPPED 2026-06-14** via `ovellum build --manifest`
      (`dev/manifest.ts` `writeDeployManifest`; sorted, sha256, OS-junk +
      own-dir excluded; `manifest.test.ts`). Original below. — Emit `<output>/.ovellum/manifest.json`:
      every written file (path, route, content hash, byte size) + build
      metadata (version, locales, draft-excluded count). Lets a deploy tool do
      **incremental / atomic** uploads (S3/CDN sync, cache-bust, completeness
      verify) instead of blind-copying. Pairs with D1 `--json` and the C-tier
      machine-readable theme.
- [ ] **D5 (S) — "Deploy anywhere" recipes + positioning (docs, not code).** A
      `/docs/guides/deploying/` page: GitHub Pages from `/docs` (no Actions),
      Netlify / Vercel / Cloudflare Pages (build command + publish dir),
      S3/CDN sync via the D4 manifest, and **embedding the build in a host
      pipeline** (monorepo / Vite / turbo / another SSG's `/docs`). Lead with
      "Ovellum never deploys; it builds a portable folder." Write after D1–D4
      are real (no stale facts in a public surface).

**Sequencing within D:** D1 (cheap, unblocks scripted use immediately) → D4
(manifest, cheap, high leverage) → D2 (API, flips the bundling decision) → D3
(hooks, co-designed with B1) → D5 (docs/positioning). D1+D4 alone deliver "any
tool can build + deploy Ovellum output" — D2/D3 make it *embeddable in-process*.

**Cross-references:** overlaps **C3** (`--json`, machine-readable CLI — D1
depends on it), **B1** (plugin API — D3 is its first real consumer), and the
parked **`@ovellum/*` bundled-private** decision (D2 flips it). Decide whether
Tier C (AI-Ready) or Tier D ships first when picked up — they share the
machine-readable-CLI groundwork (C3 ≈ D1).

## 3. Usability

- [ ] **U1 (M)** **Troubleshooting page** (`/docs/guides/troubleshooting/`):
      zones not merging, unbalanced tags, config not loading, basePath/asset
      gotchas, orphan recovery walkthrough.
- [ ] **U2 (M)** **Migration guide** (`/docs/guides/migration/`): from
      TypeDoc, from hand-written-only, with a short capability comparison
      (generation / merge / orphan handling). The skeptical-adopter page.
- [ ] **U3 (S)** **Init scaffolds a protected-zone example** in hybrid mode
      ("Add your own notes here — this block survives every rebuild") +
      document the `--yes` fast path in the development guide.
- [ ] **U4 (M)** **`--verbose` global flag** (config-resolution path, file
      I/O detail) and **`--json` output** on `build`/`check`/`diff` for CI.
- [ ] **U5 (S)** **Better small messages**: registry-failure hint in
      `upgrade`, drop the internal "TODO.md Phase 6" reference from the `dev`
      mode error, optional request log on the dev server, relative paths in
      init errors.
- [ ] **U6 (S)** **Docs quick wins** (one slice): add `footerNav` to the
      config-reference interface block; one-sentence mode explainer on the
      landing above the install snippets; link `examples/` from the
      manual/hybrid guides; reframe hybrid-mode limits as "what's stable".
- [ ] **U7 (M)** **"Why hybrid" comparison section** in the hybrid guide —
      before/after regeneration story vs TypeDoc and vs hand-written prose.
- [x] **U8 (M)** **Drafts — SHIPPED (v0.9.0, "the Editor" slice 1).** Design locked
      2026-06-14 (planning session). Model: a draft is **dev-visible, never
      published** — WIP you preview locally (and the team sees in source), then
      decide whether to publish.
  - **Declared by frontmatter `draft: true`** (primary, per page) +
        **`_meta.json "draft": true`** (whole folder, cascades — parallels the
        existing `hidden`). **NOT** a Jekyll-style `_drafts/` folder (clunky,
        breaks co-location, move-to-publish). Co-located frontmatter beats
        Jekyll.
  - **Repurpose the existing `draft: true`** (today it's excluded *everywhere*,
        nav.ts:242 + build.ts:447 return null) → **excluded in production
        `build`, INCLUDED in `dev`/`watch`/`serve`** with a ribbon + sidebar
        badge. Standard meaning (Hugo `buildDrafts`). **Behavior change** —
        note in the changeset. `draft` ≠ `ignoreFiles`: **`ignoreFiles` is full
        exclusion — never parsed or rendered, in any environment** (the user's
        explicit framing); `draft` is parsed + rendered in dev only.
  - **Automatic by command** (no `--drafts` flag to remember, unlike Jekyll):
        dev/watch/serve include drafts, `build` excludes. Overrides:
        `build --drafts` (preview prod w/ drafts), `dev --no-drafts` (simulate
        prod). Plumb an `includeDrafts` flag into `BuildSiteOptions` (today it's
        just `{config,cwd,now}` — build has no dev/prod signal).
  - **Ribbon** — a sticky top band on every draft page: *"Draft — visible
        locally only, never published."* Only ever renders in dev (drafts don't
        exist in prod), so the message is self-true.
  - **Sidebar badge** — a small "Draft" tag next to draft pages in the nav
        (user confirmed they want this).
  - **Build transparency** — `ovellum build` prints *"N draft pages excluded"*
        so a draft never silently vanishes from production.
  - Drafts stay out of **sitemap / RSS / hreflang** always, and out of the i18n
        picker's "translated" set.
  - **Caveat to document:** drafts are *unpublished, not secret* — they live in
        source, so anyone with repo access sees them (that's the point: backed
        up, PR-reviewable, team-visible). True secrecy = gitignore the file.
  - Fits the broader v0.9.0 "Editor" theme (authoring/preview experience);
        drafts are the first slice.

---

## Suggested sequencing

1. **Slice 1 — hardening + quick wins (1 day):** S1–S6 + B3 + U5 + U6.
   Small diffs, all verifiable, clears the audit list.
2. **Slice 2 — hybrid moat foundation:** A1 → A4 → A2 (IR persistence,
   orphans CLI, diff). Ships the long-promised `orphans` command and the
   first genuinely-new capability since 0.3.0. Likely **0.4.0**.
3. **Slice 3 — adoption surface:** U1 + U2 + U3 + U7 + B2 (MDX tier 1) +
   C1 (llms.txt). Docs-heavy, low risk, big first-impression payoff.
4. **Slice 4 — the big bets, each its own design pass:** B1 (plugin API),
   A3 (rename detection), B6/B7 (versions/i18n), C2 (MCP). Pick by appetite.

> **Update 2026-06-14:** 0.4.0–0.7.0 shipped (appearance control, palettes,
> publicDir, media + scoped-iframe embeds, bundled font picker + text-size,
> Styleguide, assetBaseUrl, "Edited" dates, American-English spelling). **B4
> "custom fonts via config" is largely delivered** by 0.7.0's bundled font
> picker (revisit only for arbitrary userland fonts). **v0.8.0 focus = B7
> (i18n)** — design locked above; English-canonical + a Japanese demo.
>
> **Update 2026-06-14 (later): v0.8.0 SHIPPED** (i18n + full English/Japanese
> site + locale-aware nav + breadcrumb fix). **v0.9.0 focus = U8 (Drafts / "the
> Editor")** — design locked above: `draft: true` repurposed to dev-visible/
> prod-excluded, `_meta.json "draft"` for folders, automatic by command, ribbon
> + sidebar badge + build warning.
>
> **Update 2026-06-14 (later still): v0.9.0–v0.11.0 SHIPPED** (drafts; smarter
> "Edited" dates; footnotes; i18n completed end-to-end). **Two themes prepared,
> not started:**
> - **Tier D "Embed & deploy anywhere" — flagged THE NEXT BIGGEST RELEASE**
>   (maintainer, 2026-06-14): a portable, embeddable build any tool can drive +
>   deploy without GitHub. D1 `--out`/`--base` + `--json`, D2 programmatic
>   `build()` API (flips the parked `@ovellum/*` bundled-private decision), D3
>   lifecycle hooks (the literal deploy hook; co-design with B1), D4 deploy
>   manifest, D5 recipes. `config.output` (default `./docs`) already gives
>   Pages-from-`/docs` with zero Actions — D fills the tool-driven gap. Design
>   NOT locked.
> - **Tier C "AI-Ready"** — C1 `llms.txt`/`.md` mirror output, C2 MCP server,
>   C3 machine-readable CLI, C4 Skill/`AGENTS.md`, C5 positioning. Prepared at
>   the maintainer's "prepare for later" request. **C3 ≈ D1** (shared
>   machine-readable-CLI groundwork) — sequence the two together when picked up.
>
> **Update 2026-06-14 (later still): C1 + D1 + D4 SHIPPED** as one AI-themed
> slice (the "build out the two AI big features" request). **C1** = `site.ai`
> → `llms.txt` / `llms-full.txt` / per-page `.md` mirrors (per-locale). **D1** =
> `ovellum build --out`/`--base`. **D4** = `--manifest` → hashed deploy
> inventory. All on `main`, 343 tests green, en+ja docs + FEATURES updated,
> changeset staged. **Not yet built (the design-locked / prerequisite-bound
> rest):** C2 MCP server (needs A1 IR persistence + design pass), C3 `--json`
> (with U4), C4 Skill/`AGENTS.md`, C5 positioning page; D2 programmatic `build()`
> API (flips `@ovellum/*` bundled-private), D3 lifecycle hooks (with B1), D5
> deploy recipes.

---

## Full audit findings (reference)

Severity-verified highlights not already itemized above; the four raw
subagent reports were synthesized 2026-06-12 — items below are the
remainder worth remembering, all low priority:

- `dev/server.ts`: port-check → listen race (acceptable for a dev server);
  TOCTOU between `existsSync` and `statSync` in the `.html` fallback (wrap
  in try/catch).
- `commands/build.ts`: redundant manual mode re-validation after schema
  validation — drop one.
- `update/notifier.ts`: config-load errors are swallowed to defaults — fine
  for a notifier, but emit under `--verbose` once U4 exists.
- Orphan filename collisions (same slug, same day) overwrite — add a
  counter suffix when it ever bites.
- Hybrid mode overwrites manual frontmatter on regeneration (by design;
  custom frontmatter preservation would need its own design).
- `ovellum clean` remains unimplemented and is correctly documented as
  planned; lower value than `orphans`, keep deferred.
