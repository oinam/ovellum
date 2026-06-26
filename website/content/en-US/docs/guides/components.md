---
title: Components
description: 'Callouts, steps, cards, and tabs — rich content blocks written in plain Markdown with directive syntax.'
---

# Components

Ovellum ships a small set of content components — callouts, steps, cards, and
tabs — written with the **`:::` directive syntax**. They're plain Markdown
([CommonMark directives](https://talk.commonmark.org/t/generic-directives-plugins-syntax/444)),
not JSX or a custom format, so your source stays portable and the output is just
HTML + CSS. Everything below is theme-styled and works in light and dark.

## Callouts

Flag a passage as a note, tip, or warning. Open a fenced block with `:::` and the
type:

```markdown
:::note
Ovellum sanitizes all Markdown before rendering.
:::

:::warning{title="Heads up"}
Renaming a documented symbol orphans its hand-written prose.
:::
```

Types: `note`, `tip`, `important`, `warning`, `caution`. The label defaults to the
type's name; override it with `{title="…"}`.

> [!NOTE]
> The GitHub-style alert syntax — `> [!NOTE]`, `> [!WARNING]`, … — produces the
> same callouts, so either form works.

## Steps

A numbered walkthrough. The outer `::::steps` wraps one `:::step` per item:

```markdown
::::steps
:::step{title="Install"}
`npm install -D ovellum`
:::

:::step{title="Initialize"}
Run `npx ovellum init` and answer the prompts.
:::
::::
```

Numbers are added automatically. `{title="…"}` is optional.

## Cards

A responsive grid of cards. Add `href` to make a whole card a link:

```markdown
::::cards
:::card{title="Manual mode" href="/docs/guides/manual-mode/"}
Build a static site from Markdown.
:::

:::card{title="Hybrid mode" href="/docs/guides/hybrid-mode/"}
Generate from source, keep your prose.
:::
::::
```

A card without `href` renders as a plain (non-clickable) card.

## Tabs

Show alternatives in one place — install commands, language variants, OS steps.
The outer `::::tabs` wraps one `:::tab` per panel; `{label="…"}` names the tab:

```markdown
::::tabs
:::tab{label="npm"}
`npm install -D ovellum`
:::

:::tab{label="pnpm"}
`pnpm add -D ovellum`
:::
::::
```

The first tab is shown by default; the tablist is keyboard-navigable (arrow
keys). With JavaScript disabled, every panel is shown in full, so no content is
ever hidden from a reader or a crawler.

## Nesting rule

A component that **contains other directives** (steps, cards, tabs) must use one
more colon than its children — `::::steps` around `:::step`. This is how the
parser tells an outer block from an inner one. Callouts hold ordinary Markdown,
so they just use `:::`.
