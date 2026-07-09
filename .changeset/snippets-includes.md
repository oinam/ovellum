---
'ovellum': minor
---

Reusable snippets (W1). Write a piece of Markdown once — under `_snippets/`
or anywhere in your content tree — and splice it into any page with
`::include[/_snippets/note.md]` (relative paths and the
`::include{file="…"}` attribute form work too). Snippets can use component
directives, nest other snippets, and their headings join the page's ToC;
expansion happens before rendering, so everything still flows through the
same HTML sanitizer as inline content. Snippet frontmatter is stripped;
`_`-prefixed folders never become pages. On i18n sites an include resolves in
the current locale's tree first, then falls back to the default locale's.

Failures are safe and loud: a missing target, a circular include, or a path
escaping the content directory renders nothing, warns with the file and line,
and `ovellum check` now validates every include target (`broken-include`
issue kind, `counts.brokenIncludes` in `--json`) so CI catches them.
