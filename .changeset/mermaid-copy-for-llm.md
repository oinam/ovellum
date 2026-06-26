---
'ovellum': minor
---

Add Mermaid diagrams and per-page "use with an LLM" actions.

- **Mermaid** — a ` ```mermaid ` code block renders as a diagram. The runtime is
  lazy-loaded on the client and **only on pages that contain a diagram**, so the
  default site ships no extra JavaScript. Configure with `site.mermaid`:
  `{ enabled: false }` to turn it off, or `{ url: '/mermaid.min.mjs' }` to
  self-host the runtime instead of using the (pinned) CDN. With no JS/network the
  diagram source stays visible as a fallback.

- **Per-page LLM actions** — when the `.md` mirror is enabled (the default), each
  doc page shows a small row: **Copy page** (copies the page's Markdown), **View
  as Markdown**, and — when `site.baseUrl` is set — **Open in ChatGPT** / **Open
  in Claude** (hand the page to that assistant).
