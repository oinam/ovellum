---
title: Anchors and protected zones
description: The tagging contract that lets auto-generated and hand-written content coexist.
---

# Anchors and protected zones

Hybrid mode works because Ovellum and the author agree on two kinds of
marker. Together they form a contract: the author owns whatever's inside
protected zones, the tool owns everything else.

## Anchors

Every auto-generated section in a Markdown file gets an HTML comment that
identifies which source symbol it documents:

```html
<!-- ovellum:anchor id="src/utils/format.ts::formatDate" generated="2026-05-16T..." -->
```

The `id` is the symbol's **anchor ID**, formatted as
`{relativeFilePath}::{symbolPath}`. Class methods use dot notation
(`src/models/User.ts::User.constructor`); module-level docs use the
sentinel `__module__`.

Anchors are invisible to readers — they're HTML comments, stripped by the
browser. Their job is to give the merger a stable handle on each section.

## Protected zones

A protected zone is a region of Markdown that Ovellum will never overwrite.
You author it; you own it forever.

```markdown
<!-- @manual:start id="rationale" -->

**Note.** We use `String#padStart` here instead of a manual loop because V8
intrinsifies it and the manual version showed up in flamegraphs. This
commentary was added by hand and should survive regeneration.

<!-- @manual:end -->
```

Rules:

- The `id` attribute is optional but strongly recommended. Without it
  Ovellum generates a positional fallback like `manual-block-3`, which
  breaks when the surrounding file is restructured.
- With an explicit `id`, the block survives anything except the
  disappearance of its anchor.
- Blocks can appear anywhere — between heading + body, after a code fence,
  inside a list, wherever.
- Nested zones are not supported. You'll get a clear error if you nest them.

## How they fit together

Each protected zone is automatically associated with the nearest preceding
anchor comment. That anchor is what the merger uses to find a home for the
block on the next build:

```
<!-- ovellum:anchor id="src/utils/format.ts::formatDate" generated="..." -->
## formatDate

Auto-generated description.

| Param  | Type   |
| ------ | ------ |
| ...    | ...    |

<!-- @manual:start id="rationale" -->
Hand-written note.
<!-- @manual:end -->
```

On the next build, even if the auto-generated table changes shape, the
protected zone stays under `formatDate` — Ovellum sees the anchor ID, looks
up the block, and splices it back in at the same position.

## When the anchor disappears

If you rename or delete `formatDate` in source, its anchor ID
(`src/utils/format.ts::formatDate`) no longer appears in the freshly
generated content. The merger can't find a home for the protected block.
That block becomes an [orphan](/docs/concepts/orphans/) and is quarantined to
`.ovellum/orphans/` for your review — never silently dropped.

## Inline cousin: `@preserve`

The block tag works inside Markdown files. There's a JSDoc counterpart for
your source code:

```typescript
/**
 * Formats a date.
 *
 * @preserve
 * **Note:** uses the user's local timezone by default. Override with the
 * `timezone` option for deterministic output.
 *
 * @param date - The date to format.
 */
export function formatDate(date: Date): string {
  /* ... */
}
```

When `@preserve` appears in a source comment, the **hybrid** build auto-wraps
that symbol's generated section in a `@manual` protected zone (keyed by the
symbol's anchor id). The first build seeds the zone with the generated content;
from then on, anything you edit inside it survives regeneration exactly like a
hand-authored zone — and if the symbol is deleted or renamed, the prose is
[orphaned](/docs/concepts/orphans/) rather than lost.

It's a hybrid-mode feature: `auto` mode regenerates fully every build, so it
emits no zones (nothing would preserve them). The anchor comment stays outside
the zone, so reattachment and orphan tracking keep working. Members (class
methods) are wrapped too; properties — rendered as a table — are not.

## Configuring the tags

Both tags are configurable, in case `@manual` or `@preserve` clash with
something else in your project:

```json
{
  "protect": {
    "blockTag": "@keep",
    "inlineTag": "@hand-written"
  }
}
```

Customize sparingly — the defaults are documented everywhere, and changing
them means future Ovellum updates may bring new behaviors tied to the
default tag names.
