# Competitive analysis — OpenWiki (langchain-ai/openwiki)

A study of **OpenWiki**, LangChain's agent-run documentation CLI, to decide
what to learn from it. Unlike the incumbent studied in `COMPETITIVE.md`,
OpenWiki is **open-source (MIT)** and mostly **complementary** rather than
competitive — but it is a land-grab on the "docs for coding agents" story
that Ovellum also claims, and LangChain's brand reach makes that worth
watching.

Captured 2026-07-02 (against `ovellum@0.21.0`; OpenWiki `main`, ~235 stars,
TypeScript, `npm install -g openwiki`). Re-survey before each major planning
cycle.

## What OpenWiki is

An LLM agent that **writes a wiki about your codebase**. `openwiki --init`
runs a DeepAgents/LangGraph agent (BYO API key: OpenRouter, Anthropic,
OpenAI, Fireworks, Baseten; SQLite-checkpointed threads in `~/.openwiki/`)
against the repo and produces a small Markdown wiki in `openwiki/`:
`quickstart.md` as the mandated entrypoint plus a few section directories
(`architecture/`, `workflows/`, `operations/`, …). The prompt explicitly
targets *explanatory* content — architecture, business logic, "why the code
exists", change-oriented guidance for future agents — grounded in source
reads and git history, capped at ~8 pages on the first run.

Then it keeps the wiki fresh:

- `openwiki --update` scopes work with git evidence — a recorded `gitHead`
  in `openwiki/.last-update.json`, `git log <lastHead>..HEAD`, a "docs impact
  plan" (source change → docs affected → edit needed → why), a soft diff
  budget, and explicit no-op runs. A SHA-256 snapshot of `openwiki/` gates
  the metadata write so no-op updates don't churn CI.
- A shipped GitHub Actions example runs `openwiki --update --print` **daily
  and opens a PR** with the doc changes (`peter-evans/create-pull-request`).
- It **injects a canonical "## OpenWiki" section into the repo's top-level
  `AGENTS.md` and/or `CLAUDE.md`** (creating `AGENTS.md` if neither exists),
  telling coding agents to read the wiki first. Update runs re-check that
  section for semantic staleness and repair it in place without touching
  surrounding content.
- `openwiki` with no flags is an interactive chat over the repo/wiki.

There is **no renderer**: the output is plain Markdown in the repo. No site,
no HTML, no search, no i18n, no versioning, no API reference. The audience
is explicitly "humans and future coding agents", weighted toward agents.

## How it relates to Ovellum

Different layer of the stack. OpenWiki **writes prose content** with an LLM
(nondeterministic, costs tokens per run, needs a provider key). Ovellum is
**deterministic docs infrastructure**: parse TS/JS into an IR, merge
generated reference with human prose in protected zones, verify (`check`,
`diff`, `orphans`), and build a portable site. OpenWiki has no notion of API
reference, merge, or publishing; we have no notion of *authoring* conceptual
prose. The overlap is only in positioning: both claim "docs that stay in
sync" and "docs for AI agents".

### Our edge (unchanged by OpenWiki)

- Deterministic, reproducible, free to run — no API key, no per-run token
  bill, byte-identical output. OpenWiki's freshness loop costs money and can
  hallucinate; ours is parsed from source.
- The hybrid merge engine + `ovellum_write_zone` — the *safe substrate* for
  exactly the kind of prose OpenWiki generates.
- The whole publishing layer: site, themes, search, i18n, versioning,
  llms.txt, MCP server, RSS, OpenGraph.

### What OpenWiki has that we don't

1. **LLM-authored conceptual docs.** It writes the architecture/"why" prose
   we can't generate from TSDoc. (Deliberately out of scope for us at build
   time — keep the no-LLM-in-the-build principle. See "adopt" #1 for the
   right response.)
2. **A closed freshness loop.** Scheduled CI run → surgical doc edits → PR.
   We *detect* drift (`check --strict`, `diff`, translation staleness) but
   ship no workflow that acts on it.
