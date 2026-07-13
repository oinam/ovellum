---
'ovellum': patch
---

The topbar search input is now a full pill (`border-radius: 999px`) — deliberately rounder than every other surface so it reads as the one soft element in the chrome. The results drawer, tags, and buttons keep their regular radii; the inline Clear button goes transparent so its box never pokes past the input's curve.

Fixed the underlying cascade bug that kept theme search overrides from applying: Pagefind's base stylesheet now loads before `ovellum.css`, so the theme's `.ov-search .pagefind-ui__*` rules (which tie Pagefind's scoped rules on specificity) win on source order. This also restores the input's intended `font-weight: 500` and muted background fill, which were silently losing the same tie.

Themed the remaining Pagefind chrome to match: the inline Clear control is now a quiet mono uppercase label (the code-block language-eyebrow idiom, subtle ink darkening on hover), and matched-term `<mark>` highlights swap the browser's yellow for a translucent foreground tint that auto-adapts to dark mode. The keyboard-shortcut chip now hides whenever the input holds a query (not just while focused), so it never sits under the Clear control.
