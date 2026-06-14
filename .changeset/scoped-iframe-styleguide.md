---
'ovellum': minor
---

Allow scoped `<iframe>` video embeds in Markdown. Paste the embed code straight
from YouTube or Vimeo ("Share → Embed", verbatim — fixed `width`/`height`,
`frameborder`, `?si=` and all) and it just works. Ovellum permits `<iframe>`
**only** from known video hosts (`youtube.com`, `youtube-nocookie.com`,
`vimeo.com`) and strips any iframe pointing elsewhere (or at a
relative/`javascript:` src). Survivors are hardened automatically —
`loading="lazy"`, `referrerpolicy="strict-origin-when-cross-origin"`,
`allowfullscreen` — and wrapped in a responsive 16:9 frame that overrides the
snippet's pixel dimensions. Native `<video>` / `<audio>` embeds are unchanged.
The new **Styleguide** reference page
(`/docs/reference/styleguide/`) documents the type scale, vertical rhythm, and
colour system and renders every content element — headings, prose, lists,
callouts, code, tables, images, and a live video embed — as a working showcase.
