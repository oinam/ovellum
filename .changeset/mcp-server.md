---
'ovellum': minor
---

Add `ovellum mcp` — drive Ovellum from an AI agent over MCP.

`ovellum mcp` runs Ovellum as a [Model Context
Protocol](https://modelcontextprotocol.io) server over stdio, so an agent can
use it as a first-class tool. It's built into the CLI — no extra dependency to
install.

Tools exposed:

- `ovellum_query_symbol` — look up a symbol by anchor id or name in the IR
  snapshot (signature, source location, params, returns).
- `ovellum_diff` — added / removed / changed / renamed symbols vs the last
  build, and which docs would change.
- `ovellum_list_orphans` — quarantined manual blocks, with reattachability.
- `ovellum_get_page` — the built Markdown for one page (the AI-friendly mirror).
- `ovellum_build` — run a build and return its summary.
- `ovellum_write_zone` — **write Markdown into a protected `@manual` zone** under
  an anchor id. The hybrid merge engine preserves it across the next
  regeneration — the one thing no other docs server offers: an agent's prose
  that survives rebuilds instead of being overwritten. Supports `dryRun`.

Add it to a client, e.g. Claude Code:

```bash
claude mcp add ovellum -- npx ovellum mcp --cwd /path/to/project
```
