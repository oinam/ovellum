---
title: Mixing auto and manual (hybrid mode)
description: One file, two authors — the merge engine that lets them coexist.
---

# Mixing auto and manual (hybrid mode)

Hybrid mode is Ovellum's reason for existing. You point it at a TypeScript
or JavaScript project; it generates Markdown reference docs from your
source; on every rebuild it merges those generated docs with the
hand-written prose already in your `docs/` folder. Nothing of yours gets
overwritten as long as it's tagged.

## Setup

```json
{
  "mode": "hybrid",
  "input": "./src",
  "output": "./docs",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Run a first build to populate `docs/`:

```bash
npx ovellum build
```

Each `src/<path>.ts` produces a `docs/<path>.md` with frontmatter and a
section per exported symbol.

## Adding hand-written content

Open one of the generated files. You'll see anchor comments like:

```markdown
<!-- ovellum:anchor id="src/utils/format.ts::padZero" generated="..." -->

## padZero

\`\`\`typescript
function padZero(value: number, width: number): string
\`\`\`

Pads a number with leading zeros up to `width`.

**Parameters**

| Name  | Type   | Description        |
| ----- | ------ | ------------------ |
| value | number | The number to pad. |
| width | number | Target width.      |

**Returns** `string` - The padded string.
```

Drop a [protected zone](/docs/concepts/anchors-and-zones/) anywhere in the
section:

```markdown
<!-- @manual:start id="padZero-rationale" -->

**Author's note.** We use `String#padStart` here because V8 intrinsifies
it; the manual loop version showed up in flamegraphs.

<!-- @manual:end -->
```

Rebuild:

```bash
npx ovellum build
```

The summary tells you what happened:

```
ovellum build complete in 207ms
  mode:      hybrid
  sources:   12
  written:   12 file(s)
  merged:    3 file(s)   ← files where a manual block was spliced
  orphans:   0
```

Open the file again — your block is exactly where you left it, even though
the auto-generated section around it was regenerated from scratch.

## What happens when source changes

### A new symbol

You add a function to source; on the next build, a new auto-generated
section appears in the corresponding doc file. No manual blocks affected.

### A renamed symbol

You rename `padZero` to `padWithZeros`. The auto-generated section is now
keyed off the new anchor ID (`src/utils/format.ts::padWithZeros`). Your
`padZero-rationale` block was associated with the old anchor and now has
nowhere to go.

Ovellum [quarantines](/docs/concepts/orphans/) it to
`.ovellum/orphans/2026-05-15_src-format.ts-padZero.md` and tells you in the
summary:

```
ovellum build complete in 198ms
  ...
  orphans:   1
  quarantined:
    ↪ .ovellum/orphans/2026-05-15_src-format.ts-padZero.md
```

Open the orphan file, copy the body into a fresh manual zone under the
renamed function's section, delete the orphan.

### A deleted symbol

Same as a rename — the orphan goes to `.ovellum/orphans/`. Decide whether
the prose still applies to anything; either re-attach it elsewhere or
delete the orphan file.

## How hybrid pages get rendered

The pipeline:

1. **Parse**: `@ovellum/parser` walks the TypeScript / JavaScript sources
   and produces a `DocProject` — an Intermediate Representation of every
   exported symbol with its JSDoc.
2. **Generate**: `@ovellum/generator` renders the IR to Markdown, one
   file per source file, with anchor comments on every section.
3. **Read existing output**: for each output path, if the file already
   exists, `@ovellum/reader` extracts its protected zones.
4. **Merge**: `@ovellum/merger` splices the protected zones back into the
   freshly generated content, keyed by anchor ID. Anything left over →
   orphan.
5. **Write**: the final merged content is written to disk; orphans go to
   `.ovellum/orphans/`.

Steps 1-2 don't care that step 3-4 exist; if `mode` were `auto`, the
pipeline stops after step 2. That's why the same `parser` + `generator`
power both modes.

## A typical hybrid project

```
my-project/
  src/
    index.ts
    utils/
      format.ts
      validate.ts
  docs/
    index.md            (with handwritten intro + auto-gen API)
    utils/
      format.md         (with handwritten "rationale" zones)
      validate.md
  ovellum.config.json
  .ovellum/
    orphans/            (committed; reviewable in PRs)
```

`docs/` is what your readers see; `.ovellum/orphans/` is your safety net.

## Boundaries (by design)

These are deliberate boundaries that keep the merge contract simple and
predictable — not gaps waiting to be filled. A runnable hybrid project lives in
[`examples/`](https://github.com/oinam/ovellum/tree/main/examples) if you want to
see the whole loop end to end.

- **It doesn't produce HTML directly.** Hybrid output is Markdown; pair
  it with [`manual` mode in a separate config](/docs/guides/deploy/#self-hosted),
  or hand the output to any static-site builder that reads Markdown.
- **It doesn't merge across files.** Each output file is merged
  independently. If you move a function to a different source file and
  its anchor ID changes accordingly, the merge will orphan the prose.
- **It doesn't try three-way merges.** The contract is binary —
  auto-owned or human-owned, no middle ground. Simpler model, fewer
  surprise conflicts.
