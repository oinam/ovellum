---
'ovellum': minor
---

`ovellum clean` — remove generated output, safely. **Dry-run by default** (lists
what it would remove); `--confirm` deletes. In `manual` mode it removes the whole
output directory (100% generated from your content). In `auto`/`hybrid` mode it
removes generated Markdown (identified by the `ovellum: true` frontmatter) but
**never** a hand-written file or a generated file that contains a `@manual`
zone — that prose lives only on disk, so deleting it must be deliberate. The
orphan archive (`.ovellum/orphans/`) is preserved unless you pass `--orphans`.
