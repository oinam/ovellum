---
'ovellum': minor
---

Generated docs now respect the real edited date. The generator used to bake two
build-time timestamps into every file — a `generated: <now>` frontmatter field
and a `generated="<now>"` attribute on each `ovellum:anchor` comment — so
regenerating produced different bytes every run, a fresh git diff each build,
and the page read "Edited today" forever even when the source never changed.

Generation is now **deterministic**: both timestamps are removed (the anchor
attribute was decorative — the reader/merger match on `id=` only), so unchanged
source regenerates byte-identically. In their place the generator stamps
`updated:` = the **source file's** last-change date (git author date, following
renames), resolved by the CLI and injected into the pure generator. A generated
page's "Edited" line now tracks when the documented *code* last changed, not
when `ovellum build` last ran — and because it's baked into the frontmatter at
generation time, it stays correct even on a shallow-clone site build.
