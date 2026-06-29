---
'ovellum': minor
---

Plugins — remark/rehype markdown plugins (B1 slice 2). A plugin can now extend
the Markdown pipeline with `remarkPlugins` and `rehypePlugins` (each a unified
`Pluggable` — a plugin function or a `[plugin, options]` tuple), e.g. to add
`remark-math` + `rehype-katex` for LaTeX:

```ts
plugins: [{ name: 'math', remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }]
```

`remarkPlugins` run after Ovellum's built-in remark plugins and before the HTML
conversion; `rehypePlugins` run on the HTML tree. They apply to manual-mode page
rendering (doc pages + landing prose). **Security:** rehype plugins are injected
*before* sanitization, so Ovellum's sanitize step remains the guard over
everything they produce — a plugin can't inject `<script>` or other unsafe HTML.
