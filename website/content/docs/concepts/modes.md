---
title: Modes
description: Auto, manual, and hybrid — three pipelines, one tool.
---

# Modes

Ovellum has one configuration knob that decides which pipeline runs:

```json
{
  "mode": "hybrid"
}
```

Three values are valid: `auto`, `manual`, and `hybrid`. Pick once per
project, or override per-directory or per-file. They are designed to be
mixed freely; nothing forces you to commit to one for the whole repo.

## `auto`

Generates Markdown documentation from your TypeScript / JavaScript source
and writes it to `output/`. Existing output is overwritten on every build.
No merge step, no manual layer.

```
src/utils/format.ts   →   docs/utils/format.md
src/models/User.ts    →   docs/models/User.md
```

Use this when:

- You only have an API reference to publish.
- You're treating docs as a build artifact, not a hand-edited surface.
- You're migrating from TypeDoc or similar and want the same workflow with
  a different output shape.

The output is plain Markdown — you can post-process it with anything that
reads `.md`.

## `manual`

The opposite end. Ovellum acts as a Jekyll-style static-site builder.
It walks `input/` for `.md` files and produces a deployable HTML site —
sidebar nav, right-side ToC, syntax-highlighted code, themes. No source
parsing involved.

```
content/index.md            →   dist/index.html
content/getting-started.md  →   dist/getting-started/index.html
content/guides/deploy.md    →   dist/guides/deploy/index.html
```

Use this when:

- You're writing docs by hand and want a clean output without source-of-truth
  generation.
- You're building a marketing site or landing page alongside your docs
  (enable [`site.landing`](/docs/reference/config/#sitelanding) for a Material
  for MkDocs-style homepage).
- You're hosting purely-prose content that has nothing to do with your code.

This site you're reading is built in `manual` mode.

## `hybrid` (default)

Generates from source, then merges your hand-written content back in. Your
prose lives inside the same files as the auto-generated reference. Ovellum
respects a tagging contract: anything between `<!-- @manual:start -->` and
`<!-- @manual:end -->` is yours and never gets touched. Everything else is
auto-generated and may be rewritten on every build.

```
                            ┌──────────────┐
src/utils/format.ts ────►   │  build       │   ────►  docs/utils/format.md
docs/utils/format.md ───►   │  parse + gen │
(existing manual blocks) ►  │  + merge     │
                            └──────────────┘
```

Use this when:

- You have an API surface that benefits from generation, plus narrative
  content that lives alongside it.
- You want one place to look for everything about a function — its
  signature, its parameters, and the team note that says "be careful, this
  is the slow path."
- You want renamed or deleted symbols to surface their orphaned prose for
  review rather than silently lose them.

The tagging contract is covered in [Anchors and zones](/docs/concepts/anchors-and-zones/);
orphan handling is in [Orphans](/docs/concepts/orphans/).

## Per-directory and per-file overrides

The `mode` field can also live in:

- A nested `ovellum.config.*` in any subdirectory. Deeper wins on conflict.
- The `ovellum:` block in a single file's frontmatter:

  ```markdown
  ---
  ovellum:
    mode: manual
  ---
  ```

  The page is treated as manual content even if the project default is
  `auto` or `hybrid`.

The full override resolution lives in [Reference → Config](/docs/reference/config/#per-file-overrides).
