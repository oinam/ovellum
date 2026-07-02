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

## Keeping docs fresh in CI

Because generation is deterministic and the exit codes are stable, docs
freshness is a normal CI concern — no API keys, no model in the loop,
byte-identical output. Two copy-paste recipes:

**Gate pull requests.** Fail a PR when the docs have drifted — broken links,
stale translations, stale anchors, source changes the generated docs don't
reflect, or an out-of-date agent-instruction section:

```yaml
# .github/workflows/docs-check.yml
name: Docs check
on: pull_request
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx ovellum build              # records the IR snapshot
      - run: npx ovellum diff --exit-code   # auto/hybrid: fail if source and docs disagree
      - run: npx ovellum check --strict     # links, anchors, translations
      - run: npx ovellum agents --check     # AGENTS.md/CLAUDE.md section still current
```

(Drop the `diff` step on a manual-mode site — there's no source to diff.)

**Regenerate on a schedule.** For auto/hybrid projects, let CI rebuild the
docs and open a pull request whenever the generated output changed — the
review-friendly way to keep reference docs tracking the source:

```yaml
# .github/workflows/docs-update.yml
name: Docs update
on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * 1" # Mondays 06:00 UTC
permissions:
  contents: write
  pull-requests: write
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx ovellum build
      - uses: peter-evans/create-pull-request@v7
        with:
          add-paths: docs # your configured output dir
          branch: ovellum/docs-update
          commit-message: "docs: regenerate reference docs"
          title: "docs: regenerate reference docs"
          body: Automated Ovellum rebuild — generated docs caught up with source.
```

Hybrid's protected zones are what make the scheduled rebuild safe to automate:
the build only ever changes generated content — hand-written prose in `@manual`
zones rides along untouched, and anything orphaned lands in
`.ovellum/orphans/` for review instead of disappearing into the PR.

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

Three artifacts meet agents where they look:

- **`ovellum agents`** — adds (or refreshes) a canonical **"Ovellum docs"**
  section in your top-level `AGENTS.md` / `CLAUDE.md`, telling any coding agent
  how docs work here: what's regenerated, the protected-zone contract, which
  commands to run. It's idempotent and surgical — it touches only its own
  section, writes nothing when it's already current, and `--check` turns it
  into a CI gate. See the
  [`ovellum agents` reference](/docs/reference/cli/#ovellum-agents).
- **`AGENTS.md`** — `ovellum init` scaffolds a full, mode-aware `AGENTS.md` at
  your project root (the cross-tool convention for "instructions to coding
  agents") when none exists: hybrid/auto projects lead with the protected-zone
  contract — what survives regeneration and what gets overwritten — so an agent
  edits in the right place. When one already exists, init refreshes just the
  Ovellum docs section, same as `ovellum agents`.
- **A Claude Skill** — the [Claude Code plugin](#install-in-your-ai-tool) above
  bundles an `ovellum-docs` skill so Claude can scaffold, build, and safely edit
  Ovellum docs on request. To use it without the plugin, copy
  [`plugins/ovellum/skills/ovellum-docs/`](https://github.com/oinam/ovellum/tree/main/plugins/ovellum/skills/ovellum-docs)
  into your `.claude/skills/`.

## Letting an agent write your docs

A growing pattern is having a coding agent *draft* documentation — explain an
architecture, document a symbol, write the "why". The risk is what happens
next: prose dropped into a generated file is overwritten by the next build,
and prose in a parallel wiki drifts silently as the code moves on.

Ovellum gives agent-written prose the same guarantees human prose gets:

1. **Point the agent at the [MCP server](#mcp-server).** The `document-symbol`
   prompt is the guided version of this workflow: read a symbol from the IR,
   draft prose, write it into a protected zone.
2. **The agent writes through `ovellum_write_zone`** — the prose lands inside a
   `@manual` zone under the right anchor, so the next `ovellum build` merges
   *around* it instead of over it ([hybrid mode](/docs/concepts/modes/)).
3. **Nothing is silently lost.** If the documented symbol is later renamed or
   removed, the prose is quarantined to `.ovellum/orphans/`; `ovellum orphans
   --reattach` (or the `ovellum_reattach` tool) puts it back under the new
   anchor.
4. **Drift is caught in CI.** The [freshness gate](#keeping-docs-fresh-in-ci)
   fails the build when docs and source disagree — whoever wrote them.

The result: you can accept AI-drafted docs without adopting an unmanaged,
regenerate-the-world wiki. Every draft is a reviewable PR diff, survives
regeneration, and is link-checked like everything else. (Already have an
agent-generated wiki folder? [Publish it with Ovellum](/docs/guides/migration/#from-an-agent-generated-wiki).)

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
