---
'ovellum': minor
---

AI-Ready output + portable deploy-anywhere build.

**AI-friendly documentation output (`site.ai`).** The manual-mode build now
emits machine-readable companions alongside the HTML so coding agents and LLMs
can read the docs cleanly, per the llmstxt.org convention:

- **`/llms.txt`** — a link-first index of every page (`- [Title](link): summary`)
  in sidebar order. On by default.
- **`/llms-full.txt`** — the whole docs corpus concatenated as one Markdown
  stream. Off by default (can be large).
- **per-page `.md` mirror** at `<page>.md` (`/guide/intro/` → `/guide/intro.md`,
  `/` → `/index.md`). On by default; `llms.txt` links point at these mirrors.

Configured via `site.ai: { enabled?, llmsTxt?, fullText?, mdMirror? }`. Drafts
and the 404 are excluded (same rule as sitemap/RSS); each locale gets its own
set on i18n sites. The HTML output is byte-identical — these are additive
files. Set `site.ai: { enabled: false }` to opt out.

**Portable, deploy-anywhere build.** `ovellum build` gains:

- `--out <dir>` — override the output directory per-invocation (point a CI /
  deploy pipeline at any folder, e.g. a repo's `/docs`).
- `--base <path>` — override `site.basePath` per-invocation.
- `--manifest` — write `<output>/.ovellum/manifest.json`, a hashed inventory of
  every built file (path, bytes, sha256) for atomic / incremental deploys and
  completeness checks.

Ovellum builds a portable static folder; the host deploys it however it likes —
no dependency on GitHub or any specific host.
