# TODO (Human)

> Yes, TODO items for humans.

Items that need a person — writing prose, making product decisions, running things on real accounts, talking to other humans. Tracked here so they don't clutter the code-side checklist in [`TODO.md`](./docs/internal/TODO.md).

Legend: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked
---

- [ ] Verify the "Open in Google Gemini" deep-link (per-page doc actions)
  - ChatGPT (`chatgpt.com/?q=`) and Claude (`claude.ai/new?q=`) reliably pre-fill
    the prompt. Gemini currently uses `https://gemini.google.com/app?q=<prompt>`
    to mirror them, but Gemini's web app doesn't officially document a `?q=`
    prefill — it may just open Gemini without the prompt. Tinker later: confirm a
    working deep-link, or drop the `?q=` / the Gemini icon if there isn't one.
    Code: `renderPageActions` in `packages/site/src/template.ts`.
- [ ] Translation
  - [ ] Chinese
