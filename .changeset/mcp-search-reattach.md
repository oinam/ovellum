---
'ovellum': minor
---

MCP server: add `ovellum_search_docs` and `ovellum_reattach` tools.

The `ovellum mcp` server gains two tools that round out the agent surface:

- **`ovellum_search_docs`** — full-text search over the built docs, returning
  ranked pages (path, title, score, snippet). It's a built-in term-frequency
  search over the output Markdown, so it works in every mode with no extra
  runtime.
- **`ovellum_reattach`** — the non-interactive counterpart of
  `ovellum orphans --reattach`: splice an orphan's prose back into a protected
  zone under a target anchor (defaulting to the suggested present-again /
  renamed one) and remove the archive, or delete the orphan — so an agent can
  rescue orphaned prose after a refactor.
