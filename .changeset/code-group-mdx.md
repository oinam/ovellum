---
'ovellum': minor
---

Add `:::code-group` (tabbed code blocks) and treat `.mdx` files as Markdown.

- **`:::code-group`** turns a set of fenced code blocks into a tabbed switcher
  (the common npm / pnpm / yarn picker). Each tab is labeled by the fence's
  language, or by a `title="…"` on the info string:

  ````markdown
  :::code-group
  ```bash
  npm install -D ovellum
  ```

  ```bash title="pnpm"
  pnpm add -D ovellum
  ```
  :::
  ````

- **`.mdx` files** are now picked up, routed, and rendered exactly like `.md` —
  all Markdown features and directives work. There is no JSX evaluation; an
  `.mdx` file is just Markdown with a different extension.
