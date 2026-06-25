---
'ovellum': minor
---

Incremental watch builds for auto/hybrid projects.

`ovellum watch` (and `dev`) used to re-parse the entire project on every
keystroke. Now, in auto and hybrid modes, the watcher keeps the TypeScript
parser warm: when you save a file it re-parses only that file, then rebuilds only
the docs whose content actually changed — much faster once a codebase grows past
a handful of files.

It stays correct: the whole project is re-extracted from the warm in-memory AST
(so a cross-file type change still ripples into every doc that references it),
the persisted `.ovellum/ir.json` snapshot continues to reflect the whole
project, and hybrid protected zones are preserved exactly as in a full build.
Manual-mode sites and config-file changes still do a full rebuild.

No new flags — it's automatic under `ovellum watch`/`dev`.
