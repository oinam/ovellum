---
'ovellum': minor
---

Add Markdown-native component directives: callouts, steps, cards, and tabs.

Author rich content blocks with the `:::` directive syntax — plain Markdown, no
JSX or MDX, so your source stays portable:

```markdown
:::note{title="Heads up"}
Ovellum sanitizes all Markdown before rendering.
:::

::::tabs
:::tab{label="npm"}
`npm install -D ovellum`
:::
:::tab{label="pnpm"}
`pnpm add -D ovellum`
:::
::::
```

- **Callouts** — `:::note | tip | important | warning | caution`, optional
  `{title="…"}`. (The GitHub `> [!NOTE]` alert syntax still works too.)
- **Steps** — `::::steps` with `:::step{title="…"}` items; auto-numbered.
- **Cards** — `::::cards` with `:::card{title="…" href="…"}`; a card with `href`
  becomes a link.
- **Tabs** — `::::tabs` with `:::tab{label="…"}`; keyboard-navigable, and with
  JavaScript off every panel is shown in full.

Components that contain other directives use one extra colon (`::::steps` around
`:::step`). See the Components guide.
