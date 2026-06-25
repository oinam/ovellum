---
'ovellum': minor
---

MCP server: add Resources and Prompts.

`ovellum mcp` is now a first-class MCP server, not just a bag of tools. It
advertises `resources` and `prompts` capabilities alongside `tools`:

- **Resources** — Ovellum's read surface as pullable context: `ovellum://llms.txt`
  / `ovellum://llms-full.txt` (the AI output), `ovellum://page/{path}` (a built
  page's Markdown), `ovellum://ir` (the IR snapshot), and `ovellum://orphans`.
- **Prompts** — guided workflows the client surfaces: `set-up-ovellum`,
  `document-symbol` (read a symbol, draft prose, and write it into a protected
  zone that survives regeneration — the differentiator), and `review-doc-drift`.

Still dependency-free (hand-rolled JSON-RPC, no SDK).
