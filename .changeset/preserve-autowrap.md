---
'ovellum': minor
---

`@preserve` auto-wrapping — keep a symbol's docs hand-owned across regeneration.

Tag a JSDoc comment with `@preserve` (the configurable inline tag) and, in
**hybrid** mode, Ovellum now wraps that symbol's generated section in a `@manual`
protected zone automatically. The first build seeds the zone with the generated
content; after that, anything you edit inside it survives every regeneration —
the same guarantee as a hand-authored zone — and if the symbol is deleted or
renamed, the prose is orphaned (to `.ovellum/orphans/`) rather than lost.

The anchor comment stays outside the zone, so reattach and orphan tracking keep
working. Class methods are wrapped too; properties (rendered as a table) are
not. `auto` mode regenerates fully each build, so it emits no zones.
