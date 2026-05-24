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

## 2a. Landing page (added 2026-05-16)

Optional homepage rendered at `/` when `site.landing.enabled === true`.
Disabled by default — existing manual-mode sites keep using
`content/index.md` for `/`. Inspired by Material for MkDocs.

**Sections, in order, on the landing page:**

1. **Hero** — full-width title + subtitle + CTA row. Title falls back to
   `site.title`. First CTA gets `primary` style by default, the rest
   `secondary`. The default backdrop is a dotted-noise + radial-spotlight
   pair drawn entirely in CSS. Setting `hero.media = { light, dark?, alt? }`
   switches to the **imagery hero variant** (§2b).
2. **Feature grid** — responsive grid of cards (icon + title + description).
   `auto-fit, minmax(260px, 1fr)` — collapses to 1 column on narrow
   viewports.
3. **Pitch (optional)** — free-form Markdown from `{input}/_landing.md` if
   present. Renders between feature grid and trust strip. The underscore
   prefix keeps the file out of the regular sidebar walk.
4. **Trust strip (optional)** — small row of partner/sponsor links. Each
   item is text or an `<img>` (path is passed through as a static asset).

**Routing model:** the landing replaces `content/index.md`'s output at `/`.
If both exist, `index.md` is skipped with a warning during the build.
All other pages keep their slugged URLs. The topbar gains a **Docs** link
(`site.landing.docsHref`, falling back to the first child in the sidebar
nav) so users always have a one-click path into the documentation.

**Why not put hero/features in Markdown?** Two reasons:

- Structured config validates at load time (typos in field names error
  cleanly).
- The CSS layout has to know which slot is which; encoding that in
  Markdown would require either custom directives or a brittle "first h1
  is the hero" convention.

The hybrid lets writers keep their prose voice for the "Why" section while
the structured bits (hero, features, trust) stay in config.

**Deferred (post-v1):**

- Multiple bundled landing templates / hero variants
- Live GitHub stars / sponsor APIs
- Video hero
- Per-section show-if-viewport / animation directives
- "Section scenes" between feature/pitch/trust blocks (Agora-inspired
  ambient visuals between sections, separate from the hero)

## 2b. Imagery hero variant (added 2026-05-19)

Opt-in alternative to the default dotted-noise hero. Configured via:

```ts
site.landing.hero.media = {
  light: '/hero-light.svg',  // required
  dark?:  '/hero-dark.svg',   // optional; falls back to light
  alt?:   '',                  // decorative by default
}
```

**Rendered markup.** `<section class="ov-hero" data-media>` gains an
`<div class="ov-hero-art">` that stacks two `<img>` tags (`--light`,
`--dark`) absolutely. The two `<img>` tags are always emitted; CSS
toggles opacity by the page-level `[data-theme]` attribute (and by
`prefers-color-scheme` under `data-theme='auto'`). Title/subtitle/CTAs
move inside `<div class="ov-hero-inner">` and sit above the art via
`position: relative; z-index: 1`.

**Asset shipping.** Assets follow Ovellum's manual-mode passthrough
convention: drop the SVG alongside Markdown content (e.g.
`content/hero-light.svg`), and the build copies it verbatim to `dist/`.
No new directory convention or registration step.

**Why two files (light + dark) rather than one self-theming SVG.** An
SVG referenced via `<img>` runs in its own document context, so it
cannot read the page's `[data-theme]` attribute or `data-theme='auto'`
JS-toggled state. It can only respect OS-level `prefers-color-scheme`.
Two files swapped via CSS lets the SVG follow the page's manual theme
toggle without inline-injecting markup or running JS.

