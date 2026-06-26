---
'ovellum': minor
---

Publish Ovellum to the MCP Registry.

The package now carries an `mcpName` (`io.github.oinam/ovellum`) and the repo
ships a `server.json` manifest, so the Ovellum MCP server is listed in the
official [MCP Registry](https://registry.modelcontextprotocol.io). MCP clients
that browse the registry can discover and install it; the manifest passes the
`mcp` subcommand so it runs as `npx ovellum mcp`.
