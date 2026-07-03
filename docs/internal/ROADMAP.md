# ROADMAP — the 10x plan, second edition

Written 2026-07-03, after the [first edition](./ROADMAP-2026-06.md) was
essentially cleared (0.4.0 → 0.21.0 shipped its Tiers A/C/D, all hardening,
all usability items; see that file for the historical record and
[`FEATURES.md`](./FEATURES.md) for what works today). This edition folds in
the first edition's surviving deferred slices, the unadopted remainder of
[`COMPETITIVE.md`](./COMPETITIVE.md), the outcome of
[`COMPETITIVE-OPENWIKI.md`](./COMPETITIVE-OPENWIKI.md) (its four adopt items
shipped 2026-07-02 as `ovellum agents` + guides), and a proposed path to
`v1.0.0`. Work items graduate into `TODO.md` when picked up.

State at writing: `ovellum@0.21.0` live on npm; one pending changeset
(`ovellum agents`, minor → 0.22.0).

Legend: effort **S**mall (≤half day) / **M**edium (1–3 days) / **L**arge
(multi-day, needs a design pass). Items marked *(proposal)* have no maintainer
decision yet — pitch before building.

---

## What we never break

The moat and the verified strengths, condensed (details + audit provenance in
the first edition):

- **The hybrid contract** — generated docs and hand prose in the same file;
  protected zones survive regeneration; orphans are quarantined, never lost;
  rename detection + reattach. Nobody else has this.
- **Agent-editable docs** — the MCP server's `write_zone` (+ tools, resources,
  prompts), `llms.txt` / `.md` mirrors, `AGENTS.md` / `ovellum agents`. The
  free tool is the most AI-native docs tool available.
- **Deterministic, portable, free** — no LLM in the build, no API keys,
  byte-identical output, a static folder any host deploys; `--json` + stable
  exit codes; programmatic API + plugin hooks.
- **Security posture** — systematic escaping, sanitize-before-Shiki, argv
  spawns, path containment on every file seam, safe-schema YAML. Unset config
  = byte-identical output is a repeated, test-pinned property; keep it true.
- **Editorial-calm design** — locked primitives in `SITE.md` / `STYLES.md`;
  no chrome, no cartoon, no emoji.

## The path to v1.0.0 *(proposal — needs the maintainer's yes)*

0.x has been feature-sprint; 1.0 is a **promise-keeping release**, not a
feature. Proposed gate — declare 1.0 when:

1. **Stability contract written** (V1) — what semver covers: config schema,
   programmatic API, plugin hooks, MCP tool names, CLI flags/exit codes,
   the theme token contract (`--color-*`, `ov-*` classes).
2. **Platform proof** (V2) — CI green on Windows + macOS, not just Ubuntu.
3. **Performance floor** (V3) — a benchmark in CI so build-time regressions
   surface before users feel them.
4. **Authoring parity holds** (W1 shipped) — snippets/includes was the last
   real gap vs the incumbent's component library.

Everything in Tier H explicitly does **not** gate 1.0.

---

## Tier F — finish lines (carryovers from the first edition)

Small, already-designed remainders. Clear these first; they're cheap and they
close open loops.

- [ ] **F1 (M)** **Images, slice 3** (B9 remainder): `site.images.maxWidth`
      resize cap; AVIF as a `format` target; `<picture>`/`srcset` emission
      (design: Markdown-body only, same seam as the WebP rewrite); OG-image
      coverage for composable-landing pages.
- [ ] **F2 (S–M)** **Versioning polish** (B6 slice 2): `noindex` + sitemap
      exclusion for non-latest versions; an "you're viewing an old version"
      banner (editorial-calm, one line); a `version snapshot` command that
      copies current content into `content/<id>/` and updates config.
- [ ] **F3 (S)** **AI discoverability** (C1 remainder): per-page
      `<link rel="alternate" type="text/markdown">` pointing at the `.md`
      mirror; mention `/llms.txt` in `robots.txt`.
- [ ] **F4 (S)** **Paper-cut hardening** (audit leftovers, one slice): orphan
      filename collision counter suffix; dev-server `.html`-fallback TOCTOU
      try/catch; update-notifier config-load errors surfaced under
      `--verbose`.

## Tier W — authoring power (the remaining COMPETITIVE.md adopts)

- [ ] **W1 (M)** **Reusable snippets / includes (partials).** The one real
      authoring gap left vs the incumbent. Author once under `_snippets/`
      (or any underscore-prefixed dir — already nav-excluded by convention),
      include with a Markdown-native directive (`::include{file=…}`), reusing
      the B2 `remark-directive` pipeline. Design must cover: recursion guard,
      path containment (no `..` escapes — same rule as everywhere), snippet
      frontmatter (ignored vs merged), i18n (per-locale snippets fall back to
      default locale), and `check` validating include targets. Sanitize stays
      the guard. *Highest-impact item in this edition.*
- [ ] **W2 (S–M)** **Changelog page type.** A first-class "Updates" page:
      date-grouped entries with stable anchors, rendered from one Markdown
      file with a light directive or heading convention (no new file format),
      optional inclusion in the RSS feed. Complements the humanized "Edited"
      dates.
