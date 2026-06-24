---
'ovellum': minor
---

Persist the parsed IR after every auto/hybrid build.

`ovellum build` (and `watch`) now write the parsed `DocProject` to
`<project>/.ovellum/ir.json` on every `auto` / `hybrid` build — a snapshot of
the symbols, anchors, and signatures Ovellum just read from your source. The
file is a small JSON envelope (`{ generator, format, version, project }`) and is
reported as a new `ir:` line in the build summary.

It's build _state_, not deploy output: it lives at the project root beside
`.ovellum/orphans/`, stays there regardless of `--out`, and `.ovellum/` is
gitignored by the default scaffold. This is the foundation for upcoming
source-diff, rename detection, and anchor last-seen tracking — and you can read
it yourself for any tooling that wants a structured view of your API surface.

Manual-mode builds parse no source and write no IR.
