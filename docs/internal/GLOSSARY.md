# Ovellum - Glossary

One-line definitions for terms that appear across the codebase, design docs,
and CLI output. Linked from `DESIGN.md`, `SITE.md`, `FEATURES.md`, `CLI.md`,
`CONFIG.md`. Update in the same commit as any change that introduces a new
term.

Last updated: 2026-05-16 (added Breadcrumbs)

---

### Anchor

A documentation insertion point: the place in a generated Markdown file
where the merger will splice human-written content for a given source
symbol. Represented in the output as an HTML comment:

```html
<!-- ovellum:anchor id="src/foo.ts::formatDate" generated="2026-05-15T…" -->
```

Every top-level `DocNode` (and every class/interface member) gets exactly
one anchor comment in its section. See [`DESIGN.md` §8.3](./DESIGN.md#83-anchor-ids-and-stability).

### Anchor ID

The stable identifier for an anchor. Format: `{relativeFilePath}::{symbolPath}`.
Examples: `src/utils/format.ts::formatDate`, `src/models/User.ts::User.constructor`,
`src/index.ts::__module__`. Renaming a source symbol breaks its anchor ID
(and the merger will quarantine any block tied to the old name). A future
`@ovellum-id` JSDoc tag will allow stable hand-set IDs.

### Auto mode

The simplest pipeline: source → IR → Markdown. Existing output is
overwritten on every build. No merge step. Equivalent in spirit to
TypeDoc. Set via `mode: 'auto'` in [config](./CONFIG.md#1-top-level-fields).

### `c12`

The [unjs](https://unjs.io/) config loader. Discovers `ovellum.config.*`,
supports TypeScript configs natively, handles env merging. Used inside
`@ovellum/core`'s `loadOvellumConfig`.

### Composite project

A TypeScript compilation mode (`compilerOptions.composite: true`) used by
every Ovellum package. Enables project references for cross-package
typecheck without prior build. See the [build pattern note](./TODO.md)
for the gotchas around `tsup`'s rollup of declarations under composite.

### `defineConfig()`

Identity helper exported from `@ovellum/core` so users get type-safe
autocomplete in `ovellum.config.ts`. Doesn't transform input; only the
loader applies defaults.

### `DocNode`

The IR shape for a single documented symbol — function, class, interface,
type, enum, method, property, variable. Carries name, kind, signature,
JSDoc-derived fields, `isPreserved` / `isInternal` / `isExported` flags,
and optional children (e.g. class methods + properties). See
[`DESIGN.md` §6](./DESIGN.md#6-intermediate-representation-ir).

### `DocFile`

The IR shape for one source file: file path, optional `@module` name +
description, and its array of `DocNode`s.

### `DocProject`

The whole-project IR: name, version, generated-at timestamp, and the array
of `DocFile`s. Output of `@ovellum/parser`; input to `@ovellum/generator`.

### Frontmatter

YAML block at the top of a Markdown or MDX file, between two `---` lines.
Parsed via `gray-matter`. Ovellum cares about:

- the `ovellum: true` marker on auto-generated files
- the `ovellum: { mode: … }` per-file override
- `title:` and `description:` on manual-mode pages
- arbitrary user-defined keys passed through untouched

### `gray-matter`

The frontmatter parser used by `@ovellum/reader` and `@ovellum/site`. Splits
a Markdown file into `{ data, content }`.

### Breadcrumbs

The horizontal "Section › Page" trail rendered above the article on
nested doc pages. Computed from the nav tree by walking from the root
to the current page (`findBreadcrumbs()` in `@ovellum/site/src/nav.ts`).
Top-level pages get none. The final entry is the current page, marked
`aria-current="page"`.

### CTA (call to action)

A button on the landing-page hero or feature section that invites the
reader to do something — "Get started", "View on GitHub". Configured
under `site.landing.hero.ctas`. First button defaults to `primary`
style (accent fill), the rest default to `secondary` (outlined).

### Feature card

One cell of the landing-page feature grid: optional icon + title + short
description. Configured under `site.landing.features[]`. Material for
MkDocs-style; auto-fits 1–4 columns by viewport.

### Heading anchor (UI)

A small clickable `#` link prepended to each `<h2>`/`<h3>` in rendered HTML
by `rehype-autolink-headings`. Different from anchors (the merge-engine
concept above). The styled `.heading-anchor` class is what users see; the
`<!-- ovellum:anchor -->` comments are invisible.

### Hero

The full-width title + subtitle + CTA buttons block at the top of a
landing page. Configured under `site.landing.hero`. Renders only when
`site.landing.enabled === true`.

### Hybrid mode

The default mode. Combines auto generation with manual writing in the same
files: auto-generated content is rewritten on every build, while
[protected zones](#protected-zone--manual-block) are preserved verbatim and
[orphans](#orphan) are quarantined. Set via `mode: 'hybrid'`.

### Inline tag

A JSDoc tag (default `@preserve`) that marks a doc comment as
human-managed. Distinct from the [block tag](#block-tag) used in Markdown.
Both are configurable via `protect.inlineTag` / `protect.blockTag`.

### Block tag

The Markdown HTML-comment tag pair (default `<!-- @manual:start -->` /
`<!-- @manual:end -->`) that fences a [protected zone](#protected-zone--manual-block).
Configurable via `protect.blockTag` (default `'@manual'`).

### IR (intermediate representation)

The typed shape passed from `@ovellum/parser` to `@ovellum/generator`.
Comprises `DocNode`, `DocFile`, `DocProject` plus the `DocParam` and
`DocReturn` value objects. Decouples parsing from rendering — a future
non-TS parser could produce the same IR and reuse the generator.

### `_landing.md`

Optional content file (`{input}/_landing.md`) that supplies free-form
Markdown prose for the "Why" section of the landing page. Rendered
between the feature grid and the trust strip. Underscore prefix keeps
it out of the regular sidebar / page walk.

### Landing page

A wider, marketing-style page rendered at `/` when
`site.landing.enabled === true`. Hero + feature grid + optional pitch
prose + optional trust strip. Doc pages keep their existing URLs; the
top-bar gains a Docs link (configurable via `site.landing.docsHref`).
Disabled by default — manual-mode sites without landing config
continue to use `content/index.md` for `/`. Inspired by Material for
MkDocs.

### Manual mode

Markdown-first static site builder. No source parsing. Powered by
`@ovellum/site`. Set via `mode: 'manual'`. Produces HTML + CSS + minimal JS
suitable for any static host.

### Merger

`@ovellum/merger` — the package responsible for combining freshly generated
content with previously authored [protected zones](#protected-zone--manual-block).
Quarantines [orphans](#orphan).

### `MergeResult`

The return shape of `merge(generated, manual, opts?)`:

```typescript
{ content: string; orphans: OrphanRecord[]; warnings: string[] }
```

### `OrphanRecord`

Metadata for a protected zone whose anchor disappeared. Carries
`orphanedAt`, `sourceFile`, `anchorId`, optional `manualBlockId` and
`anchorLastSeen`, and the original `content`. Written by the CLI to
`.ovellum/orphans/{YYYY-MM-DD}_{slug}.md` with frontmatter metadata.

### Orphan

A protected zone whose source anchor no longer exists in the current IR
(symbol was renamed, deleted, or moved). Quarantined, never silently
dropped. Reviewed via [`ovellum orphans`](./CLI.md#ovellum-orphans-) deferred.

### `ovellum.config.*`

The project's config file. Lives at the project root by default; can also
appear in subdirectories to override (deepest wins). See [`CONFIG.md`](./CONFIG.md)
for every field.

### `OvellumError`

Base error class exported from `@ovellum/core`. Carries `code` (machine-
readable, e.g. `INVALID_CONFIG`, `UNCLOSED_MANUAL_TAG`) and optional
`hint` (CLI-friendly suggestion). `ConfigError` extends it with code
`INVALID_CONFIG`.

### `@preserve`

JSDoc tag (the default [inline tag](#inline-tag)) on a source comment that
asks the generator to wrap the comment's description in a
[protected zone](#protected-zone--manual-block) automatically — so user
edits to that description survive regeneration. The flag is captured on
`DocNode.isPreserved`; generator-side auto-wrapping is deferred.

### Pretty URL

Output path shape in manual mode: each page becomes `{name}/index.html`
so the URL is `/{name}/`. Works on any host without rewrites.

### Protected zone / Manual block

A `<!-- @manual:start id="…" -->` … `<!-- @manual:end -->` region in a
Markdown file whose contents are preserved verbatim across regeneration.
The two terms are interchangeable; spec calls them "protected zones",
runtime code (`ProtectedBlock` type, `manual-block-N` fallback IDs) leans
"manual block".

### Quarantine

The act of writing an [`OrphanRecord`](#orphanrecord) to disk under
`protect.orphanDir` (default `.ovellum/orphans/`) rather than discarding
it. Orphan files are intentionally human-readable Markdown — reviewable
in PRs.

### `rehype` / `remark`

The unified ecosystem markdown/HTML pipeline used by `@ovellum/site`.
remark parses Markdown to mdast; remark-rehype converts to hast; rehype
plugins decorate (anchors, slugs); rehype-stringify emits HTML. Shiki is
applied as a hast transform.

### Trust strip

The optional row of partner / sponsor / "powered by" links rendered at
the bottom of a landing page, above the footer. Configured under
`site.landing.trustStrip`. Each item is `{ name, href?, image? }` —
items with an `image` render as `<img>`s, items without render as
text badges.

### Pagefind

The static-site search indexer used when `site.search.enabled` is
`true`. Runs at the end of `ovellum build` against the output
directory, produces `dist/pagefind/` (index + bundled UI), and the
topbar mounts Pagefind's default UI via a small init script. Build-time
indexing; the only runtime JavaScript is what Pagefind itself ships
for the search overlay.

### shiki

The TextMate-grammar-based syntax highlighter used at build time. Emits
HTML with CSS variables (`--shiki-light` / `--shiki-dark`) so a single
build serves both light and dark code-block themes with zero runtime cost.

### Site (in code)

A package or concept name: `@ovellum/site`, the manual-mode static site
builder. Distinct from "site" in the colloquial sense (the built output).

### `ts-morph`

The TypeScript compiler API wrapper used by `@ovellum/parser`. Provides a
friendlier surface than the raw compiler API; full type information
retained.

### Tier 1 / Tier 2 / Tier 3 (design tokens)

Architecture for the CSS custom properties defined in [`STYLES.md`](./STYLES.md):

- **Tier 1** — palette (`--color-{name}-{50…950}`). Raw OKLCH values.
- **Tier 2** — semantic (`--color-fg`, `--color-bg`, `--color-accent`…).
  Maps palette → role. Swapped per theme.
- **Tier 3** — component-specific overrides (`--callout-info-bg`,
  `--code-comment-fg`…). Default to Tier 2; themes can override per
  component if needed.
