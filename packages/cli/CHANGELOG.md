# ovellum

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
  manifest — release-hygiene only, no behavioural change.

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
