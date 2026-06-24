---
'ovellum': minor
---

Tell AI agents how to use Ovellum: scaffolded `AGENTS.md` + a Claude Skill.

- `ovellum init` now scaffolds an **`AGENTS.md`** at the project root — the
  cross-tool convention for "instructions to coding agents." It's mode-aware:
  hybrid and auto projects lead with the protected-zone contract (what survives
  regeneration, what gets overwritten, where orphans go) so an agent edits in
  the right place; manual projects lead with "edit the Markdown, never the
  output." Written only if one doesn't already exist.
- A ready-to-use **Claude Skill** ("set up and maintain Ovellum docs") ships in
  the repo at `skills/ovellum-docs/`. Copy it into `.claude/skills/` and Claude
  Code can scaffold, build, and safely edit Ovellum docs on request.

Also fixed a stale protected-zone marker in the `init` next-steps hint
(`<!-- ovellum:manual:start -->` → `<!-- @manual:start -->`).