**Why the animation lives inside the SVG.** Each asset embeds its own
`<style>` block with `@keyframes` and a
`@media (prefers-reduced-motion: reduce)` no-op fallback. The editor
focuses on one file to change motion or palette; no parent CSS, no JS.
Trade-off: animation doesn't synchronise with anything on the page
(which is fine — by design it's ambient).

**Where the CSS lives.** `.ov-hero[data-media]` overrides in
`packages/site/src/templates/default/style.css` (search for "Imagery
hero variant"). The variant suppresses the `::before` / `::after`
pseudo-layers, gives the section a min-block-size + flex column so the
content centres, applies a bottom mask-image fade so the visual recedes
into the feature grid below.

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

| Package                    | Purpose                                                                      |
| -------------------------- | ---------------------------------------------------------------------------- |
| `unified`                  | pipeline orchestrator                                                        |
| `remark-parse`             | Markdown → mdast                                                             |
| `remark-rehype`            | mdast → hast                                                                 |
| `rehype-stringify`         | hast → HTML string                                                           |
| `rehype-slug`              | id="" attrs on headings (for anchors + ToC)                                  |
| `rehype-autolink-headings` | clickable `#` links on headings                                              |
| `shiki`                    | code-block syntax highlighting (TextMate grammars; theme-loadable from JSON) |
| `unist-util-visit`         | AST traversal helper                                                         |

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

````
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
````

Grid:

```css
display: grid;
grid-template-columns: 240px minmax(0, 1fr) 200px;
gap: var(--space-l);
```

At narrow viewports the right ToC drops first, then the sidebar collapses to
a hamburger button.

### 8a. Chrome width + background (added 2026-05-23)

The topbar (`.ov-topbar`) and footer (`.ov-footer`) are **full-bleed**:
the outer element spans the viewport and paints the chrome background
+ border; an inner wrapper (`.ov-topbar-inner` / `.ov-footer-inner`)
holds the grid and constrains contents to a max width.

Two width tokens, kept deliberately separate:

| Token          | Purpose                                  | Default | Overridden on landing? |
| -------------- | ---------------------------------------- | ------- | ---------------------- |
| `--chrome-max` | Topbar + footer inner contents           | 1600px  | **No** — stays constant so the header never jumps width between landing and docs |
| `--page-max`   | Main content area (`.ov-layout`, `.ov-landing`) | 1600px  | **Yes** — `body.ov-body-landing` tightens it to 1100px for the editorial centerpiece feel |

Backgrounds use two semantic tokens (see STYLES.md §7.2 / §7.3 for the
exact oklch values):

- `--color-bg` — body, topbar, **and `html`**. Off-white warm-neutral
  gray in light; near-black zinc-950 in dark. Pure white / pure black
  are explicitly avoided. The topbar reads as a continuation of the
  body, separated only by a 1px `border-block-end`.
- `--color-bg-chrome` — footer only. ~4% L below body in light, ~6% L
  above body in dark (elevation inversion — going darker than
  near-black reads as a void). Reads as a closing baseline below the
  content.

**Why topbar = body, footer = chrome (asymmetric):** an earlier pass
made *both* topbar and footer chrome-colored, but a tinted topbar
fought every other surface on the page — and Safari sampled the
sticky-translucent topbar's blended color into its URL-bar tint,
which never matched. A body-colored topbar with a hairline border is
quieter, matches Safari's URL-bar sampling cleanly (since both read
as the same body color), and lets the footer's chrome tint do the
ambient-separation work on its own.

`html { background: var(--color-bg) }` so Safari's top-of-page
rubber-band overscroll continues the topbar's body color cleanly.
Bottom overscroll will reveal body instead of the footer's chrome
tint — accepted tradeoff (top overscroll is the one users notice).

## 9. Theme integration

The stylesheet sources its tokens from `docs/internal/STYLES.md` (Tier 1 +
Tier 2 default-light / default-dark blocks). Authoritative copy lives in
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

## 9a. Template anatomy

Where each piece of the bundled template lives, what format it's in, and
how to make a change.

### File map

```
packages/site/
├── src/
│   ├── template.ts                          ← HTML structure
│   └── templates/
│       └── default/                         ← one bundled template, named `default`
│           ├── style.css                    ← visual design
│           └── script.js                    ← client behaviour
└── dist/
    └── templates/default/                   ← shipped to npm; produced at build time
        ├── style.css
        └── script.js
```

### Three formats, deliberately chosen

| Concern | File | Format | Why |
|---|---|---|---|
| HTML structure | `src/template.ts` | TypeScript template literals | No template engine, no extra dep. Escape helpers (`escapeHtml`, `escapeAttr`) are real TS functions the type-checker watches; IDE autocomplete and import navigation work. |
| Visual design | `src/templates/default/style.css` | Vanilla CSS with custom properties | One file, no preprocessor, no PostCSS, no bundler. Tier 1 + Tier 2 OKLCH tokens hand-ported from `STYLES.md`. Themes swap at runtime via `[data-theme]`. |
| Client behaviour | `src/templates/default/script.js` | Vanilla browser JS | Zero framework cost. Two responsibilities: theme cycle + copy buttons. Ships under 2 KB. |

`template.ts` exports three render functions:

- `renderShell({ site, body, … })` — outermost `<html>` / `<head>` / `<body>`
  chrome, topbar, footer, pre-paint theme bootstrap. Shared.
- `renderPage(input)` — doc-page body: sidebar + content + right-side ToC.
- `renderLanding(input)` — landing-page body: hero + feature grid +
  optional pitch + trust strip.

### How the template ships

At `pnpm --filter @ovellum/site build`:

1. `tsup` bundles `src/index.ts` → `dist/index.js` (the package entry).
2. `tsc -b --force` emits `.d.ts` files alongside.
3. A `node -e "require('fs').cpSync(...)"` step copies `src/templates/`
   to `dist/templates/` so the runtime can find them.

At runtime, `buildSite()` calls `resolveTemplateDir()` which uses
`import.meta.url` to find the bundled template next to the running module:

```typescript
const here = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.join(here, 'templates/default'),        // dist/index.js → dist/templates/default
  path.join(here, '..', 'src/templates/default'), // vitest / dev
];
```

`writeStaticAssets()` then copies the CSS and JS into the consumer's
`{output}/assets/` directory on every build.

### How to change the design

In increasing order of friction:

| You want to… | Do this |
|---|---|
| Tweak colours / spacing / type | Override Tier 2 CSS variables (`--color-accent`, `--color-bg`, `--space-m`, etc.) in a follow-up stylesheet. The override path for end users is documented in `website/content/guides/themes.md`. |
| Tweak the markup / layout | Edit `packages/site/src/template.ts`. Add a `data-…` attribute, rearrange the topbar, change the heading rendering, etc. Run `pnpm --filter @ovellum/site test` to keep the template tests green, then `pnpm --filter @ovellum/site build` and `pnpm -w run build:website` to verify. |
| Add a new section (e.g., right-side action buttons, breadcrumbs) | Edit `template.ts` to render the new markup, then add the corresponding selectors to `templates/default/style.css`. Tests in `__tests__/template.test.ts` cover that the active link still works, ToC renders, etc.; add a test for any new section. |
| Replace the template wholesale | Fork `packages/site/src/templates/default/` (plus the `template.ts` render functions if you need different markup), maintain your own version, point your build at the fork. The plugin / template-override API for cleanly swapping templates is on the roadmap and tracked in TODO.md Phase 4.5 follow-ups. |

### What's intentionally not in v1

- **A plugin / template-override API.** Adding it before the customisation
  surface stabilises locks us into bad shapes. Deferred until external
  demand says otherwise.
- **Multiple bundled templates / hero variants.** Same reasoning. The
  current `default` is the only template; the `templates/` directory uses
  the plural form so a `templates/<name>/` siblings layout adds cleanly.
- **MDX rendering.** `.md` only for v1; reader already parses MDX
  frontmatter but the render path through remark-mdx is wired off.
- **Token-extraction script** (auto-sync `style.css` ← `STYLES.md`).
  Hand-port is fine while the palette is stable. Add when tokens drift.
- **`<base href>` / `site.basePath`** for sub-path hosting. Needed only if
  serving from `<user>.github.io/<repo>/` rather than a custom domain.

### When this section changes

This section is part of the architectural record. Update it whenever:

- A new file joins `src/templates/default/`.
- A new render function lands in `src/template.ts`.
- The build-time copy step changes.
- The runtime template-resolution path changes.
- A new bundled template appears (one day).

## 10. Page metadata + `<head>`

For each page:

- `<title>` = `{page.title} · {site.title}` (or just `{site.title}` for the index)
- `<meta name="description">` from frontmatter `description:` or site default
- `<link rel="canonical">` if `site.baseUrl` is set
- OG / Twitter cards if `baseUrl` set — minimal: title + description + URL
- `<link rel="stylesheet" href="/assets/ovellum.css">`
- `<meta name="theme-color" id="ov-theme-color" data-light="…" data-dark="…" content="…">`
  drives Safari's URL bar tint and the iOS safe-area band. The hex
  approximations of `--color-bg` (**body**, not chrome — the topbar
  reads as a continuation of the body, see §8a) live in the
  `data-light` / `data-dark` attributes — single source of truth for
  both the inline boot script and `script.js`. If `--color-bg` moves,
  update these hex values in `packages/site/src/template.ts`.
- Theme-bootstrap inline `<script>` runs before paint: applies the
  stored `data-theme`, resolves the effective theme (using
  `prefers-color-scheme` when stored value is `auto`), and writes the
  matching hex into the meta's `content`. Avoids a light-flash on
  dark-OS first load.
- Deferred `<script src="/assets/ovellum.js">` keeps theme-color in
  sync on toggle (calls `syncThemeColor()` inside `apply()`) and on OS
  appearance changes when the stored theme is `auto`
  (`matchMedia('(prefers-color-scheme: dark)').addEventListener('change', …)`).

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

| Decision                                      | Why                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| One default template                          | Faster to ship; plugin API can come once there's a second template demanding it.                  |
| Shiki at build time, zero runtime highlighter | Output quality matters for a docs tool; baked-in shiki output is the right default.               |
| Pretty URLs (`name/index.html`)               | Standard for static sites; works on any host without server-side rewrites.                        |
| `_meta.json` for nav overrides                | JSON over YAML so we don't drag in another parser; per-directory locality > root-config nav tree. |
| No live reload in v1                          | Phase 6 watch ticket already exists; site builder shouldn't ship a second watcher.                |
| Hand-port STYLES.md tokens into `style.css`   | Avoid a token-extraction step for v1; revisit when tokens drift.                                  |
