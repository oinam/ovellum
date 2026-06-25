# Ovellum — Claude Code plugin

One-step setup for driving [Ovellum](https://ovellum.oss.oinam.com) from Claude
Code. Bundles:

- the **`ovellum-docs` skill** (how to set up and maintain Ovellum docs, the
  hybrid protected-zone contract, the CLI/MCP recipes), and
- the **Ovellum MCP server** (`.mcp.json` → `npx ovellum mcp`): query symbols,
  diff, check, list orphans, get pages, build, and **write into protected zones
  that survive regeneration**, plus MCP resources (`ovellum://…`) and prompts
  (`set-up-ovellum`, `document-symbol`, `review-doc-drift`).

## Install

```
/plugin marketplace add oinam/ovellum
/plugin install ovellum@ovellum
```

The MCP server runs `npx ovellum mcp` in your project directory, so install
`ovellum` in (or make it resolvable from) the project you're documenting.

Not on Claude Code? Any MCP client works — see
[Automation & AI agents](https://ovellum.oss.oinam.com/docs/guides/automation/)
for `npx ovellum mcp` config snippets (Cursor, Windsurf, Cline, VS Code).
