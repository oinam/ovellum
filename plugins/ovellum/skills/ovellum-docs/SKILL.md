---
name: ovellum-docs
description: Set up and maintain Ovellum documentation for a TypeScript or JavaScript project — scaffold, build, validate, and safely edit generated docs whose hand-written prose survives regeneration. Use when the user wants to create, build, or maintain docs with Ovellum, or asks about protected zones, orphans, llms.txt, or the ovellum CLI.
---

# Ovellum docs

Ovellum is a documentation tool for TypeScript and JavaScript: a merge engine
that lets auto-generated API docs and hand-written prose live in the same files,
plus a static-site builder for purely manual docs. Site:
<https://ovellum.oss.oinam.com>.

## Setup

- Install (local to the project, so CI and `npx` resolve the same version):
  `npm install -D ovellum`
- Scaffold: `npx ovellum init`. It writes a commented `ovellum.config.ts`, a
  starter page, an `AGENTS.md`, and `.gitignore` entries. Three modes:
  - **manual** — hand-written Markdown → static site.
  - **auto** — Markdown generated from source on every build.
  - **hybrid** — generated, then merged with hand-written zones (the default and
    the differentiator).

## The hybrid contract (the rule to respect)

Generated files are regenerated on every build. Hand-written prose survives
**only** inside a protected zone:

```markdown
<!-- @manual:start id="why" -->
Prose that survives regeneration.
<!-- @manual:end -->
```

Anything outside a zone in a generated file is overwritten. When the symbol a
zone was attached to disappears (a rename or refactor), its prose is moved to
`.ovellum/orphans/` rather than lost — review it with `ovellum orphans`, and use
`ovellum diff` to spot likely renames.

## Commands (all support `--json`; stable exit codes 0 / 1 / 3)

- `ovellum build` — parse + generate + merge, or build the site.
- `ovellum check` — validate internal links + flag unsafe URLs (exit 1 on issues).
- `ovellum diff` — preview what a rebuild would change (added/removed/changed/
  renamed symbols); `--exit-code` to gate CI.
- `ovellum orphans` — list quarantined prose (`--stale` for old ones).

## Driving Ovellum as an agent

Prefer the **MCP server** — it exposes the operations as tools, including the one
no other docs tool offers: writing prose into a protected zone that survives
regeneration.

```bash
claude mcp add ovellum -- npx ovellum mcp --cwd /path/to/project
```

Tools: `ovellum_query_symbol`, `ovellum_diff`, `ovellum_check`,
`ovellum_list_orphans`, `ovellum_get_page`, `ovellum_build`, and
`ovellum_write_zone` (write/update a `@manual` block under an anchor id;
`dryRun` to preview).

Without MCP, drive the CLI with `--json` and branch on exit codes. Full
contract, schemas, and recipes:
<https://ovellum.oss.oinam.com/docs/guides/automation/>.
