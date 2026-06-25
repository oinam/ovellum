---
'ovellum': minor
---

One-step MCP adoption: a Claude Code plugin + cross-tool install.

Ovellum is now installable as a **Claude Code plugin** that bundles the
`ovellum-docs` skill and registers the MCP server in one step:

```
/plugin marketplace add oinam/ovellum
/plugin install ovellum@ovellum
```

For other MCP clients (Cursor, Windsurf, Cline, VS Code), add `ovellum` to the
tool's MCP config — `{ "command": "npx", "args": ["-y", "ovellum", "mcp"] }`. The
[Automation guide](https://ovellum.oss.oinam.com/docs/guides/automation/) has
per-tool snippets.

Also: `ovellum mcp` is now explicitly excluded from the update-notifier, so
nothing but JSON-RPC ever reaches stdout when running as a server.
