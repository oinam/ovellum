---
title: Snippets & includes
description: Author a piece of Markdown once and include it on many pages — with the same sanitization, directive support, and link checking as inline content.
tags: [snippets, includes, partials, reuse]
---

# Snippets & includes

Some prose belongs on many pages: an installation warning, a prerequisites
block, a support notice. Write it once as a **snippet** and include it wherever
it's needed — when it changes, every page picks up the new text on the next
build.

## Write a snippet

A snippet is a plain Markdown file. By convention it lives in `_snippets/` —
any folder starting with `_` is already excluded from pages and navigation, so
snippets never become pages themselves:

```
content/
  _snippets/
    requirements.md
  guides/
    install.md
```

```markdown
<!-- content/_snippets/requirements.md -->
:::note
Ovellum needs **Node 20+**. Check with `node --version`.
:::
```

Snippets can use everything a page can — [component
directives](/docs/guides/components/), code blocks, images — because they're
spliced in *before* rendering: the included content flows through the same
pipeline (and the same HTML sanitizer) as the page's own Markdown.

## Include it

Use the `::include` directive (note the **two** colons — it's a leaf
directive, on its own line):

```markdown
# Install

::include[/_snippets/requirements.md]

Now run the installer…
```

- A **root-absolute** path (`/_snippets/…`) resolves from the content root —
  the same convention as [asset references](/docs/guides/assets/).
- A **relative** path (`::include[warning.md]`) resolves against the including
  file's folder.
- The attribute form `::include{file="/_snippets/requirements.md"}` is
  equivalent.

Snippets can include other snippets (nesting is fine; circular includes are
caught and skipped with a warning). A snippet's own frontmatter is metadata
about the snippet — it's stripped, never merged into the page. Headings inside
a snippet join the page's table of contents like any other heading.

## With multiple languages

On an [i18n](/docs/guides/i18n/) site, an include resolves in the **current
locale's tree first**, then falls back to the **default locale's** tree. So
you can translate a snippet by creating the same path under `content/<code>/`
— locales that haven't translated it yet render the default-locale version
instead of a hole.

## When something is wrong

A missing target, a circular include, or a path that tries to escape the
content directory never breaks the build and never leaks raw markup: the
directive is omitted and the build reports a warning naming the file and line.

`ovellum check` validates every include target too — a broken include is a
normal issue (exit `1`), so CI catches it before readers do:

```
ovellum check complete in 12ms
  ...
  broken includes: 1
  details:
    guides/install.md:5  broken include /_snippets/requirments.md — file not found
```

## Boundaries (by design)

- **Manual mode only** — includes are a site-builder feature; auto/hybrid
  generated Markdown is produced from source, not composed from snippets.
- **The `.md` mirrors show the authored source** — like component directives,
  an `::include` line appears as written in a page's
  [AI mirror](/docs/reference/config/#ai), not expanded.
- **Includes stay inside the content directory** — no `..` escapes, no
  absolute filesystem paths, same containment rule as everything else.
