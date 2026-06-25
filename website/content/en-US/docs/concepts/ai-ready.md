---
title: Ovellum for AI agents
description: Your docs are llms.txt-ready out of the box, an agent can drive Ovellum as a tool, and — uniquely — an agent can edit generated docs without its prose being overwritten.
---

# Ovellum for AI agents

Documentation now has two audiences: the people who read it, and the agents that
read and increasingly _write_ it. Ovellum treats the second audience as a
first-class concern, not a plugin. Three things come for free.

## Read-ready

Every build emits machine-readable companions next to the HTML, following the
[llmstxt.org](https://llmstxt.org) convention:

- `/llms.txt` — a link-first index of every page.
- `/llms-full.txt` — the whole corpus as one Markdown stream.
- a `.md` mirror of every page, byte-for-byte the Markdown behind the HTML.

So an agent reads your docs as clean Markdown instead of scraping rendered
pages. On by default; see [`site.ai`](/docs/reference/config/#ai).

## Agent-drivable

An agent can drive Ovellum without parsing human output. `build`, `check`, and
`diff` speak [`--json`](/docs/guides/automation/) with stable exit codes, and
`ovellum mcp` runs a [Model Context Protocol](https://modelcontextprotocol.io)
server exposing the operations as tools. Setup is a copy-paste away —
a scaffolded `AGENTS.md` and a [Claude Skill](/docs/guides/automation/) tell an
agent how to use it.

## Safely editable

This is the part no other docs tool offers. Because Ovellum's
[hybrid merge engine](/docs/concepts/modes/) keeps hand-written prose inside
[protected zones](/docs/concepts/anchors-and-zones/), an agent can contribute
real prose to generated docs and have it **survive the next regeneration** —
exactly the guarantee a human editing between `@manual` markers gets. Over MCP,
that's the `ovellum_write_zone` tool.

And when a refactor moves the ground under that prose, it isn't lost:
[`ovellum diff`](/docs/reference/cli/#ovellum-diff) flags the likely rename, and
anything that can't be re-placed is quarantined to
[`.ovellum/orphans/`](/docs/concepts/orphans/) for review rather than silently
dropped.

---

Read-ready, drivable, and safely editable — the same anti-drift contract that
keeps human prose and generated docs honest, extended to agents. Start with the
[Automation & AI agents](/docs/guides/automation/) guide.
