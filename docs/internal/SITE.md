# Ovellum - Static Site Builder (`manual` mode)

Design for the `@ovellum/site` package: turn a folder of `.md` files into a
deployable static site (HTML + CSS + minimal JS). Powers `ovellum build` when
`config.mode === 'manual'`. Inspired by Retype.com; less ambitious in scope.

This is a v1 design — what we ship first. Deferred items are listed at the
bottom so they don't get lost.

---

## 1. Goals

1. **Markdown in, static site out.** `.md` files at known paths, hosted-anywhere `dist/`. Zero proprietary formats.
2. **Looks finished out of the box.** One default template; clean prose typography; auto / light / dark themes from `STYLES.md`; sidebar nav; right-side "on this page" ToC; syntax-highlighted code.
3. **Zero runtime weight where possible.** Code highlighting baked at build time (shiki). The only client JS is a small theme-toggle + copy-button bundle.
4. **Composable, not coupled.** `@ovellum/site` reuses `@ovellum/reader` for frontmatter and (eventually) protected-zone awareness. Doesn't depend on `parser`, `generator`, or `merger`.

## 2. Non-goals (v1)

- Search (Pagefind / lunr / Algolia) — separate later slice
- Live reload / watch — uses the existing Phase 6 watch ticket
- MDX rendering — `.md` only for v1
- Multiple templates — one default, extensible later via plugin API (not yet built)
- Multilingual / multi-version / redirects
- Edit-this-page links (configurable, defer)
- Custom shortcodes / directives beyond what remark gives natively
- RSS / sitemap.xml (small follow-up; not v1)

## 3. Architecture

```
                          ┌────────────────────────────┐
content/*.md   ───────►   │  @ovellum/reader            │
                          │  frontmatter + raw body     │
                          └─────────────┬───────────────┘
                                        │
                          ┌─────────────▼───────────────┐
                          │  @ovellum/site               │
                          │                              │
                          │   markdown.ts  remark+rehype │
                          │                +shiki        │
                          │   nav.ts       file-tree →   │
                          │                NavNode[]     │
                          │   toc.ts       h2/h3 → ToC   │
                          │   template.ts  HTML shell    │
                          │   build.ts     orchestrator  │
                          └─────────────┬───────────────┘
                                        │
                          ┌─────────────▼───────────────┐
                          │  dist/                       │
                          │    index.html                │
                          │    foo/index.html            │
                          │    foo/bar/index.html        │
                          │    assets/ovellum.css        │
                          │    assets/ovellum.js         │
                          │    (passthrough assets)      │
                          └──────────────────────────────┘
```

CLI (`packages/cli`) routes to `buildSite()` when `config.mode === 'manual'`.
`hybrid` and `auto` modes are unchanged.

## 4. Dependencies

Build-time only. Nothing ships to the browser except a small theme/copy script.

| Package | Purpose |
|---|---|
| `unified` | pipeline orchestrator |
| `remark-parse` | Markdown → mdast |
| `remark-rehype` | mdast → hast |
| `rehype-stringify` | hast → HTML string |
| `rehype-slug` | id="" attrs on headings (for anchors + ToC) |
| `rehype-autolink-headings` | clickable `#` links on headings |
| `shiki` | code-block syntax highlighting (TextMate grammars; theme-loadable from JSON) |
| `unist-util-visit` | AST traversal helper |

Reader already supplies `gray-matter` for frontmatter.

## 5. Config additions

Extends `OvellumConfig` in `@ovellum/core`:

```typescript
export interface OvellumSiteConfig {
  /** Site title. Defaults to OvellumConfig.name. */
  title?: string;
  /** Short description (used in <meta>, footer). */
  description?: string;
  /** Base URL for absolute links / OG cards. e.g. 'https://docs.example.com'. */
  baseUrl?: string;
  /** Initial theme before user preference loads: 'auto' (default), 'light', 'dark'. */
  defaultTheme?: 'auto' | 'light' | 'dark';
  /** Footer text; defaults to a small "Built with Ovellum" line. */
  footer?: string;
}

export interface OvellumConfig {
  // … existing fields …
  site?: OvellumSiteConfig;
}
```

All optional, all sane-defaulted in `DEFAULT_CONFIG`. Existing config fields
that already apply:
- `input` — root of `.md` content (defaults to `./src`; for manual sites the
  example uses `./content`)
- `output` — `dist/` directory
- `defaultFormat` — must be `'md'` for v1; `'mdx'` rejected with a clear error

## 6. Input → output mapping

```
content/index.md            →  dist/index.html
content/getting-started.md  →  dist/getting-started/index.html
content/guides/install.md   →  dist/guides/install/index.html
content/img/logo.svg        →  dist/img/logo.svg          (passthrough)
```

