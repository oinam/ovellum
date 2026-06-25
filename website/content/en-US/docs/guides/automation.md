---
title: Automation & AI agents
description: Drive Ovellum from a script, a CI job, or an AI agent — machine-readable --json output, stable exit codes, and an MCP server.
---

# Automation & AI agents

Ovellum is built to be driven by something other than a human at a terminal — a
CI job, a deploy script, or an AI agent. Every command degrades cleanly when
piped, the important ones speak JSON, the exit codes are stable, and there's a
built-in [MCP server](#mcp-server) for agents. For the bigger picture — why your
docs are AI-ready out of the box — see
[Ovellum for AI agents](/docs/concepts/ai-ready/).

## Machine-readable output (`--json`)

`build`, `check`, and [`diff`](/docs/reference/cli/#ovellum-diff) take a `--json`
flag. On the JSON path there's no decorative output — stdout is a single JSON
object you can parse, and nothing is written to stderr on success.

```bash
ovellum build --json
ovellum check --json
ovellum diff --json
```

### `build --json`

```json
{
  "ok": true,
  "command": "build",
  "mode": "hybrid",
  "durationMs": 211,
  "config": "/project/ovellum.config.json",
  "warnings": [],
  "sources": 2,
  "written": ["docs/format.md", "docs/user.md"],
  "merged": [],
  "orphans": 0,
  "quarantined": [],
  "ir": ".ovellum/ir.json",
  "manifest": null
}
```

In `manual` mode the auto/hybrid fields are replaced by `output`, `pages`
(`[{ url, outputPath }]`), and `landingRendered`.

### `check --json`

```json
{
  "ok": false,
  "command": "check",
  "mode": "manual",
  "durationMs": 9,
  "config": "/project/ovellum.config.json",
  "pages": 42,
  "counts": { "brokenLinks": 1, "unsafeSchemes": 0 },
  "issues": [
    { "file": "content/index.md", "line": 3, "kind": "broken-link", "message": "..." }
  ]
}
```

`counts.staleTranslations` appears only on [i18n](/docs/guides/i18n/) sites
(two or more `site.locales`). `issue.kind` is one of `broken-link`,
`unsafe-scheme`, `stale-translation`, or `orphan-translation`.

## Exit codes

Stable across commands, so a script can branch without scraping output:

| Code | Meaning                                                                 |
| ---- | ---------------------------------------------------------------------- |
| `0`  | Success — build done, or `check` / `diff` found nothing.                |
| `1`  | Issues found (`check` broken links, `diff --exit-code` changes) or a build error. |
| `3`  | `ConfigError` — config invalid or not found. In `--json` mode the error is on stdout as `{ "ok": false, "error", "hint" }`. |

`diff` exits `0` even with changes unless you pass `--exit-code` (git-diff
convention) — handy for a "fail CI if docs drift from source" gate:

```bash
ovellum build            # record the baseline IR snapshot
ovellum diff --exit-code # exit 1 if the current source no longer matches
```

## MCP server

For agents, `ovellum mcp` runs Ovellum as a
[Model Context Protocol](https://modelcontextprotocol.io) server over stdio. It
exposes the same operations as tools — query a symbol, diff, check, list
orphans, get a page, build, and **write into a protected zone that survives
regeneration**. See the [`ovellum mcp` reference](/docs/reference/cli/#ovellum-mcp)
for the full tool list.

```bash
claude mcp add ovellum -- npx ovellum mcp --cwd /path/to/project
```

## Telling agents how to use Ovellum

Two artifacts meet agents where they look:

- **`AGENTS.md`** — `ovellum init` scaffolds an `AGENTS.md` at your project root
  (the cross-tool convention for "instructions to coding agents"). It's
  mode-aware: hybrid/auto projects lead with the protected-zone contract — what
  survives regeneration and what gets overwritten — so an agent edits in the
  right place. It's written only if one doesn't already exist.
- **A Claude Skill** — a ready-to-use `SKILL.md` ("set up and maintain Ovellum
  docs") lives in the repo at
  [`skills/ovellum-docs/`](https://github.com/oinam/ovellum/tree/main/skills/ovellum-docs).
  Copy that folder into your project's `.claude/skills/` (or `~/.claude/skills/`)
  and Claude Code can scaffold, build, and safely edit Ovellum docs on request.

## AI-friendly output

A build also emits machine-readable companions next to the HTML — `/llms.txt`,
`/llms-full.txt`, and a `.md` mirror of every page — so an agent can read your
docs without scraping HTML. These are on by default; see
[`site.ai`](/docs/reference/config/#ai).
