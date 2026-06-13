---
'ovellum': minor
---

Allow `<video>` / `<audio>` embeds in Markdown. The HTML sanitizer now permits
`<video>`, `<audio>`, and their `<source>`/`<track>` children with
presentational/playback attributes (`controls`, `poster`, `width`, `loop`,
`muted`, `autoplay`, `playsinline`, …) — so you can embed a native media player
inline, not just link to the file. `src`/`poster` are still scheme-checked
(`http(s)`/relative) and event handlers are stripped, so an embed can't carry
script. New **"Assets & downloads"** guide documents where to put images,
video/audio, PDFs, and other downloads (co-located vs the `public/` root) and
how to reference, embed, or link them.
