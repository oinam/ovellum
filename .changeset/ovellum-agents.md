---
'ovellum': minor
---

`ovellum agents` — keep coding agents briefed on how your docs work. The
command adds (or refreshes) a canonical **"Ovellum docs" section** in your
top-level `AGENTS.md` / `CLAUDE.md`: which directory is regenerated, the
protected-zone contract, which commands to run, and where the MCP server is —
rendered from your config so it stays truthful. Idempotent and surgical: it
touches only its own section, preserves everything around it, and writes
nothing when already current. `--check` turns it into a CI gate (exit 1 when
the section is missing or stale). `ovellum init` now performs the same upsert
when an `AGENTS.md` already exists instead of skipping it.

Also new in the docs: CI freshness recipes (a PR gate with
`diff --exit-code` + `check --strict` + `agents --check`, and a scheduled
regenerate-and-PR workflow), a guide to letting AI agents draft docs safely
through `ovellum_write_zone`, and a migration recipe for publishing
agent-generated wikis (OpenWiki-style Markdown folders) with manual mode.
