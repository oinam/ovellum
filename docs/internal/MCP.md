# Model Context Protocol (MCP)

> Status: **shipped** (M1–M3 + registry, as of `ovellum@0.16.0`, 2026-06-26).
> This started as a plan (captured 2026-06-25 after the AI-Ready surfaces C1–C5 +
> the programmatic API D2); it's kept here as the design record + slice history.
> The server is live in the MCP Registry as `io.github.oinam/ovellum`.

## Where we already are

Ovellum is not starting from zero on AI. As of 0.13.0/0.14.0 we ship all three
surfaces:

- **Read** — `site.ai` emits `/llms.txt`, `/llms-full.txt`, per-page `.md`
  mirrors (C1).
- **Drive** — `ovellum mcp`, a dependency-free stdio JSON-RPC server
  (`packages/cli/src/dev/mcp/`), tools: `ovellum_query_symbol`, `ovellum_diff`,
  `ovellum_check`, `ovellum_list_orphans`, `ovellum_get_page`, `ovellum_build`,
  and the differentiator **`ovellum_write_zone`** (C2/C3). Plus `--json` on
  build/check/diff so an agent can drive the CLI without MCP.
- **Know** — a Claude Skill (`plugins/ovellum/skills/ovellum-docs/SKILL.md`),
  scaffolded `AGENTS.md` (C4), and the "Ovellum for AI agents" page (C5).

So the question isn't "Skills *or* MCP" — both exist. The next task is to make
the **MCP server a first-class citizen** (it's the universal runtime interface —
Claude, Cursor, Windsurf, Cline, VS Code all speak it) and to make adoption
**one step**. The bet leans on the one thing no other docs MCP has:
`write_zone` — an agent's prose that survives regeneration.

## The gap

Our MCP server uses only the **tools** primitive. MCP has three (tools,
**resources**, **prompts**); a tools-only server is a thin citizen. And it's
copy-paste to install. The plan closes both.

## Slices

### M1 — MCP Resources + Prompts (highest signal) — DONE 2026-06-25

> Shipped: `dev/mcp/resources.ts` + `dev/mcp/prompts.ts`, wired into
> `server.ts` with `capabilities:{tools,resources,prompts}`. Resources +
> templates + prompts all live; unknown resource URI → -32002. Hand-rolled (no
> SDK). The `notifications/resources/updated` watcher hook is still future.

Make the server a full MCP citizen. Requires extending the hand-rolled protocol
(`dev/mcp/server.ts`) with `resources/list`, `resources/read`,
`resources/templates/list`, `prompts/list`, `prompts/get`, and advertising
`capabilities: { tools, resources, prompts }` in `initialize`.

- **Resources** (readable context an agent pulls, not a tool round-trip):
  - `ovellum://llms.txt` and `ovellum://llms-full.txt` — the AI index/corpus.
  - `ovellum://page/{path}` — a page's `.md` mirror (resource template).
  - `ovellum://ir` — the persisted IR snapshot (`.ovellum/ir.json`).
  - `ovellum://orphans` — current orphan records.
  - (Later/advanced) `notifications/resources/updated` wired to the watcher so a
    client re-reads on rebuild.
- **Prompts** (curated multi-step workflows surfaced in the client UI):
  - `set-up-ovellum` — scaffold + explain the hybrid contract.
  - `document-symbol` — given a symbol, draft prose and write it into a protected
    zone (pairs `ovellum_query_symbol` → `ovellum_write_zone`, with dry-run
    preview). The moat workflow.
  - `review-doc-drift` — run `ovellum_diff`, summarize, and suggest reattaches
    for orphans.

### M2 — Distribution / one-step adoption — DONE 2026-06-25 (in-repo)

> Shipped: `plugins/ovellum/` (plugin.json + `.mcp.json` + the `ovellum-docs`
> skill, moved out of the old top-level `skills/`) + repo-root
> `.claude-plugin/marketplace.json`; cross-tool install snippets in the
> Automation guide; `mcp` in the notifier skip list. **Remaining:** the actual
> MCP-registry / connector-directory submission (external; TODO-Human).

- **Claude Code plugin** — bundle the Skill + MCP registration (plugin manifest
  / `.mcp.json`) so it's one install instead of "copy the folder + `claude mcp
  add`". Completes C4.
- **MCP registry listing** — submit to the MCP registry / connector directories;
  confirm `npx ovellum mcp` is clean headless (nothing on stdout but protocol;
  the update notifier must stay suppressed — it already self-gates on TTY/CI, but
  assert it for the `mcp` command path).
- **Cross-tool install snippets** — Cursor / Windsurf / Cline / VS Code (all MCP)
  in the Automation + "Ovellum for AI agents" docs. Emphasize tool-agnosticism.

### M3 — Round out tools + the moat — DONE 2026-06-25

> Shipped: `ovellum_search_docs` (`dev/mcp/search.ts` — in-process term-frequency
> search over the built `.md`; **not** Pagefind, whose query runtime is
> browser-only WASM) + `ovellum_reattach` (reuses `dev/orphans.ts`). **The whole
> AI-Native MCP arc (M1–M3) is now complete.**

- **`ovellum_search_docs`** — the deferred read tool: Pagefind-backed search over
  built docs (in-process query of the `dist/pagefind/` index).
- **`ovellum_reattach`** — a programmatic counterpart to `orphans --reattach`
  (the interactive CLI exists; expose reattach-to-anchor as a tool so an agent
  can rescue orphans non-interactively). Reuses `reattachOrphan` /
  `suggestReattachTarget` from `dev/orphans.ts`.

## Open decisions

1. **Hand-rolled vs SDK.** We deliberately hand-rolled the JSON-RPC server (no
   `@modelcontextprotocol/sdk` + zod) to keep the published CLI lean. Adding
   resources + prompts is more request/response handlers — still tractable
   hand-rolled. **Revisit the SDK only if** subscriptions/notifications
   (`resources/updated`) or streaming push us past simple request/response.
   Default: stay dependency-free.
2. **Resource URI scheme** — `ovellum://` (proposed). Templates for per-page.
3. **Build-on-demand** — should resources trigger a build if `dist/`/`ir.json`
   are stale, or read-only and tell the agent to `ovellum_build`? Lean: read-only
   + clear "stale, run ovellum_build" errors (matches current tool behavior).

## Suggested order

M1 (resources + prompts) → M2 (plugin + registry + cross-tool docs) → M3
(search + reattach tools). M1 is the capability upgrade; M2 is adoption; M3
rounds out. Each is its own changeset/release slice. The programmatic API (D2)
means new tools can call engines in-process — keep tools IR-backed, no shelling
out.
