---
'ovellum': patch
---

Add Markdown **footnotes**. Use the standard GFM convention — a `[^id]`
reference in the prose and a matching `[^id]:` definition anywhere in the file.
References render as small superscript markers that link down to a tinted
footnotes panel at the foot of the page (one type-step below body text), each
note carries a `↩` link back to where you were reading, and notes are numbered
by the order references first appear.

This also fixes a latent bug that broke every footnote jump link: `remark-rehype`
prefixes footnote id/href pairs with `user-content-` to guard against DOM
clobbering, but `rehype-sanitize`'s own `clobberPrefix` re-prefixed the `id`s a
second time (leaving the `href`s untouched), so references and back-references
pointed at anchors that no longer existed. The sanitizer now keeps the single
prefix `remark-rehype` already applied, so both ends stay in sync. The
visually-hidden "Footnotes" label is also kept out of the right-side ToC and
off the heading-anchor pass.
