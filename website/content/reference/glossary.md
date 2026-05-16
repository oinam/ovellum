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
[Concepts → Anchors and zones](/concepts/anchors-and-zones/).

### Anchor ID

The stable identifier for an anchor. Format:
`{relativeFilePath}::{symbolPath}`. Examples:
`src/utils/format.ts::formatDate`,
`src/models/User.ts::User.constructor`, `src/index.ts::__module__`.

### Auto mode

The simplest pipeline: source to IR to Markdown. Existing output is
overwritten on every build. No merge step.

### Block tag

The Markdown HTML-comment tag pair (default `<!-- @manual:start -->` /
`<!-- @manual:end -->`) that fences a [protected zone](#protected-zone).
Configurable via `protect.blockTag`.

### CTA (call to action)

A button on the landing-page hero that invites the reader to do
something. Configured under `site.landing.hero.ctas`.

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
dropped. See [Concepts → Orphans](/concepts/orphans/).

### Pretty URL

Output path shape in manual mode: each page becomes
`{slug}/index.html` so the URL is `/{slug}/`. Works on any static host
without rewrites.

### Protected zone

A `<!-- @manual:start id="…" -->` … `<!-- @manual:end -->` region in a
Markdown file whose contents are preserved verbatim across regeneration.
See [Concepts → Anchors and zones](/concepts/anchors-and-zones/).

### Quarantine

The act of writing an orphan record to disk under `protect.orphanDir`
rather than discarding it. Orphan files are human-readable Markdown,
reviewable in PRs.

### `@preserve`

JSDoc tag (the default inline tag) on a source comment that asks the
generator to wrap the comment's description in a protected zone
automatically — so user edits to that description survive regeneration.

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