- [ ] **W3 (M)** **Migration importer.** U2 shipped the guide; this is the
      converter — map a hosted platform's config + component syntax to
      `ovellum.config.ts` + our directives. **Open naming tension:** an
      importer flag names the source platform, but the never-name rule covers
      shipped surfaces — resolve with the maintainer before building (options:
      a generic `--from <dir>` heuristic importer, or accept naming
      OSS-importable formats only).
- [ ] **W4 (S, backlog)** **Print/PDF.** Start with a print stylesheet
      (cheap, editorial-calm); real PDF export only if demand shows up.

## Tier G — moat multipliers

- [ ] **G1 (M)** **`ovellum coverage`** *(proposal)* — docs-health report from
      the IR: % of exported symbols with a description, with `@param`/
      `@returns` docs, with a `@manual` zone; per-file breakdown; `--json` +
      a `--min <pct>` CI gate. The anti-drift identity made measurable —
      pairs with `check`/`diff` as the third leg of the CI story, and no
      generator-adjacent tool offers it. Small design pass (what counts as
      "documented"; how hybrid zones weigh).
- [ ] **G2 (M)** **Hybrid custom-frontmatter preservation.** Today
      regeneration overwrites user-added frontmatter keys on generated docs
      (by design, first-edition audit note). Design a merge policy: generator
      owns its keys (`ovellum`, `title`, …), unknown keys survive — the
      protected-zone idea applied to frontmatter.
- [ ] **G3 (L)** **Layout/partial system over the HTML** (B1's deferred
      component work). `site.templateDir` replaces CSS/JS/fonts today; HTML
      is still code targeting `ov-*` classes. Design a safe override surface
      (named partials/blocks — topbar, footer, article shell) without
      becoming a framework. Needs a real design pass; don't start it casually.

## Tier V — v1.0 readiness

- [ ] **V1 (M)** **Stability contract.** Write the semver policy (what's
      covered, what's internal, deprecation path), audit the public surfaces
      against it (config schema, `ovellum` API exports, plugin hook
      signatures, MCP tool names/schemas, CLI flags + exit codes, theme
      tokens), and publish it as a docs page. Rename/regularize anything
      embarrassing *before* 1.0 locks it.
- [ ] **V2 (S)** **CI OS matrix.** Add `windows-latest` + `macos-latest` legs
      to `ci.yml` (currently Ubuntu-only with a Node matrix). Path handling
      in merger/site/orphan slugs is exactly the code that regresses on
      Windows.
- [ ] **V3 (M)** **Performance benchmark.** A synthetic large project
      (hundreds of source files / pages) built in CI with a time budget;
      track full build + incremental watch. We claim "fast"; prove it and
      keep it provable.
- [ ] **V4 (S–M)** **Adoption surface** *(proposal)*: 1–2 more starter
      examples (a versioned+i18n site; a hybrid monorepo embed) and a
      showcase section once real sites exist. CONTRIBUTING + issue/PR
      templates already exist — this is examples, not process.

## Tier E — "the Editor" (theme, design NOT locked)

Drafts (v0.9.0) were slice 1. The rest needs a design session with the
maintainer before any code:

- [ ] **E1 (M)** **Scheduled publishing** — `publish: <date>` frontmatter;
      `build` excludes future-dated pages (with a count, like drafts). Caveat
      to design around: builds are point-in-time — publishing requires a
      rebuild (document the CI cron pattern; pairs with the automation
      guide's scheduled workflow).
- [ ] **E2 (L)** **In-place preview/editing affordances** — what "the Editor"
      actually means for a static tool (dev-mode edit links? zone-aware
      preview?). Unscoped; needs the maintainer's intent first.

## Tier H — horizon (post-1.0 / by appetite; does not gate anything)

- [ ] **H1 (M–L)** **Landing redesign** — queued with Agora.xyz as the
      touchstone; a design session, not a feature ticket.
- [ ] **H2 (L)** **OpenAPI/AsyncAPI reference + playground** — REST-console
      territory, orthogonal to the TS/JS symbol story. Revisit only on real
      demand (first-edition verdict stands).
- [ ] **H3 (L)** **Beyond TS/JS** *(proposal)* — evaluate whether the IR +
      anchor model is language-neutral enough to admit other parsers
      (Python/Go) behind the plugin seam. The biggest possible 10x — and the
      easiest to do badly. Evaluation doc first, no code.
- [ ] **H4** **Commercial hosted tier** — post-`v1.0.0` direction per
      `COMPETITIVE.md` (hosting, web editor, analytics, SSO, hosted ask-AI).
      Direction, not commitment; the free tool stays complete.

---

## Suggested sequencing

1. **0.22.0** — ship the pending `ovellum agents` changeset; fold in **F3 +
   F4** (small, same release).
2. **0.23.0 — authoring headline:** **W1 snippets/includes** (+ **W2**
   changelog if the slice is light). Closes the last COMPETITIVE gap.
3. **0.24.0 — finish lines + measurability:** **F1 + F2**, and pitch **G1
   coverage** (if adopted, it's the release headline).
4. **1.0 runway:** **V1 → V2 → V3** (contract first — it may force small
   breaking renames; do them while still 0.x). Then decide the 1.0 call.
5. **After/alongside, by appetite:** G2/G3, Tier E design session, H1
   landing redesign.

The standing rule carries over: docs (en + ja, hashes stamped) + FEATURES.md
+ changeset in the same commit as each feature; full CI gate
(lint+typecheck+test+build) before committing.
