---
'ovellum': minor
---

Theme inheritance, slice 1 — `site.css`. A new `site.css` config field takes one
stylesheet URL or an array of them, linked into `<head>` **after** the base
theme CSS so their rules win the cascade by source order. It's the supported,
validated hook for overriding the design tokens (`--color-bg`, `--color-fg`,
`--color-border`, `--color-primary`/`--color-accent`, `--font-body`/`--font-mono`,
the `--callout-*` set) or pointing the docs at a host project's design system so
they re-skin to match. Unlike `site.headExtra` (raw `<head>` markup), it emits
`<link rel="stylesheet">` only and rejects `javascript:`/`data:` URLs. Relative
and root-absolute paths are basePath-aware; `http(s)://` URLs pass through.