- `index.md` at any level is the directory's landing page; everything else
  becomes `name/index.html` (pretty URLs).
- Files starting with `_` are ignored except `_meta.json` (see §7).
- Static assets (non-`.md`, non-`_*`) are copied through verbatim.

## 7. Navigation

Auto-generated from the file tree. Per directory:

1. List `.md` files. For each: title from frontmatter `title:`, or first `# H1`, or filename.
2. List subdirectories. Title from `_meta.json#title`, or the directory's
   `index.md` H1, or directory name.
3. Sort: explicit `nav:` order on frontmatter wins; `_meta.json#order` next;
   then alphabetical.

Optional `_meta.json` per directory:
```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

`nav.ts` outputs a `NavNode` tree the template consumes.

## 8. Page layout

```
┌──────────────────────────────────────────────────────────────────┐
│  TopBar   [site title] ··················· [theme toggle]        │
├──────────────────────────────────────────────────────────────────┤
│           │                                       │              │
│ Sidebar   │   Content (prose)                     │  On this     │
│  - links  │     # H1 (matches page title)         │  page (ToC)  │
│  - groups │     ## h2  ◄────── anchor link `#`    │   - h2       │
│           │     paragraph …                       │     - h3     │
│           │     ``` typescript                    │              │
│           │     // shiki-highlighted              │              │
│           │     ```                               │              │
│           │     ## another h2                     │              │
│           │                                       │              │
├──────────────────────────────────────────────────────────────────┤
│  Footer   ··· Built with Ovellum · 2026-05-15 ···                │
└──────────────────────────────────────────────────────────────────┘
```

Grid:
```css
display: grid;
grid-template-columns: 240px minmax(0, 1fr) 200px;
gap: var(--space-l);
```

At narrow viewports the right ToC drops first, then the sidebar collapses to
a hamburger button.

## 9. Theme integration

The stylesheet sources its tokens from `docs/internal/STYLES.md` (Tier 1 +
Tier 2 default-light / default-dark blocks).  Authoritative copy lives in
`packages/site/src/templates/default/style.css`; if `STYLES.md` changes, we
hand-port the relevant token values. (Future: a small token-extraction script
could automate this, but a hand-port is fine for v1 — the palette doesn't move
weekly.)

The theme toggle (`script.js`):
- Reads `localStorage.getItem('ovellum-theme')` synchronously before paint
- Writes `<html data-theme="…">` accordingly
- Cycles auto → light → dark on click

Nord / Solarized exist in `STYLES.md` but aren't wired into the toggle in v1.
They're swappable later by emitting their CSS blocks too and extending the
toggle to a select.

## 10. Page metadata + `<head>`

For each page:
- `<title>` = `{page.title} · {site.title}` (or just `{site.title}` for the index)
- `<meta name="description">` from frontmatter `description:` or site default
- `<link rel="canonical">` if `site.baseUrl` is set
- OG / Twitter cards if `baseUrl` set — minimal: title + description + URL
- `<link rel="stylesheet" href="/assets/ovellum.css">`
- Theme-bootstrap inline `<script>` (runs before paint, applies stored theme)
- Deferred `<script src="/assets/ovellum.js">` for the rest

## 11. Open questions (later)

- Search: Pagefind is the cleanest static fit (post-build index, ~50KB
  client). Plan to add as a separate package or as a `--search` flag.
- Multi-version: not in v1.
- Custom themes: needs a small plugin API. Hold off until there's demand.
- Live reload: pairs with `ovellum watch`; ship the watcher first.
- Sitemap.xml + RSS: small follow-up.

## 12. Out of scope but worth a note

- **MDX rendering**: the reader can already parse MDX frontmatter and zones.
  Wiring it through `remark-mdx` for rendering is straightforward but
  intentionally not in v1 — keeps the dep surface small.
- **`@ovellum/site` and the merger**: in v1 they don't talk. Long-term, a
  `hybrid-html` mode could run the merger first (Markdown out) and then this
  site builder (HTML out) so auto-generated API pages live alongside hand-
  written narrative pages with shared chrome.

---

## 13. Decisions log

| Decision | Why |
|---|---|
| One default template | Faster to ship; plugin API can come once there's a second template demanding it. |
| Shiki at build time, zero runtime highlighter | Output quality matters for a docs tool; baked-in shiki output is the right default. |
| Pretty URLs (`name/index.html`) | Standard for static sites; works on any host without server-side rewrites. |
| `_meta.json` for nav overrides | JSON over YAML so we don't drag in another parser; per-directory locality > root-config nav tree. |
| No live reload in v1 | Phase 6 watch ticket already exists; site builder shouldn't ship a second watcher. |
| Hand-port STYLES.md tokens into `style.css` | Avoid a token-extraction step for v1; revisit when tokens drift. |
