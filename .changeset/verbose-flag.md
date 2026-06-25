---
'ovellum': minor
---

Add `--verbose` to `build`, `check`, and `diff`.

`--verbose` prints diagnostic detail — which config was resolved, the build's
per-stage and file-I/O steps (parse timing, what was generated / written /
merged, where the IR and manifest landed), the scanned file count for `check`,
and the snapshot/diff summary for `diff`.

It writes to **stderr**, so it composes cleanly with `--json` — stdout stays
pure JSON for tooling while the verbose trace goes to stderr. Handy for figuring
out why a build picked the wrong config, didn't see a file, or merged
unexpectedly.
