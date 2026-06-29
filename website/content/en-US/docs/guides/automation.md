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

Add `--verbose` to any of them for config-resolution and per-stage / file-I/O
detail. It goes to **stderr**, so it composes cleanly with `--json` (stdout stays
pure JSON).

### `build --json`

```json
{
  "ok": true,
  "command": "build",
  "mode": "hybrid",
  "durationMs": 211,
  "config": "/project/ovellum.config.json",
  "warnings": [
    { "message": "did src/date.ts::a become …::b? …", "severity": "info" }
  ],
  "sources": 2,
  "written": ["docs/format.md", "docs/user.md"],
  "merged": [],
  "orphans": 0,
  "quarantined": [],
  "ir": ".ovellum/ir.json",
  "manifest": null
}
```

Each `warnings[]` entry is `{ message, severity }`, where `severity` is
`"warning"` (a real problem to act on — orphaned content, an asset skipped for
safety, an unparseable date) or `"info"` (a benign note about what the build
did — drafts excluded, `sitemap.xml` skipped because `site.baseUrl` is unset).
Branch on `severity` to fail CI only on real problems:
`summary.warnings.some(w => w.severity === "warning")`. On the terminal the
human summary counts these separately (`warnings:` vs `notes:`) and prints
`warning:`/`info:` lines with the real problems first.

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
`unsafe-scheme`, `stale-translation`, or `orphan-translation` — plus, with
[`--strict`](/docs/reference/cli/#strict-mode---strict), `positional-zone`,
`stale-anchor`, and `missing-frontmatter` (counted under `counts.strictIssues`).

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

## Programmatic API

When you'd rather drive Ovellum in-process than shell out — from a framework
dev server, a monorepo task, or your own build step — import it as a library.
`import 'ovellum'` is side-effect-free (the CLI is a separate binary), and the
functions return the same structured results the CLI computes.

```ts
import { build, watch } from 'ovellum';

// One-shot: render docs straight into a host project's served folder.
const summary = await build({ cwd: 'docs', out: '../site/public/docs', base: '/docs' });
console.log(summary.written); // ['../site/public/docs/...']

// Alongside a dev server: rebuild on change, refresh when each build finishes.
const watcher = await watch({ cwd: 'docs', onBuild: () => devServer.reload() });
// …on shutdown:
await watcher.close();
```

- **`build(options)`** → `BuildSummary`. Options: `cwd`, `configFile`, `out`,
  `base`, `drafts`, `manifest`, `onLog` (the `--verbose` stream).
- **`watch(options)`** → a handle with `close()`. Options: `cwd`, `configFile`,
  `drafts`, `onBuild`, `onError`. Set the output dir / base path in your config.
  In auto/hybrid mode rebuilds are incremental.
- **`loadConfig(options)`** → the resolved, validated config.
- **`defineConfig`** and the config / summary types are re-exported, so a
  TypeScript `ovellum.config.ts` and your build scripts share one source of truth.

The package is ESM-only (`type: module`); use a dynamic `import()` from CommonJS.

## MCP server

For agents, `ovellum mcp` runs Ovellum as a
[Model Context Protocol](https://modelcontextprotocol.io) server over stdio —
the universal AI runtime interface (Claude Code, Cursor, Windsurf, Cline, VS
Code, and more all speak it). It exposes Ovellum as **tools** (query a symbol,
diff, check, list orphans, get a page, search the docs, build, reattach an
orphan, and **write into a protected zone that survives regeneration**),
**resources** (`ovellum://llms.txt`, `ovellum://llms-full.txt`,
`ovellum://page/{path}`, `ovellum://ir`, `ovellum://orphans`), and **prompts**
(`set-up-ovellum`, `document-symbol`, `review-doc-drift`). See the
[`ovellum mcp` reference](/docs/reference/cli/#ovellum-mcp) for the full list.

### Install in your AI tool

**Claude Code** — one-step, via the bundled plugin (Skill + MCP server):

```
/plugin marketplace add oinam/ovellum
/plugin install ovellum@ovellum
```

Or register the server directly: `claude mcp add ovellum -- npx ovellum mcp`.

**Cursor / Windsurf / Cline / VS Code** — add Ovellum to the tool's MCP config
(`.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, the Cline MCP
settings, or `.vscode/mcp.json`):

```json
{
  "mcpServers": {
    "ovellum": { "command": "npx", "args": ["-y", "ovellum", "mcp"] }
  }
}
```

The server runs in your project directory, so install `ovellum` there (or pass
`--cwd`). (VS Code's `.vscode/mcp.json` uses a `"servers"` key instead of
`"mcpServers"`; the value is the same.)

Ovellum is also listed in the
[MCP Registry](https://registry.modelcontextprotocol.io) as
`io.github.oinam/ovellum`, so clients that browse the registry can discover it.

## Telling agents how to use Ovellum

Two artifacts meet agents where they look:

- **`AGENTS.md`** — `ovellum init` scaffolds an `AGENTS.md` at your project root
  (the cross-tool convention for "instructions to coding agents"). It's
  mode-aware: hybrid/auto projects lead with the protected-zone contract — what
  survives regeneration and what gets overwritten — so an agent edits in the
  right place. It's written only if one doesn't already exist.
- **A Claude Skill** — the [Claude Code plugin](#install-in-your-ai-tool) above
  bundles an `ovellum-docs` skill so Claude can scaffold, build, and safely edit
  Ovellum docs on request. To use it without the plugin, copy
  [`plugins/ovellum/skills/ovellum-docs/`](https://github.com/oinam/ovellum/tree/main/plugins/ovellum/skills/ovellum-docs)
  into your `.claude/skills/`.

## AI-friendly output

A build also emits machine-readable companions next to the HTML — `/llms.txt`,
`/llms-full.txt`, and a `.md` mirror of every page — so an agent can read your
docs without scraping HTML. These are on by default; see
[`site.ai`](/docs/reference/config/#ai).

### Per-page LLM actions

When the `.md` mirror is enabled (the default), each doc page carries a small
row of actions: **Copy page** (copies the page's Markdown to the clipboard),
**View as Markdown** (the raw `.md`), and — when `site.baseUrl` is set so the
link is absolute — **Open in ChatGPT** / **Open in Claude**, which hand the page
to that assistant. No config beyond `site.ai.mdMirror`; they disappear if it's
off.
