---
'ovellum': minor
---

Machine-readable CLI: `--json` on `build` and `check`.

An agent or CI job shouldn't have to scrape human-formatted output. `build` and
`check` now take `--json` (joining `diff`, which already had it): stdout becomes
a single JSON object, with no decorative output and nothing on stderr on
success.

- `build --json` → `{ ok, command, mode, durationMs, config, warnings, … }`
  (mode-specific fields for auto/hybrid vs manual).
- `check --json` → `{ ok, mode, pages, counts, issues[] }`, where each issue is
  `{ file, line, kind, message }`.

Exit codes are stable across commands — `0` success, `1` issues/build error,
`3` config error (emitted as `{ ok: false, error, hint }` on the JSON path) — so
a script can branch without parsing text.

A new [Automation & AI agents](https://ovellum.oss.oinam.com/docs/guides/automation/)
guide documents the JSON schemas, exit codes, the MCP server, and the
AI-friendly output. The `ovellum mcp` server also gains an `ovellum_check` tool,
sharing the same check implementation.
