---
title: Building a manual-mode site
description: From a folder of Markdown files to a deployable static site.
---

# Building a manual-mode site

Manual mode is the simplest pipeline. You write Markdown; Ovellum produces
HTML, CSS, and a tiny bit of JavaScript. There's no source parsing, no
merge engine, no orphan archive — just rendering.

## Minimum project

```
my-docs/
  ovellum.config.json
  content/
    index.md
    getting-started.md
```

Config:

```json
{
  "mode": "manual",
  "input": "./content",
  "output": "./dist",
  "site": {
    "title": "My docs"
  }
}
```

Build:

```bash
npx ovellum build
```

Result:

```
dist/
  index.html
  getting-started/index.html
  assets/
    ovellum.css
    ovellum.js
```

Pretty URLs are the default. Every page becomes `<slug>/index.html` so the
URL is `/<slug>/`. No server-side rewrites needed; works on any static
host.

Note that neither file above has frontmatter, and there's no `_meta.json`
anywhere — both are optional. The slug comes from the filename and the title
from the first `# H1`. See [Adding navigation](#adding-navigation).

## Adding navigation

The sidebar is built automatically from your file tree — **no config
required.** Two rules cover the whole structure:

- **Slug = filename without `.md`.** `orphans.md` → `/orphans/`. Subfolders
  nest: `guides/install.md` → `/guides/install/`. An `index.md` represents its
  folder rather than getting its own slug.
- **Each subfolder is a section**, titled after the folder name, title-cased:
  `getting-started/` → "Getting started".

The **home page** (`/`) resolves automatically: `index.md`, else a root
**`README.md`** — so an existing repo README becomes the docs home with no
config. To use a different file, set [`site.home`](/docs/reference/config/)
(e.g. `"overview.md"`); to keep the README out entirely, add it to `ignoreFiles`.

Sections **collapse by default** in the sidebar (a click expands them) — the
section holding the page you're on stays open, so you always see where you are.
Prefer everything expanded? Set [`site.sidebar.collapse: false`](/docs/reference/config/).

Page titles resolve, in order:

1. The frontmatter `title:` field, if set.
2. The first `# H1` in the body, otherwise.
3. The filename, as a last resort (`getting-started.md` → "Getting started").

So **frontmatter is optional** — a page can be just a `# Heading` followed by
its content. That heading becomes the on-page title, the sidebar label, *and*
the `<title>` tag. Add frontmatter only when you want to override something:

- **`title`** — overrides the H1/filename for the title, sidebar, and `<title>`.
- **`description`** — sets `<meta name="description">`.
- **`tags`** — a list → `<meta name="keywords">`.
- **`permalink`** — a custom URL for the page (e.g. `permalink: /faq/`).
- **`draft: true`** — a [draft](/docs/guides/drafts/) (shown in `dev`, excluded
  from `build`).
- **`updated`** — pins the **Edited** date (e.g. `updated: 2026-05-20`),
  overriding the git/filesystem lookup. Use it when you want the displayed date
  to reflect a meaningful edit rather than git mechanics.

### Taking control with `_meta.json` (optional)

`_meta.json` is **never required.** Drop one into a directory only when you want
to override the automatic order or the folder-name section title:

```
content/
  guides/
    _meta.json
    install.md
    configure.md
    deploy.md
```

```json
{
  "title": "Guides",
  "order": ["install", "configure", "deploy"]
}
```

- `title` overrides the (title-cased) folder name.
- `order` is a list of slugs (filenames / subfolder names without `.md`);
  anything not listed sorts alphabetically after the explicit set.
- `collapse` overrides the sidebar [`site.sidebar.collapse`](/docs/reference/config/)
  default for this folder: `false` keeps it always expanded, `true` always
  collapsed.
- `hidden: true` drops the folder (and everything under it) from the build.

Without a `_meta.json`, the folder's pages simply sort alphabetically — often
exactly what you want.

### Excluding pages and folders

Four ways to keep content out of the published site, from broad to narrow:

- **`site.ignoreFolders`** — list folder *names* in your config to drop them
  entirely (no sidebar entry, not rendered, not copied). Matched at any depth:

  ```json
  { "site": { "ignoreFolders": ["drafts", "internal"] } }
  ```

- **`site.ignoreFiles`** — file **globs** to drop individual files (Markdown
  pages *and* passthrough assets), without editing them. No-slash patterns
  match the basename anywhere; slashed patterns match the path relative to
  `input`:

  ```json
  { "site": { "ignoreFiles": ["README.md", "*.draft.md", "drafts/**"] } }
  ```

- **`_meta.json` `"hidden": true`** — let a folder opt itself out, in place:

  ```json
  { "hidden": true }
  ```

- **Frontmatter `draft: true`** — unpublish a single page:

  ```markdown
  ---
  title: Work in progress
  draft: true
  ---
  ```

All four drop the content from the sidebar **and** the build, and both
`build` and `check` honor them (so `check` never lints excluded files).
Asset-only folders with no Markdown are kept out of the sidebar automatically,
while their files still pass through to `dist/`. The reserved
[`public/`](#static-assets) folder is special — it's copied to the output root
(see Static assets below).

**Running from your project root?** `input: "."` is fine — dotfiles,
`node_modules`, package manifests/lockfiles, your `ovellum.config.*`, and the
output dir itself are **always** excluded automatically, so none of them leak
into the build. Use `ignoreFiles` for anything else (like a repo `README.md`).

## Callouts

Five labeled callout types — `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`,
`[!WARNING]`, `[!CAUTION]` — render by writing GitHub-flavored alert
blockquotes:

```markdown
> [!NOTE]
> Background context that's useful but skippable.

> [!TIP]
> A shortcut or a sharper way of doing the thing above.

> [!IMPORTANT]
> Something the reader has to internalize before going further.

> [!WARNING]
> Footgun. Action causes mild damage.

> [!CAUTION]
> Footgun. Action causes severe damage. Data loss, broken state, etc.
```

Each renders as a panel with a colored left rule, a small uppercase
label, and the body content. Mix any inline Markdown inside —
links, code spans, even nested lists.

> [!NOTE]
> Like this one. The label disappears when the syntax matches; if it
> doesn't, you get a plain blockquote — handy for short pull-quotes.

> [!TIP]
> Drop the `[!TYPE]` marker on its own line, then leave a blank
> blockquote line before the body, if you want a clean visual break in
> the source.

> [!WARNING]
> Use callouts sparingly — three per page is plenty. They're meant to
> interrupt the reader, so each one should earn the interruption.

## Adding the right-side ToC

There's nothing to enable — the right column populates automatically from
every page's `## h2` and `### h3` headings. Each heading also gets a
clickable `#` anchor on hover, so readers can deep-link.

You don't need a single configuration line for any of this. Write Markdown,
get a working ToC.

## Static assets

> For the full picture — images, video/audio embeds, PDFs and other downloads —
> see the [**Assets & downloads**](/docs/guides/assets/) guide. The essentials:

Anything in `content/` that isn't a `.md` file passes through verbatim:

```
content/
  images/
    architecture.svg
    screenshot.png
  hello.md
```

Reference assets with relative paths in your Markdown:

```markdown
![Architecture](/images/architecture.svg)
```

After build:

```
dist/
  images/
    architecture.svg
    screenshot.png
  hello/index.html
```

### Reserved `public/` folder → site root

The **[`publicDir`](/docs/reference/config/)** (default `public`) is a
**reserved** folder copied to the **output root** — the convention you know from
Next, Astro, Vite, and Hugo (`static/`). It's the place for files that must live
at the site root (`favicon.ico`, `robots.txt`, `CNAME`, OG images) plus any
other static assets:

```
content/
  public/
    favicon.ico        →  /favicon.ico
    robots.txt         →  /robots.txt
    fonts/Geist.ttf    →  /fonts/Geist.ttf
```

Nothing inside it is processed (no pages, no sidebar entries — even a `.md` is
copied as-is). Rename it via `site.publicDir`. (Static files *outside* `public/`,
like the `images/` example above, still pass through keeping their own path.)

## Landing page <a id="landing"></a>

Manual mode ships an optional marketing-style homepage. The behavior
at `/` depends on a single flag:

- `site.landing.enabled: false` (the default) — `/` is just a doc
  page. It renders `content/index.md` with the regular layout
  (sidebar, content, on-this-page ToC). Use this if you want readers
  to land straight in the documentation.
- `site.landing.enabled: true` — `/` becomes a marketing-style page:
  hero, feature grid, optional `_landing.md` prose body, optional
  trust strip. The topbar grows a "Docs" link so readers always have
  a one-click path into the documentation proper, and the build
  ignores `content/index.md` with a warning (move that prose to
  `_landing.md` or rename the file).

> [!TIP]
> If you flip from landing-on to landing-off, rename `_landing.md` to
> `index.md` (or write a fresh `index.md`) so `/` still has content.

When enabled, the config looks like this:

```json
{
  "site": {
    "landing": {
      "enabled": true,
      "docsHref": "/getting-started/",
      "hero": {
        "title": "My project",
        "subtitle": "What it does in one sentence.",
        "ctas": [
          { "label": "Get started", "href": "/getting-started/" },
          { "label": "GitHub", "href": "https://github.com/me/proj", "style": "secondary" }
        ]
      },
      "features": [
        { "title": "Fast", "description": "Builds in seconds." },
        { "title": "Themed", "description": "Auto/light/dark out of the box." }
      ]
    }
  }
}
```

If you have a `content/_landing.md` file, its prose body renders between
the feature grid and the trust strip. Treat it as the "Why" section.

Full landing reference: [config → site.landing](/docs/reference/config/#sitelanding).

## 404 page

**Every build ships a 404 page** — you don't have to write one. If you
don't, Ovellum generates a default "Page not found" that matches your
theme (with a link home). To customize it, add a `content/404.md` file —
an ordinary Markdown page, write whatever you like (a short apology, a
link back home, a search prompt):

```markdown
---
title: Page not found
---

# Page not found

That page doesn't exist. Head back to the [documentation](/).
```

It's treated as a **special page**, not a normal doc:

- It renders on a centered, narrower column with a larger heading, and the
  sidebar, on-this-page ToC, breadcrumbs, prev/next, and edit-this-page
  links are all hidden — it's a dead end, so it drops the navigation
  chrome.
- It's kept out of the **reading flow**: it never appears in the sidebar,
  the `sitemap.xml`, the RSS feed, or as a prev/next neighbor (so the
  first real page's "Previous" is empty, not the 404).

The build emits it as **both** `dist/404/index.html` (the pretty URL) and a
top-level **`dist/404.html`**. The second is the file most static hosts
(GitHub Pages, Netlify, Cloudflare, …) serve on missing URLs — so your
custom 404 triggers in production with no extra step. The dev server
(`ovellum dev` / `ovellum serve`) serves it for missing paths too, so it
behaves the same locally.

> [!NOTE]
> On a host served from a subpath (`site.basePath`), the 404 still works —
> internal links inside it are prefixed like every other page.

## Theme switching

Three themes ship in the default template: `auto` (follow OS),
`light`, and `dark`. The topbar toggle cycles between them; the choice is
remembered in `localStorage` and applied before paint, so there's no theme
flash on subsequent loads.

If you want to ship a different default for first-time visitors, set
`site.defaultTheme` to `light` or `dark`. See
[Theming](/docs/guides/themes/) for restyling beyond the defaults.

## Static-site essentials

The default template ships with sensible defaults for the things that
matter:

- Light + dark themes from the same OKLCH palette.
- System fonts only — no `@font-face`, no FOIT.
- Build-time syntax highlighting via shiki; zero runtime JS for code.
- Pre-paint theme script (no flash on reload).
- Copy buttons injected client-side onto every code block.
- Responsive grid: sidebar drops first, then collapses on narrow viewports.
- Accessible: focus rings, semantic landmarks (`<header>`, `<main>`,
  `<aside>` with `aria-label`s), and proper heading levels.

Everything is generated; nothing here is configurable for now. The
[theming guide](/docs/guides/themes/) covers what's customizable today.
