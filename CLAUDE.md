# CLAUDE

Ovellum is an open-source documentation tool for TypeScript and JavaScript: a
merge engine that lets auto-generated API docs and hand-written prose live in
the same files, plus a Jekyll-style static-site builder for purely manual docs.
TypeScript monorepo, pnpm + turbo. Published package: `ovellum` (**0.12.0**,
live on npm). Site: <https://ovellum.oss.oinam.com>.

## Your role

You are the maintainer's engineering partner here — implement features, fix
bugs, keep the docs and the site honest. Default to acting, then reporting;
ask only when a decision is genuinely the maintainer's to make.

## How this repo is laid out

- `packages/*` — `core` (types, config schema, IR), `parser`, `generator`,
  `merger`, `reader`, `site` (the static-site builder), and `cli` (`ovellum`,
  the published package and version source of truth).
- `website/` — the Ovellum site itself. Config is `website/ovellum.config.ts`
  (TypeScript, so snippets paste in unescaped). Content in `website/content/`.
- `website/content/docs/**` — the **canonical, user-facing docs** (CLI, config,
  glossary, security, guides, concepts). When a feature changes behaviour,
  update these.
- `docs/internal/**` — maintainer-only docs. `TODO.md` is the onboarding
  entry point: read its "Current state" block first. Keepers: `DESIGN.md`,
  `SITE.md`, `STYLES.md`, `DEPLOY.md` (this repo's own CI wiring), `FEATURES.md`,
  `ROADMAP.md` (the prioritized 10x plan — features/security/usability; pick
  next work from here), `RELEASE.md` (the npm publish runbook — run top to
  bottom when shipping), `TODO.md`, `TODO-Human.md`. CLI/config/glossary/security
  now live on the site.

## Commands

- Build the site (and its package deps): `npm run build:website`
- Dev the site: `npm run dev:website`
- Tests: `npm test` (turbo, per-package vitest)
- Real CLI commands: `init`, `build`, `dev`, `watch`, `serve`, `check`.
  (`orphans` and `clean` are NOT implemented — don't reference them as shipping.)
- Orphan archive lives at `.ovellum/orphans/` (never `.docsmith` — that's a dead
  former name).

## Working agreements

- **Develop in place on `main`** — no git worktrees. If a session starts in one,
  migrate back and remove it.
- **README.md is human-owned.** Don't edit it unless explicitly asked this turn.
- **No Claude / Co-Authored-By attribution** in commit messages or PR bodies.
- **Commit at feature boundaries** — offer a commit after each meaningful slice;
  don't accumulate silently.
- **Docs update in the same commit as the feature** — site docs + `FEATURES.md`,
  never queued as a follow-up.
- **No emojis or image icons.** Monochrome by default; inline monochrome SVG
  (using `currentColor`) only when an icon is genuinely needed.
- **Design is editorial-calm** — reject chrome, cartoon, bloat, template rhythm.
  Touchstones and locked primitives are in `SITE.md` / `STYLES.md`.
- **Releases publish locally** — `npm publish` from `packages/cli/`. CI
  auto-publish is parked.
- **Preserve `-original` copies** of any asset before transforming it.
- When the maintainer signals wrap-up, sweep `TODO.md` "Current state" and note
  new gotchas before they walk away.

## Private notes

Keep evolving private context between you and the maintainer in `CLAUDE.local.md`
(gitignored). It is not committed; use it freely for candid working notes.
