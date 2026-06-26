# Competitive analysis — the leading commercial docs platform

A study of the category's leading **commercial, closed-source, paid** docs
platform, to decide what to adopt and what to deliberately skip. Ovellum is
**open-source and free**; the goal is to be *far better* on what matters to
developers, while leaving the SaaS-only surface as a future commercial
opportunity (post-`v1.0.0`). We never name the competitor in any public or
shipped surface — refer to it here as "the incumbent."

Captured 2026-06-26 (against `ovellum@0.17.0`). Re-survey before each major
planning cycle.

## Our edge (already ahead, or things they can't match for free)

These are the moat. Don't dilute them; lead with them.

- **The hybrid merge engine.** Generated API docs and hand-written prose in the
  *same file*, with protected zones + orphan quarantine. The incumbent is
  manual-authoring only — it has no notion of regenerating from source and
  preserving human edits. This is ours alone.
- **Agent-editable docs (the `write_zone` moat).** Our MCP server exposes
  tools + resources + prompts, and lets an agent **write prose into a protected
  zone that survives regeneration**. The incumbent's MCP is read/search only.
  Plus `llms.txt` / `llms-full.txt` / per-page `.md`, `AGENTS.md`, a Claude Code
  plugin, and a public MCP-registry listing — all in the free tool.
- **Three modes.** `auto` (generate from TS/JS source), `manual`, `hybrid`. They
  do manual only.
- **Portability / no lock-in.** `ovellum build` produces a self-contained folder;
  host it anywhere, embed it in another build, or drive it via the programmatic
  API. The incumbent locks docs to their hosting.
- **Free, OSS, local-first, CI-native.** `check` / `diff` / `--json`, stable exit
  codes, runs in any pipeline. No account, no metering.
- **i18n done properly.** 1:1 multi-locale, RTL, per-locale link + translation
  checks. Most tools (free or paid) are weaker here.

## Adopt — free, OSS-aligned (prioritized)

What's genuinely worth taking. The one real gap is **rich authoring
components**; everything else is incremental.

1. **Component blocks (the big gap).** They ship a deep component library
   (callouts, tabs, accordions, steps, cards/columns, code groups, tooltips,
   expandables, tree, badges). We have basic Markdown + media embeds. Adopt a
   curated set as **Markdown-native directives** (`remark-directive`,
   `:::note` / `:::tabs`), theme-styled — **not** React/MDX components (that's
   their lock-in; ours must stay portable Markdown). Reframes ROADMAP **B2**.
   *Highest-impact item on this list.*
2. **Mermaid diagrams.** ✅ **Done 2026-06-26** — ` ```mermaid ` → lazy-loaded
   (CDN, on diagram pages only), `site.mermaid` to self-host/disable.
3. **Reusable snippets / includes (partials).** Author-once, include-many. New.
4. **"Copy page as Markdown" + "Open in ChatGPT/Claude" affordance.** ✅ **Done
   2026-06-26** — a per-page `.ov-page-actions` row (Copy page / View as Markdown
   / Open in ChatGPT / Open in Claude), gated on the `.md` mirror being enabled.
5. **Versioning.** They have it; we have ROADMAP **B6**. Reinforce.
6. **"Switch from the incumbent" migration path.** A guide + lightweight importer
   (their config/components → ours). Direct acquisition play for people leaving a
   paid tool. Folds into ROADMAP **U2** (migration guide).
7. **Changelog / "Update" page type.** We have humanized "Edited" dates; a
   first-class changelog block/page is a small add.
8. **PDF / offline export.** Nice-to-have, OSS-friendly, low priority.

**Evaluate later (large, different axis):** **OpenAPI/AsyncAPI reference +
interactive API playground.** This is REST-API-console territory, orthogonal to
our TS/JS *symbol* docs. Valuable but a big slice; don't treat it as core to the
hybrid/AI story. Revisit if demand is real.

## Ignore for the free tool — SaaS / platform-only

These are hosting/SaaS features, not OSS-*tool* features. We skip them on
purpose — and they're exactly our future commercial surface (next section).

- Managed hosting, deployments, **preview deployments**, custom domains — we
  build a portable folder; the host deploys it.
- Browser **web editor** + branching/publishing UI.
- Built-in **analytics dashboard** + the dozens of analytics integrations — we
  cover this BYO via `site.headExtra` (inject any script: GA, Plausible, …).
- **Auth / access control / SSO / audit logs / roles.**
- Team collaboration, hosted **automations**, hosted REST / Agent APIs.
- Hosted **"Ask AI" chat widget** — we emit the raw material (`llms.txt`, MCP) so
  *any* agent can answer; running a hosted chat is a service, not a tool feature.

## Future: a commercial hosting tier (post-`v1.0.0`)

The "ignore" list is the business. After `v1.0.0`, a hosted Ovellum could offer
the SaaS layer **on top of** the free tool:

- Managed hosting + preview deploys + custom domains.
- A web editor + team collaboration.
- An analytics dashboard.
- Auth / SSO for private docs.
- A hosted **"ask your docs" AI**, powered by the `llms.txt` / MCP surface we
  already emit.

The contract that keeps us honest: **the open-source tool stays free and
complete** — it always builds the portable folder you can self-host, so there's
no lock-in. The paid layer is *hosting + collaboration + the managed AI service*,
never a feature held hostage. (Decide the exact free/paid line when we get
there; this is direction, not commitment.)

## Headline strategy

- **Win on:** hybrid merge, agent-editable docs (`write_zone`), generate-from-
  source, portability/no-lock-in, free + OSS, i18n, CI-native.
- **Reach parity on:** authoring components (the one real gap), versioning, the
  copy-for-LLM affordance.
- **Don't chase:** the SaaS platform surface — bank it for the commercial tier.