3. **Agent-instruction injection.** It manages a canonical section inside
   existing `AGENTS.md`/`CLAUDE.md`, idempotently, with staleness repair.
   Our C4 scaffolds a fresh `AGENTS.md` but doesn't maintain a section in
   the user's existing files.
4. **Chat over the repo.** Out of scope for us (any MCP client already gets
   this via our server).

## Adopt — prioritized

**Status 2026-07-02: all four shipped** — #1 as the automation guide's
"Letting an agent write your docs" section, #2 as its "Keeping docs fresh in
CI" recipes, #3 as the `ovellum agents` command (+ init upsert), #4 as the
migration guide's "From an agent-generated wiki" section.

1. **"Agent-written prose, safely" — the complementarity play.** OpenWiki
   proves demand for LLM-drafted conceptual docs; what it doesn't provide
   is management of that prose — no drift verification, no publishing. Our
   `write_zone` MCP tool + orphan quarantine + `check` are exactly the
   guardrails that make agent-written prose *maintainable*. Ship a guide
   (site, concepts or guides):
   "Drafting docs with an AI agent" — point any agent (Claude Code via our
   plugin, or OpenWiki-style workflows) at the MCP server, prose lands in
   protected zones, regeneration never eats it, `check` catches drift.
   Mostly documentation + the `document-symbol` prompt we already ship.
   *Highest-impact item; pure positioning leverage.*
2. **CI freshness recipes.** Ship copy-paste GitHub Actions examples the way
   OpenWiki does (`examples/`): (a) `ovellum check --strict` on PRs as a
   docs gate; (b) a scheduled regenerate-and-PR workflow — `ovellum build`
   after dependency/source updates, open a PR when output changes. Because
   our generation is deterministic, our auto-PR loop is *safer* than theirs
   (no hallucination risk, no API key secret). Fits ROADMAP D5 (recipes).
3. **Idempotent `AGENTS.md`/`CLAUDE.md` section management.** Upgrade C4:
   instead of only scaffolding `AGENTS.md`, `ovellum init` (or a small
   `ovellum agents` step) should add/update a canonical "## Docs" section in
   existing top-level `AGENTS.md`/`CLAUDE.md` — pointing agents at the docs,
   the `.md` mirrors, and `ovellum mcp` — preserving surrounding content and
   repairing only when semantically stale. OpenWiki's exact-section protocol
   is a good spec to copy; it's our own protected-zone idea applied to the
   agent-instruction file.
4. **"Publish your agent wiki" recipe.** OpenWiki emits a Markdown folder
   and (by design) has no renderer; Ovellum renders Markdown folders. A
   short recipe — point a manual-mode config's content at `openwiki/` (or
   copy it into `content/`) and get a themed, searchable, llms.txt-emitting
   site — a natural on-ramp for OpenWiki users who want a rendered site.
   Low effort. (Naming OpenWiki in a guide is fine — it's MIT OSS and the
   relationship is complementary; the never-name rule applies to the
   commercial incumbent.)

## Skip on purpose

- **Running an LLM inside `ovellum build`.** The determinism/no-key/no-cost
  property is a headline differentiator; agents write *through* the MCP
  surface instead, where zones keep them safe.
- **Interactive chat CLI.** Any MCP client (Claude Code, Cursor, …) already
  chats with our docs through `ovellum mcp`.
- **Multi-provider LLM plumbing.** Only needed if you embed a model; we
  don't.

## Positioning read

Overlap is low as a product (different layer, no publishing story) but real
as a narrative: "the docs tool for coding agents" is adjacent to the
AI-ready positioning we've built (llms.txt, MCP, write_zone, plugin). The
answer is the guides in "adopt" #1 and #4 — make Ovellum the place where
agent-written docs become *managed, verified, published* docs, and say it
on the site where the AI-ready story already lives.

## Headline strategy

- **Win on:** deterministic generation, the merge/zone substrate for agent
  prose, verification (`check`/`diff`/`orphans`), the full publishing layer.
- **Borrow:** the closed CI freshness loop (as deterministic recipes), the
  idempotent AGENTS.md section protocol, the docs-for-agents framing.
- **Don't chase:** an in-build LLM, chat UX, provider plumbing.
