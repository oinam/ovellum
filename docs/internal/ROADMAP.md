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

- [ ] **A1 (M)** **IR persistence** — write the parsed `DocProject` IR to
      `.ovellum/ir.json` after each auto/hybrid build. Foundation for diff,
      rename detection, and last-seen tracking.
- [ ] **A2 (M)** **`ovellum diff`** — compare current source IR against the
      persisted one; report added/removed/changed symbols (and which docs
      would change) without writing. CI-friendly `--json`. Already in the
      backlog; IR persistence makes it cheap.
- [ ] **A3 (L)** **Rename detection** — when an anchor disappears and a
      similar symbol (same signature shape, fuzzy-matched name, same-file or
      moved-file) appears, offer the remap instead of orphaning. Kills the #1
      cause of orphans (refactors). Start suggest-only (`ovellum build`
      prints "did `formatDate` become `formatDateUTC`? run
      `ovellum orphans --reattach`").
- [ ] **A4 (M)** **`ovellum orphans` CLI** — list (default), `--stale`,
      interactive reattach/delete. The merger already returns full
      `OrphanRecord`s; this is surface area, long promised in docs (marked
      "planned"). Populate `anchorLastSeen` from the persisted IR (A1).
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
- [ ] **B7 (L)** **i18n / multi-language — the v0.8.0 focus.** Design locked
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

### Tier C — the AI age

- [ ] **C1 (S)** **`llms.txt` + Markdown mirror emission** — emit `llms.txt`
      and per-page `.md` alongside HTML at build. Cheap (we *have* the
      Markdown), high adoption signal, and no other small builder does it
      well. Do this before C2.
- [ ] **C2 (L)** **MCP server / Claude Skill** — tools like `ovellum_build`,
      `ovellum_check`, `ovellum_query_symbol`, exposing the IR so agents
      write prose into protected zones that survives regeneration (the same
      contract humans get). Needs a design pass; backlog already sketches it.
      A1 (IR persistence) is the natural prerequisite.

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
