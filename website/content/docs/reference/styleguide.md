---
title: Styleguide
description: The typography, scale, rhythm, colour, and content elements Ovellum renders — what every Markdown page looks like, and how the system is built.
tags: [styleguide, typography, design, theme]
---

# Styleguide

This page is both the **reference and the proof** — every element below is real
Markdown rendered by Ovellum's default template, so what you see is exactly what
your own pages get. It documents the type scale, the vertical rhythm, the colour
system, and each content element you can write.

Try the **appearance control** in the top bar while you read: switch mode
(auto / light / dark), pick a theme, or set a colour. Everything on this page
re-tints live, because it's all driven by the same design tokens.

## Typography

Text and headings are set in **Geist**; code is set in **Geist Mono** — both
self-hosted variable fonts, loaded with `font-display: swap` so text paints
immediately in a fallback and swaps when the face arrives. The typeface is the
*site's* choice (set once, in config); the scale, rhythm, and colour below are
Ovellum's shipped defaults and apply to any template.

Body text runs at a **`1.55` line-height** inside a **`76ch` measure** — the
reading column is capped at roughly 76 characters per line, the band where long
prose stays comfortable. Headings tighten to a **`1.2` line-height** with a
small negative letter-spacing so they read as one unit rather than spaced
words.

### The type scale

Sizes come from a **modular scale**: one base size, multiplied by a fixed ratio
at each step. Ovellum uses a **major third (1.25)** on a fluid base that grows
from ~15px on small screens to 16px on wide ones (a single `clamp()` — no
breakpoints). Each heading maps to a step, so the hierarchy is mathematical, not
hand-picked:

| Step            | Ratio from base | Used by        |
| --------------- | --------------- | -------------- |
| `--font-size-4` | 1.25⁴ (≈ 2.44×) | `h1`           |
| `--font-size-3` | 1.25³ (≈ 1.95×) | `h2`           |
| `--font-size-2` | 1.25² (≈ 1.56×) | `h3`           |
| `--font-size-1` | 1.25¹ (1.25×)   | `h4`, lead     |
| `--font-size-0` | 1× (base)       | body, `p`, `li`|

Because every step is `calc(previous × var(--ratio))`, changing the one
`--ratio` token reflows the entire hierarchy in proportion.

### Headings

The six levels, rendered at their real sizes:

# Heading level 1
## Heading level 2
### Heading level 3
#### Heading level 4
##### Heading level 5
###### Heading level 6

Each heading gets a stable `id` and a hover anchor (`#`) so any section is
directly linkable, and `h2`/`h3` are collected into the "On this page" list to
the right.

## Vertical rhythm

Spacing isn't ad hoc — it's a **fluid space scale** (`--space-3xs` through
`--space-3xl`), each step a `clamp()` that grows gently with the viewport. Block
elements share one rule: **no top margin, a consistent gap below**, so rhythm
accumulates predictably down the page. Headings add a larger lead-in *above*
(an `h2` opens a new section with generous space before it, tight space after),
which is what makes a heading feel attached to the text it introduces.

## Paragraphs and inline text

A paragraph sets the baseline. This sentence shows **bold for emphasis**,
*italic for stress*, and `inline code` for identifiers — code gets a faint tint
and a monospace face so a symbol like `OvellumUserConfig` never gets mistaken
for prose. Links such as [the configuration reference](/docs/reference/config/)
carry an accent colour and a thin underline offset from the baseline; they
[change tint on hover](/docs/reference/config/). You can also strike text with
~~strikethrough~~ for retractions.

> A blockquote sits slightly inset with a single rule on the leading edge and
> muted text — quiet, not boxed. Use it for an aside or a pulled quote, not for
> emphasis (that's what bold is for).

### Callouts

GitHub-style alert blockquotes become tinted callout panels:

> [!NOTE]
> Useful context that complements the surrounding prose.

> [!TIP]
> A shortcut or a better way to do the thing.

> [!IMPORTANT]
> Something the reader genuinely shouldn't miss.

> [!WARNING]
> A sharp edge — proceed deliberately.

> [!CAUTION]
> A risk of data loss or a hard-to-reverse action.

## Lists

Unordered lists use a quiet marker in a subdued colour, and nest with reduced
spacing so depth reads as hierarchy:

- A first item, kept to a line or two.
- A second item, with nested detail:
  - A nested point.
  - Another, to show the indent step.
    - One level deeper still.
- A final item.

Ordered lists carry the same rhythm:

1. Author the page in Markdown.
2. Run `ovellum build`.
3. Deploy the `dist/` output anywhere static.

Task lists render their checkboxes:

- [x] Typography scale
- [x] Colour system
- [ ] Your next page

## Code

Inline code reads as `const x = 1`. Fenced blocks are highlighted by Shiki using
a dual light/dark theme emitted through CSS variables — so the colours flip with
the appearance mode at zero runtime cost — with a language eyebrow and a copy
button:

```typescript
import { defineConfig } from 'ovellum';

export default defineConfig({
  mode: 'manual',
  input: 'content',
  output: 'dist',
  site: {
    title: 'My Docs',
    palette: 'default',
  },
});
```

```bash
ovellum build
```

## Tables

Tables are editorial-calm — horizontal rules only, no grid lines, no header
fill. The header reads through weight and a thicker bottom rule; a table wider
than the column scrolls horizontally rather than blowing out the layout:

| Element     | Token            | Note                                  |
| ----------- | ---------------- | ------------------------------------- |
| Body text   | `--font-size-0`  | Fluid 15→16px base                    |
| Measure     | `--content-max`  | `76ch` reading column                 |
| Body rhythm | `--leading-normal` | `1.55` line-height                  |
| Headings    | `--leading-tight`  | `1.2` line-height, negative tracking |

## Images

Images scale to the column width, keep their aspect ratio, and pick up the same
corner radius as other media:

![Ovellum](/ovellum-logo.svg)

Put a page-specific image next to its Markdown file and reference it with a
root-absolute path; see the [Assets & downloads](/docs/guides/assets/) guide for
where images, downloads, and media live.

## Video

Paste the embed code straight from YouTube or Vimeo — "Share → Embed", copied
verbatim — and it just works. Ovellum allows `<iframe>` **only** from those known
video hosts, hardens it, and wraps it in a responsive 16:9 frame:

<iframe width="560" height="315" src="https://www.youtube.com/embed/1Jpjw2w_0l8" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

That's the exact snippet YouTube hands you — fixed `width`/`height` and all. The
responsive wrapper overrides the pixel dimensions, and `loading="lazy"` plus a
strict referrer policy are applied automatically. For self-hosted clips, the
native `<video>` / `<audio>` players work too. Both are covered in
[Assets & downloads](/docs/guides/assets/).

## Horizontal rule

A thematic break sets a quiet divider between passages:

---

That rule, like everything above, is the default template doing its job — no
custom CSS on this page.

## The colour system

Five palettes ship, each authored in **OKLCH** (perceptually uniform, so a ramp
steps in even visual increments rather than the uneven jumps sRGB hex gives):

- **Ovellum** — neutral greys, the default.
- **Nord** — cool, frosty blue-greys.
- **Flexoki** — warm, inky paper.
- **Solarized** — Ethan Schoonover's measured base tones.
- **E-ink** — high-contrast warm paper and ink, monochrome.

Each palette is one grey ramp plus an accent; **dark mode reuses the same ramp
with reversed indices**, so there's no second set of values to maintain. The
appearance control's **Color** picker overrides just the accent, live. All of it
flows through semantic tokens (surface, border, foreground, link), which is why
a single switch re-tints the entire page — this one included.
