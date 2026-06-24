---
'ovellum': minor
---

Add `ovellum diff` — preview what a rebuild would change.

`ovellum diff` parses your current source and compares it against the IR
snapshot from the last build (`.ovellum/ir.json`), reporting added, removed, and
changed symbols plus which output docs they'd touch — without writing anything.

- Matches symbols by their stable anchor id, so a rename surfaces as a removed
  symbol plus an added one (dedicated rename detection comes later).
- Ignores edits that only shift line numbers; a change is reported only when the
  documented surface actually differs (signature, params, return, description,
  deprecation, JSDoc tags, export/visibility), including nested class and
  interface members.
- `--json` emits a machine-readable diff for CI and tooling.
- `--exit-code` makes it exit `1` when changes are found (git-diff style); by
  default it always exits `0` so it can be run informationally.

Auto/hybrid only — manual builds parse no source and keep no IR. Run
`ovellum build` first to record the baseline snapshot.
