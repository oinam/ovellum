# ovellum

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
  - **`check` now honours the same exclusions as `build`.** Previously `ovellum
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
  - **Color** — the primary colour the CTA buttons, links, focus rings, and the
    ToC indicator all derive from; six presets, a native colour picker, and a
    leading "Default" swatch that returns to the theme's own primary (hover
    states mixed automatically).

  All selections persist in `localStorage` and apply before paint (no flash;
  Safari's `theme-color` tracks the active palette). New config defaults:
  `site.palette` ('default' | 'nord' | 'flexoki' | 'solarized' | 'eink') and
  `site.accent` (any CSS colour value).

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
  Rebuilt on a single grey ramp + role-token color system (light/dark from one
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
