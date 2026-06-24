---
'ovellum': minor
---

Detect likely renames instead of orphaning blindly (suggest-only).

Refactors are the #1 cause of orphaned manual blocks: rename a symbol and the
prose tied to its old anchor has nowhere to go. Ovellum now spots this.

When an anchor disappears and a similar symbol appears the same build — same
kind, similar name, matching signature shape — the two are paired as a likely
rename:

- `ovellum diff` shows a **likely renames** section (with a confidence score),
  lifting the pair out of the raw added/removed lists, and includes `renames` in
  its `--json` output.
- At build time, when a protected block is orphaned but its anchor probably just
  moved, the build warns: `did src/date.ts::formatDate become
  src/date.ts::formatDateUTC? a protected block was orphaned — reattach it under
  the new anchor`.

This is suggest-only — performing the re-attach is still a manual step.
