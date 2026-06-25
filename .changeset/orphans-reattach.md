---
'ovellum': minor
---

`ovellum orphans --reattach` — interactively rescue quarantined prose.

When a refactor orphans a protected block, getting the prose back used to be a
copy-paste chore. `ovellum orphans --reattach` now walks the archive one orphan
at a time and, for each, offers to:

- **Reattach** it to a suggested anchor — the same anchor if the symbol is back
  in the source, or a name-similar one if it was likely renamed (or type a
  different anchor id). The prose is spliced into a `@manual` protected zone
  under that anchor, so the next build preserves it, and the archive file is
  removed.
- **Delete** the orphan (with confirmation), or **skip** it.

It reads the current anchors from the last build's IR snapshot, so run
`ovellum build` first; the reattach target is a built doc, so the change lands
exactly where a rebuild keeps it. This completes the hybrid loop: a rename can
orphan prose, and now you can put it back in one interactive pass.
