---
'ovellum': minor
---

Add `ovellum orphans` — review quarantined manual blocks.

When a protected `@manual` block's anchor disappears during a hybrid build, its
prose is moved to `.ovellum/orphans/` instead of being lost. `ovellum orphans`
is how you review what's accumulated, without writing anything:

- Default: lists each orphan's anchor id, the doc it came from, when it was
  orphaned (and how long ago), the last build that still saw the anchor, and —
  when an IR snapshot exists — whether that anchor is **back in the source**
  (reattachable) or **gone**.
- `--stale` shows only orphans older than `protect.orphanRetention` days
  (default 90) — the quarterly-review filter.
- `--json` emits the list for CI and tooling.

Builds also now record when an anchor was last seen: a freshly-orphaned block is
stamped with the timestamp of the last build that still contained its anchor,
read from the persisted IR snapshot.

Reattaching and deleting orphans is still done by hand; an interactive flow is
planned.
