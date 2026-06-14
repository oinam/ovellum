---
'ovellum': minor
---

Add reader **Text size** and **Font** controls to the appearance panel — and
they ship in the bundled template, so every Ovellum site gets them, not just the
docs.

- **Text size** — a five-step scale (two smaller, default in the middle, two
  larger) shown as a graduated "A" ramp, like a Kindle / Safari Reader stepper.
  It scales the whole modular type scale (body + every heading) proportionally.
- **Font** — Default (system sans) / Serif / Inter / Geist. Inter and Geist are
  variable webfonts **bundled with the template** and served from
  `/assets/fonts/`; their `@font-face` rules are lazy, so a font downloads only
  when a page actually uses it. The default site stays zero-webfont and fast,
  and a custom font costs only on opt-in — no reload, no CDN, no extra config.

`site.font` now accepts `'inter'` and `'geist'` (in addition to `'sans'` /
`'serif'`) to set the initial font. Both new controls persist in `localStorage`
and apply before paint. Existing mode / theme / colour controls are unchanged.
