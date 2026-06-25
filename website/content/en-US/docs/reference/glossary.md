---
title: Glossary
description: One-line definitions for terms that appear across the docs.
---

# Glossary

### Anchor

A documentation insertion point: the place in a generated Markdown file
where the merger will splice human-written content for a given source
symbol. Represented as an HTML comment:

```html
<!-- ovellum:anchor id="src/foo.ts::formatDate" generated="…" -->
```

Every auto-generated section gets one. See
[Concepts → Anchors and zones](/docs/concepts/anchors-and-zones/).

### Anchor ID

The stable identifier for an anchor. Format:
`{relativeFilePath}::{symbolPath}`. Examples:
`src/utils/format.ts::formatDate`,
`src/models/User.ts::User.constructor`, `src/index.ts::__module__`.

### `basePath`

Jekyll-style subpath the site is served from. Set via `site.basePath`
(e.g. `'/ovellum'`). Prepended to every internal URL, asset path,
canonical link, and `sitemap.xml` entry at render time. Authors keep
writing root-relative links (`/getting-started/`); the build adds the
prefix. Empty by default — the site is served from the root.

### Auto mode

The simplest pipeline: source to IR to Markdown. Existing output is
overwritten on every build. No merge step.

### Block tag

The Markdown HTML-comment tag pair (default `<!-- @manual:start -->` /
`<!-- @manual:end -->`) that fences a [protected zone](#protected-zone).
Configurable via `protect.blockTag`.

### Breadcrumbs

The "Section › Page" trail rendered above the article on pages two or
more levels deep in the nav. Computed from the nav tree by walking from
the root to the current page; the final entry carries
`aria-current="page"`. Top-level pages get none.

### CTA (call to action)

A button on the landing-page hero that invites the reader to do
something. Configured under `site.landing.hero.ctas`.

### Draft

A work-in-progress page, marked with frontmatter `draft: true` or a
folder's `_meta.json "draft": true` (which cascades). Drafts are shown in
`ovellum dev` with a ribbon + sidebar badge and excluded from `ovellum
build` (and the sitemap/RSS). They're unpublished, not secret — still
visible to anyone with repo access. Distinct from `site.ignoreFiles`,
which is never parsed at all. See the [Drafts guide](/docs/guides/drafts/).

### Edit-this-page link

The "Edit this page" link rendered under each article when
`site.editUrlPattern` is set. The `{path}` placeholder is substituted
with the page's source path relative to the build's working directory,
so the pattern usually points at the GitHub/GitLab/Bitbucket "edit
file" URL for that path.

### Feature card

One cell of the landing-page feature grid. Configured under
`site.landing.features[]`.

### Frontmatter

YAML block at the top of a Markdown file, between `---` delimiters.
Parsed via `gray-matter`. Used for page titles, descriptions, mode
overrides, and more.

### Hero

The full-width title + subtitle + CTA block at the top of a landing
page.

### Icon registry

The small inline-SVG icon set the default template ships with, backed
by [Lucide](https://lucide.dev/). Each icon renders at 24×24 with
`stroke="currentColor"` and `stroke-width="2"`, so it inherits color
from the surrounding text and works for free in every theme. Public
helper: `renderIcon(name, opts)` from the `@ovellum/site` package.

### Hybrid mode

The default mode. Generates from source, then merges existing protected
zones from the previous output back in. Orphans go to `.ovellum/orphans/`.

### Inline tag

A JSDoc tag (default `@preserve`) that marks a doc comment as
human-managed. The source-code counterpart to the [block tag](#block-tag).

### IR (intermediate representation)

The typed shape passed from the parser to the generator. Decouples
parsing from rendering.

### Landing page

A wider, marketing-style page rendered at `/` when
`site.landing.enabled` is `true`. Hero + feature grid + optional prose

- optional trust strip. Doc pages keep their existing URLs.

### Last modified

The "Edited" half of the [page meta](#page-meta) line. A page's frontmatter
`updated:` pins it explicitly; otherwise read from
`git log --follow --diff-filter=AM` (last content change, ignoring pure renames) when the file is tracked, otherwise
from the filesystem mtime. Falls back to omitting the line if none
resolve. Controlled by `site.pageMeta.lastModified` (default `true`); the
date's wording (`today` / `Jun 14, 2026` / `2026-06-14`) follows
`site.dateFormat`.

### Manual mode

Markdown-first static-site builder. No source parsing. Produces HTML +
CSS + minimal JavaScript.

### Manual block

Synonym for [protected zone](#protected-zone). Spec calls them
"protected zones"; runtime code leans "manual block".

### Merger

The package responsible for combining freshly generated content with
existing protected zones. Quarantines orphans.

### Orphan

A protected zone whose source anchor no longer exists in the current
IR. Quarantined to `.ovellum/orphans/` with metadata; never silently
dropped. See [Concepts → Orphans](/docs/concepts/orphans/).

### Page meta

The small line above each article showing reading time and last-modified
date: `2 min read · Edited May 17, 2026`. Configured via `site.pageMeta`;
either half can be toggled off, or you can hide the whole line by
disabling both.

### Pagefind

The static search indexer Ovellum ships behind `site.search.enabled`.
[Pagefind](https://pagefind.app/) produces a static index from the
built HTML and ships a small client that loads it on demand — no
server, no runtime indexer. Output lands at `dist/pagefind/`.

### Pretty URL

Output path shape in manual mode: each page becomes
`{slug}/index.html` so the URL is `/{slug}/`. Works on any static host
without rewrites.

### Protected zone

A `<!-- @manual:start id="…" -->` … `<!-- @manual:end -->` region in a
Markdown file whose contents are preserved verbatim across regeneration.
See [Concepts → Anchors and zones](/docs/concepts/anchors-and-zones/).

### Print stylesheet

The `@media print` rules in the default template that hide the chrome
(topbar, sidebar, ToC, search, prev/next, edit link), widen the article,
print external link URLs inline, and avoid page-breaks inside code
blocks. No config required — it kicks in whenever a reader prints.

### Quarantine

The act of writing an orphan record to disk under `protect.orphanDir`
rather than discarding it. Orphan files are human-readable Markdown,
reviewable in PRs.

### Reading time

The "N min read" half of the [page meta](#page-meta) line. Counts visible
prose at ~200 wpm after stripping code blocks, inline code, link URLs,
HTML, and heading punctuation. Always at least 1 minute. Controlled by
`site.pageMeta.readingTime` (default `true`).

### Sanitization

The pass that strips dangerous HTML from rendered Markdown.
`renderMarkdown` runs every source through
[rehype-sanitize](https://github.com/rehypejs/rehype-sanitize) before
shiki highlights code blocks. Removed: `<script>`, `<iframe>`,
`<object>`, `<embed>`, `on*` event handlers, and any URL whose scheme
isn't on the allowlist (`javascript:`, `vbscript:`, and `data:` are all
dropped — including `data:` on `<img>` because
`data:image/svg+xml` can carry executable JS). See
[Security](/docs/reference/security/) for the full policy.

### `@preserve`

JSDoc tag (the default inline tag) on a source comment that makes the
hybrid generator wrap that symbol's generated section in a protected zone
automatically — so edits to it survive regeneration.

### Topbar nav

The right-aligned navigation in the topbar, driven by `site.topbarNav`.
Links render in order beside the brand on every page. External links
get a small icon and open in a new tab. Below 720px the nav collapses
into a hamburger button that opens a full-width sheet.

### Trust strip

The optional row of partner / sponsor / "powered by" links rendered at
the bottom of a landing page, above the footer. Configured under
`site.landing.trustStrip`.

### shiki

The TextMate-grammar-based syntax highlighter used at build time. Emits
HTML with CSS variables so a single build serves both light and dark
code-block themes with zero runtime cost.

### `ts-morph`

The TypeScript compiler API wrapper used by the parser. Provides a
friendlier surface than the raw compiler API; full type information
retained.
