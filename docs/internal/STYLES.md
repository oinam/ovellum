# O'Vellum - Style System

Design tokens and rendering conventions for any UI surface O'Vellum produces or ships - the CLI output's color blocks, the eventual self-hosted docs site, and any future renderer. Every value lives in CSS custom properties so themes swap without rebuilds.

This document is the single source of truth for color, type, spacing, and rhythm. If a value isn't here, it shouldn't be in the codebase as a literal.

---

## 1. Principles

1. **Tokens over literals.** Components reference `var(--…)`; never raw hex, px, or rem.
2. **OKLCH for every color.** Perceptually uniform lightness ramps. No more "why does my 500 look brighter than my 400."
3. **System fonts, no webfonts.** Documentation should render instantly on first paint. Webfonts add a network hop and a FOIT/FOUT window we don't need.
4. **Fluid by default.** Type and space scale linearly between a min viewport (320px) and a max viewport (1240px) via `clamp()`. No breakpoints for sizing.
5. **Auto / Light / Dark.** `prefers-color-scheme` is the default; users can override per session via `data-theme`.
6. **Tailwind-style naming.** 50-950 scales, `--color-{name}-{step}`. Borrow the philosophy; don't take the dependency.

---

## 2. Variable Architecture

Three tiers, in order of specificity:

```
┌──────────────────────────────────────────────────────────┐
│  Tier 1 - Palette                                         │
│  --color-{name}-{50…950}                                  │
│  Raw OKLCH values. Theme-agnostic. Never used directly    │
│  in components.                                           │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Tier 2 - Semantic                                        │
│  --color-fg, --color-bg, --color-accent, --color-border…  │
│  Maps palette entries to roles. Swapped per theme.        │
│  Components reference these.                              │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Tier 3 - Component                                       │
│  --callout-info-bg, --code-comment-fg…                    │
│  Local overrides scoped to a component. Default to        │
│  semantic tokens. Theme can override one component        │
│  without touching the rest.                               │
└──────────────────────────────────────────────────────────┘
```

A component should reference Tier 2 unless it has truly bespoke needs. A theme should redefine Tier 2 and _only_ touch Tier 3 for special-cased components.

---

## 3. Typography

### 3.1 Font stacks

System-first. No `@font-face`. No webfont URLs.

```css
:root {
  --font-sans:
    ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';

  --font-serif: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif;

  --font-mono:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
```

Body and headings: `--font-sans`. Code blocks, inline code, anchor IDs in the merger UI: `--font-mono`. Serif is exposed for future long-form essays but unused by default.

### 3.2 Type scale

Source: [utopia.fyi/type/calculator](https://utopia.fyi/type/calculator/).

| Config         | Min (320px)        | Max (1240px)           |
| -------------- | ------------------ | ---------------------- |
| Base font size | 16px               | 19px                   |
| Modular scale  | 1.25 (major third) | 1.333 (perfect fourth) |

Eight steps from `-2` (fine print) to `5` (display).

| Step | 320px | 1240px | Typical use                     |
| ---- | ----- | ------ | ------------------------------- |
| `-2` | 10.24 | 10.69  | Footnotes, legal small print    |
| `-1` | 12.80 | 14.25  | Captions, table cells, metadata |
| `0`  | 16.00 | 19.00  | Body                            |
| `1`  | 20.00 | 25.33  | Lead paragraphs, `<h4>`         |
| `2`  | 25.00 | 33.76  | `<h3>`                          |
| `3`  | 31.25 | 45.00  | `<h2>`                          |
| `4`  | 39.06 | 60.00  | `<h1>`                          |
| `5`  | 48.83 | 79.95  | Display (hero, 404 page)        |

```css
:root {
  --font-size--2: clamp(0.64rem, 0.6302rem + 0.0489vw, 0.6681rem);
  --font-size--1: clamp(0.8rem, 0.7685rem + 0.1576vw, 0.8906rem);
  --font-size-0: clamp(1rem, 0.9348rem + 0.3261vw, 1.1875rem);
  --font-size-1: clamp(1.25rem, 1.1341rem + 0.5793vw, 1.5831rem);
  --font-size-2: clamp(1.5625rem, 1.3721rem + 0.9522vw, 2.11rem);
  --font-size-3: clamp(1.9531rem, 1.6542rem + 1.4946vw, 2.8125rem);
  --font-size-4: clamp(2.4413rem, 1.9861rem + 2.276vw, 3.75rem);
  --font-size-5: clamp(3.0519rem, 2.3754rem + 3.3826vw, 4.9969rem);
}
```

### 3.3 Heading map

```css
:root {
  --font-h1: var(--font-size-4);
  --font-h2: var(--font-size-3);
  --font-h3: var(--font-size-2);
  --font-h4: var(--font-size-1);
  --font-h5: var(--font-size-0);
  --font-h6: var(--font-size--1);
}
```

### 3.4 Line heights

```css
:root {
  --leading-tight: 1.15; /* Display headings */
  --leading-snug: 1.25; /* Subheadings, h4-h6 */
  --leading-normal: 1.5; /* Body */
  --leading-relaxed: 1.65; /* Long-form prose */
  --leading-mono: 1.55; /* Code blocks */
}
```

Body line-height stays at **1.5**. Anything tighter hurts readability in dense docs; anything looser fights the vertical rhythm grid (§5).

### 3.5 Letter spacing

```css
:root {
  --tracking-tighter: -0.025em; /* h1-h2 */
  --tracking-tight: -0.015em; /* h3-h4 */
  --tracking-normal: 0;
  --tracking-wide: 0.025em; /* All-caps labels */
  --tracking-widest: 0.1em; /* Eyebrows */
}
```

### 3.6 Weights

```css
:root {
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

System fonts on Apple devices render medium/semibold cleanly; on Windows/Linux some stacks alias them. If a target weight is missing, the browser falls back, so don't depend on weights between the four above.

---

## 4. Spacing

Source: [utopia.fyi/space/calculator](https://utopia.fyi/space/calculator).

Same viewport range (320px → 1240px), same base step (16px → 19px). Multiplier rules give a 1.5× progression at small steps and 2× at the top, matching Utopia's defaults.

### 4.1 Static scale

| Token         | 320px | 1240px |
| ------------- | ----- | ------ |
| `--space-3xs` | 4     | 4.75   |
| `--space-2xs` | 8     | 9.5    |
| `--space-xs`  | 12    | 14.25  |
| `--space-s`   | 16    | 19     |
| `--space-m`   | 24    | 28.5   |
| `--space-l`   | 32    | 38     |
| `--space-xl`  | 48    | 57     |
| `--space-2xl` | 64    | 76     |
| `--space-3xl` | 96    | 114    |

```css
:root {
  --space-3xs: clamp(0.25rem, 0.2337rem + 0.0815vw, 0.2969rem);
  --space-2xs: clamp(0.5rem, 0.4674rem + 0.1631vw, 0.5938rem);
  --space-xs: clamp(0.75rem, 0.7011rem + 0.2445vw, 0.8906rem);
  --space-s: clamp(1rem, 0.9348rem + 0.3261vw, 1.1875rem);
  --space-m: clamp(1.5rem, 1.4022rem + 0.4892vw, 1.7813rem);
  --space-l: clamp(2rem, 1.8696rem + 0.6522vw, 2.375rem);
  --space-xl: clamp(3rem, 2.8043rem + 0.9783vw, 3.5625rem);
  --space-2xl: clamp(4rem, 3.7391rem + 1.3043vw, 4.75rem);
  --space-3xl: clamp(6rem, 5.6087rem + 1.9565vw, 7.125rem);
}
```

### 4.2 Fluid pairs

For situations where a space should _grow more aggressively_ as the viewport widens - e.g. section gaps that hug at mobile, breathe at desktop. Min = the smaller step's min, max = the larger step's max.

```css
:root {
  --space-3xs-2xs: clamp(0.25rem, 0.1304rem + 0.5979vw, 0.5938rem);
  --space-2xs-xs: clamp(0.5rem, 0.3641rem + 0.6794vw, 0.8906rem);
  --space-xs-s: clamp(0.75rem, 0.5978rem + 0.7609vw, 1.1875rem);
  --space-s-m: clamp(1rem, 0.7282rem + 1.3588vw, 1.7813rem);
  --space-m-l: clamp(1.5rem, 1.1957rem + 1.5217vw, 2.375rem);
  --space-l-xl: clamp(2rem, 1.4565rem + 2.7174vw, 3.5625rem);
  --space-xl-2xl: clamp(3rem, 2.3913rem + 3.0435vw, 4.75rem);
  --space-2xl-3xl: clamp(4rem, 2.913rem + 5.4348vw, 7.125rem);
}
```

### 4.3 Usage rules

- **Padding, gap, margin between blocks:** Tier 1 static (`--space-*`).
- **Section separators, hero padding:** fluid pair (`--space-*-*`).
- **Inline rhythm (between adjacent inline-block bits):** `--space-3xs` or `--space-2xs`.
- **Never** use raw px or rem for layout spacing.

---

## 5. Vertical rhythm

Strict pixel-perfect baselines are a losing battle with fluid type. Instead we hold to a **soft 4px sub-grid**: every static space token is a multiple of 4 at min viewport, and headings + body collapse onto a `--leading-normal: 1.5` rhythm at the base step.

| Step | font-size @ 320px | line-height | line box @ 320px | multiple of 4 |
| ---- | ----------------- | ----------- | ---------------- | ------------- |
| 0    | 16                | 1.5         | 24               | yes           |
| 1    | 20                | 1.4         | 28               | yes           |
| 2    | 25                | 1.32        | 33               | no (≈4×)      |
| 3    | 31.25             | 1.28        | 40               | yes           |
| 4    | 39.06             | 1.18        | 46               | ≈             |
| 5    | 48.83             | 1.15        | 56               | yes           |

In practice: trust `--leading-*` to keep headings looking right; use `--space-*` for the vertical gaps between blocks; don't try to align every glyph baseline. Pragmatic > pixel-perfect.

### 5.1 Block spacing defaults

```css
:root {
  --rhythm-paragraph: var(--space-s);
  --rhythm-heading-top: var(--space-l); /* Above h1-h2 */
  --rhythm-heading-mid: var(--space-m); /* Above h3 */
  --rhythm-heading-low: var(--space-s); /* Above h4-h6 */
  --rhythm-section: var(--space-xl-2xl);
}
```

```css
.prose > * + * {
  margin-block-start: var(--rhythm-paragraph);
}
.prose h1,
.prose h2 {
  margin-block-start: var(--rhythm-heading-top);
}
.prose h3 {
  margin-block-start: var(--rhythm-heading-mid);
}
.prose h4,
.prose h5,
.prose h6 {
  margin-block-start: var(--rhythm-heading-low);
}
.prose section + section {
  margin-block-start: var(--rhythm-section);
}
```

---

## 6. Color system

### 6.1 Why OKLCH

`oklch(L C H)` is perceptually uniform: a step of 5% in L looks like an equal step to the eye whether you're in a yellow or a purple. RGB and HSL break that promise.

- **L (lightness):** 0% → 100%. Body text dark mode usually ≥ 70%; backgrounds < 25%.
- **C (chroma):** 0 → ~0.4. Neutrals stay below 0.05; vibrant accents 0.15-0.3.
- **H (hue):** 0-360°. Stable across L/C variations within a palette.

Modern Safari, Chrome, Firefox all support OKLCH. No fallback is provided - if the browser doesn't know `oklch()`, the user has bigger problems than our color palette.

### 6.2 Tier 1 - Palette

Four neutrals and eight accents. Each is a 50-950 ramp. Values are inspired by Tailwind v4's OKLCH palette but locally maintained - tweak freely.

#### Neutrals

```css
:root {
  /* slate — cool neutral */
  --color-slate-50: oklch(98.4% 0.003 247.86);
  --color-slate-100: oklch(96.8% 0.007 247.9);
  --color-slate-200: oklch(92.9% 0.013 247.95);
  --color-slate-300: oklch(86.9% 0.022 252.89);
  --color-slate-400: oklch(70.4% 0.04 256.79);
  --color-slate-500: oklch(55.4% 0.046 257.42);
  --color-slate-600: oklch(44.6% 0.043 257.28);
  --color-slate-700: oklch(37.2% 0.044 257.29);
  --color-slate-800: oklch(27.9% 0.041 260.03);
  --color-slate-900: oklch(20.8% 0.042 265.75);
  --color-slate-950: oklch(12.9% 0.042 264.69);

  /* gray — true neutral */
  --color-gray-50: oklch(98.5% 0.002 247.84);
  --color-gray-100: oklch(96.7% 0.003 264.54);
  --color-gray-200: oklch(92.8% 0.006 264.53);
  --color-gray-300: oklch(87.2% 0.01 258.34);
  --color-gray-400: oklch(70.7% 0.022 261.32);
  --color-gray-500: oklch(55.1% 0.027 264.36);
  --color-gray-600: oklch(44.6% 0.03 256.8);
  --color-gray-700: oklch(37.3% 0.034 259.73);
  --color-gray-800: oklch(27.8% 0.033 256.85);
  --color-gray-900: oklch(21% 0.034 264.66);
  --color-gray-950: oklch(13% 0.028 261.69);

  /* zinc — slight warmth */
  --color-zinc-50: oklch(98.5% 0.001 286.38);
  --color-zinc-100: oklch(96.7% 0.001 286.38);
  --color-zinc-200: oklch(92% 0.004 286.32);
  --color-zinc-300: oklch(87.1% 0.006 286.29);
  --color-zinc-400: oklch(70.5% 0.015 286.07);
  --color-zinc-500: oklch(55.2% 0.016 285.94);
  --color-zinc-600: oklch(44.2% 0.017 285.79);
  --color-zinc-700: oklch(37% 0.013 285.81);
  --color-zinc-800: oklch(27.4% 0.006 286.03);
  --color-zinc-900: oklch(21% 0.006 285.89);
  --color-zinc-950: oklch(14.1% 0.005 285.82);

  /* stone — warm neutral */
  --color-stone-50: oklch(98.5% 0.001 106.42);
  --color-stone-100: oklch(97% 0.001 106.42);
  --color-stone-200: oklch(92.3% 0.003 48.72);
  --color-stone-300: oklch(86.9% 0.005 56.36);
  --color-stone-400: oklch(70.9% 0.01 56.26);
  --color-stone-500: oklch(55.3% 0.013 58.07);
  --color-stone-600: oklch(44.4% 0.011 73.64);
  --color-stone-700: oklch(37.4% 0.01 67.56);
  --color-stone-800: oklch(26.8% 0.007 34.3);
  --color-stone-900: oklch(21.6% 0.006 56.04);
  --color-stone-950: oklch(14.7% 0.004 49.25);
}
```

#### Accents

```css
:root {
  /* red */
  --color-red-50: oklch(97.1% 0.013 17.38);
  --color-red-100: oklch(93.6% 0.032 17.72);
  --color-red-200: oklch(88.5% 0.062 18.33);
  --color-red-300: oklch(80.8% 0.114 19.57);
  --color-red-400: oklch(70.4% 0.191 22.22);
  --color-red-500: oklch(63.7% 0.237 25.33);
  --color-red-600: oklch(57.7% 0.245 27.32);
  --color-red-700: oklch(50.5% 0.213 27.52);
  --color-red-800: oklch(44.4% 0.177 26.9);
  --color-red-900: oklch(39.6% 0.141 25.72);
  --color-red-950: oklch(25.8% 0.092 26.05);

  /* orange */
  --color-orange-50: oklch(98% 0.016 73.68);
  --color-orange-100: oklch(95.4% 0.038 75.16);
  --color-orange-200: oklch(90.1% 0.076 70.7);
  --color-orange-300: oklch(83.7% 0.128 66.29);
  --color-orange-400: oklch(75% 0.183 55.93);
  --color-orange-500: oklch(70.5% 0.213 47.6);
  --color-orange-600: oklch(64.6% 0.222 41.12);
  --color-orange-700: oklch(55.3% 0.195 38.4);
  --color-orange-800: oklch(47% 0.157 37.3);
  --color-orange-900: oklch(40.8% 0.123 38.18);
  --color-orange-950: oklch(26.6% 0.079 36.26);

  /* amber */
  --color-amber-50: oklch(98.7% 0.022 95.28);
  --color-amber-100: oklch(96.2% 0.059 95.62);
  --color-amber-200: oklch(92.4% 0.12 95.75);
  --color-amber-300: oklch(87.9% 0.169 91.61);
  --color-amber-400: oklch(82.8% 0.189 84.4);
  --color-amber-500: oklch(76.9% 0.188 70.08);
  --color-amber-600: oklch(66.6% 0.179 58.32);
  --color-amber-700: oklch(55.5% 0.163 48.99);
  --color-amber-800: oklch(47.3% 0.137 46.2);
  --color-amber-900: oklch(41.4% 0.112 45.9);
  --color-amber-950: oklch(27.9% 0.077 45.64);

  /* green */
  --color-green-50: oklch(98.2% 0.018 155.83);
  --color-green-100: oklch(96.2% 0.044 156.74);
  --color-green-200: oklch(92.5% 0.084 155.99);
  --color-green-300: oklch(87.1% 0.15 154.45);
  --color-green-400: oklch(79.2% 0.209 151.71);
  --color-green-500: oklch(72.3% 0.219 149.58);
  --color-green-600: oklch(62.7% 0.194 149.21);
  --color-green-700: oklch(52.7% 0.154 150.07);
  --color-green-800: oklch(44.8% 0.119 151.32);
  --color-green-900: oklch(39.3% 0.095 152.54);
  --color-green-950: oklch(26.6% 0.065 152.93);

  /* teal */
  --color-teal-50: oklch(98.4% 0.014 180.72);
  --color-teal-100: oklch(95.3% 0.051 180.8);
  --color-teal-200: oklch(91% 0.096 180.43);
  --color-teal-300: oklch(85.5% 0.138 181.07);
  --color-teal-400: oklch(77.7% 0.152 181.91);
  --color-teal-500: oklch(70.4% 0.14 182.5);
  --color-teal-600: oklch(60% 0.118 184.7);
  --color-teal-700: oklch(51.1% 0.096 186.39);
  --color-teal-800: oklch(43.7% 0.078 188.22);
  --color-teal-900: oklch(38.6% 0.063 188.42);
  --color-teal-950: oklch(27.7% 0.046 192.52);

  /* blue */
  --color-blue-50: oklch(97% 0.014 254.6);
  --color-blue-100: oklch(93.2% 0.032 255.59);
  --color-blue-200: oklch(88.2% 0.059 254.16);
  --color-blue-300: oklch(80.9% 0.105 251.81);
  --color-blue-400: oklch(70.7% 0.165 254.62);
  --color-blue-500: oklch(62.3% 0.214 259.81);
  --color-blue-600: oklch(54.6% 0.245 262.88);
  --color-blue-700: oklch(48.8% 0.243 264.38);
  --color-blue-800: oklch(42.4% 0.199 265.64);
  --color-blue-900: oklch(37.9% 0.146 265.52);
  --color-blue-950: oklch(28.2% 0.091 267.94);

  /* violet */
  --color-violet-50: oklch(96.9% 0.016 293.76);
  --color-violet-100: oklch(94.3% 0.029 294.59);
  --color-violet-200: oklch(89.4% 0.057 293.28);
  --color-violet-300: oklch(81.1% 0.111 293.57);
  --color-violet-400: oklch(70.2% 0.183 293.54);
  --color-violet-500: oklch(60.6% 0.25 292.71);
  --color-violet-600: oklch(54.1% 0.281 293.01);
  --color-violet-700: oklch(49.1% 0.27 292.58);
  --color-violet-800: oklch(43.2% 0.232 292.76);
  --color-violet-900: oklch(38% 0.189 293.74);
  --color-violet-950: oklch(28.3% 0.141 291.09);

  /* pink */
  --color-pink-50: oklch(97.1% 0.014 343.2);
  --color-pink-100: oklch(94.8% 0.028 342.26);
  --color-pink-200: oklch(89.9% 0.061 343.23);
  --color-pink-300: oklch(82.3% 0.12 346.02);
  --color-pink-400: oklch(71.8% 0.202 349.76);
  --color-pink-500: oklch(65.6% 0.241 354.31);
  --color-pink-600: oklch(59.2% 0.249 0.58);
  --color-pink-700: oklch(52.5% 0.223 3.96);
  --color-pink-800: oklch(45.9% 0.187 3.82);
  --color-pink-900: oklch(40.8% 0.153 2.43);
  --color-pink-950: oklch(28.4% 0.109 3.91);
}
```

#### Pure black / white

Not in the palette. Use `--color-zinc-950` and `--color-zinc-50` instead - true #000 vibrates against true #fff in a way nothing organic does.

### 6.3 Tier 2 - Semantic tokens

These are what components consume. Every theme redefines this set.

```css
:root {
  /* Surfaces */
  --color-bg: <neutral-50>; /* Page background */
  --color-bg-subtle: <neutral-100>; /* Card, sidebar */
  --color-bg-muted: <neutral-200>; /* Inputs, code blocks */
  --color-bg-inverse: <neutral-900>; /* Tooltips, inverted callouts */

  /* Foregrounds */
  --color-fg: <neutral-900>; /* Body text */
  --color-fg-muted: <neutral-700>; /* Secondary text */
  --color-fg-subtle: <neutral-500>; /* Tertiary, hints, placeholders */
  --color-fg-inverse: <neutral-50>; /* On --color-bg-inverse */

  /* Borders */
  --color-border: <neutral-200>;
  --color-border-strong: <neutral-300>;
  --color-border-focus: <accent-500>;

  /* Accent (primary brand-ish role) */
  --color-accent: <accent-600>;
  --color-accent-hover: <accent-700>;
  --color-accent-bg: <accent-50>;
  --color-accent-fg: <accent-700>;

  /* Status */
  --color-info-bg: <blue-50>;
  --color-info-fg: <blue-700>;
  --color-success-bg: <green-50>;
  --color-success-fg: <green-700>;
  --color-warning-bg: <amber-50>;
  --color-warning-fg: <amber-800>;
  --color-danger-bg: <red-50>;
  --color-danger-fg: <red-700>;

  /* Links */
  --color-link: var(--color-accent);
  --color-link-hover: var(--color-accent-hover);
  --color-link-visited: <violet-700>;

  /* Code (syntax) */
  --color-code-bg: var(--color-bg-muted);
  --color-code-fg: var(--color-fg);
  --color-code-comment: <neutral-500>;
  --color-code-keyword: <violet-600>;
  --color-code-string: <green-700>;
  --color-code-number: <orange-700>;
  --color-code-function: <blue-600>;
  --color-code-variable: <pink-700>;
  --color-code-type: <teal-700>;

  /* Selection */
  --color-selection-bg: <accent-200>;
  --color-selection-fg: <accent-900>;
}
```

The angle brackets above are placeholders. Real assignments live in §7 (themes).

### 6.4 Tier 3 - Component tokens

Define only when a component needs to deviate. Default each to a Tier 2 token:

```css
:root {
  /* O'Vellum-specific */
  --ovellum-anchor-bg: var(--color-info-bg);
  --ovellum-anchor-fg: var(--color-info-fg);
  --ovellum-orphan-bg: var(--color-warning-bg);
  --ovellum-orphan-fg: var(--color-warning-fg);
  --ovellum-manual-bg: var(--color-success-bg);
  --ovellum-manual-fg: var(--color-success-fg);
}
```

---

## 7. Themes

Theme switching uses `[data-theme]` on `<html>`. The system theme (`Auto`) is the default and follows `prefers-color-scheme`.

### 7.1 Switching strategy

```css
/* Default: follow OS, but emit both light + dark token sets. */
:root,
[data-theme='default-light'] {
  /* Light tokens (see §7.2) */
}

@media (prefers-color-scheme: dark) {
  :root {
    /* Dark tokens (see §7.3) */
  }
}

[data-theme='default-dark'] {
  /* Dark tokens — manual override wins over media query. */
}
```

Pattern for each named theme: emit `[data-theme='nord']` (single set) or `[data-theme='solarized-light']` / `[data-theme='solarized-dark']` (paired).

JS toggle (vanilla, ~10 lines):

```js
function setTheme(name) {
  document.documentElement.dataset.theme = name;
  localStorage.setItem('ovellum-theme', name);
}

const stored = localStorage.getItem('ovellum-theme');
if (stored) document.documentElement.dataset.theme = stored;
```

Run that script _before_ paint to avoid a theme-flash.

### 7.2 Default (light)

Built on `zinc` + `blue` accent. Calm, doc-friendly. The reference theme other themes should be diffed against.

```css
:root,
[data-theme='default-light'] {
  --color-bg: var(--color-zinc-50);
  --color-bg-subtle: var(--color-zinc-100);
  --color-bg-muted: var(--color-zinc-200);
  --color-bg-inverse: var(--color-zinc-900);

  --color-fg: var(--color-zinc-900);
  --color-fg-muted: var(--color-zinc-700);
  --color-fg-subtle: var(--color-zinc-500);
  --color-fg-inverse: var(--color-zinc-50);

  --color-border: var(--color-zinc-200);
  --color-border-strong: var(--color-zinc-300);
  --color-border-focus: var(--color-blue-500);

  --color-accent: var(--color-blue-600);
  --color-accent-hover: var(--color-blue-700);
  --color-accent-bg: var(--color-blue-50);
  --color-accent-fg: var(--color-blue-700);

  --color-info-bg: var(--color-blue-50);
  --color-info-fg: var(--color-blue-700);
  --color-success-bg: var(--color-green-50);
  --color-success-fg: var(--color-green-700);
  --color-warning-bg: var(--color-amber-50);
  --color-warning-fg: var(--color-amber-800);
  --color-danger-bg: var(--color-red-50);
  --color-danger-fg: var(--color-red-700);

  --color-link: var(--color-blue-600);
  --color-link-hover: var(--color-blue-700);
  --color-link-visited: var(--color-violet-700);

  --color-code-bg: var(--color-zinc-100);
  --color-code-fg: var(--color-zinc-900);
  --color-code-comment: var(--color-zinc-500);
  --color-code-keyword: var(--color-violet-600);
  --color-code-string: var(--color-green-700);
  --color-code-number: var(--color-orange-700);
  --color-code-function: var(--color-blue-600);
  --color-code-variable: var(--color-pink-700);
  --color-code-type: var(--color-teal-700);

  --color-selection-bg: var(--color-blue-200);
  --color-selection-fg: var(--color-blue-900);
}
```

### 7.3 Default (dark)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: var(--color-zinc-950);
    --color-bg-subtle: var(--color-zinc-900);
    --color-bg-muted: var(--color-zinc-800);
    --color-bg-inverse: var(--color-zinc-100);

    --color-fg: var(--color-zinc-100);
    --color-fg-muted: var(--color-zinc-300);
    --color-fg-subtle: var(--color-zinc-500);
    --color-fg-inverse: var(--color-zinc-900);

    --color-border: var(--color-zinc-800);
    --color-border-strong: var(--color-zinc-700);
    --color-border-focus: var(--color-blue-400);

    --color-accent: var(--color-blue-400);
    --color-accent-hover: var(--color-blue-300);
    --color-accent-bg: var(--color-blue-950);
    --color-accent-fg: var(--color-blue-300);

    --color-info-bg: var(--color-blue-950);
    --color-info-fg: var(--color-blue-300);
    --color-success-bg: var(--color-green-950);
    --color-success-fg: var(--color-green-300);
    --color-warning-bg: var(--color-amber-950);
    --color-warning-fg: var(--color-amber-300);
    --color-danger-bg: var(--color-red-950);
    --color-danger-fg: var(--color-red-300);

    --color-link: var(--color-blue-400);
    --color-link-hover: var(--color-blue-300);
    --color-link-visited: var(--color-violet-300);

    --color-code-bg: var(--color-zinc-900);
    --color-code-fg: var(--color-zinc-100);
    --color-code-comment: var(--color-zinc-500);
    --color-code-keyword: var(--color-violet-400);
    --color-code-string: var(--color-green-400);
    --color-code-number: var(--color-orange-400);
    --color-code-function: var(--color-blue-400);
    --color-code-variable: var(--color-pink-400);
    --color-code-type: var(--color-teal-400);

    --color-selection-bg: var(--color-blue-800);
    --color-selection-fg: var(--color-blue-100);
  }
}

[data-theme='default-dark'] {
  /* Same body as @media block above. */
}
```

In production CSS, share these blocks via a CSS preprocessor or `@layer` rather than copy-pasting.

### 7.4 Nord

Arctic, north-bluish, low-contrast. Six "Polar Night / Snow Storm" neutrals plus Frost (cools) and Aurora (warms).

#### Palette additions

```css
[data-theme='nord'],
[data-theme='nord-light'] {
  --nord-polar-0: oklch(28.9% 0.013 248); /* #2e3440 */
  --nord-polar-1: oklch(33.9% 0.014 248); /* #3b4252 */
  --nord-polar-2: oklch(38.9% 0.014 248); /* #434c5e */
  --nord-polar-3: oklch(46.7% 0.016 248); /* #4c566a */
  --nord-snow-0: oklch(86.5% 0.016 226); /* #d8dee9 */
  --nord-snow-1: oklch(90.8% 0.013 224); /* #e5e9f0 */
  --nord-snow-2: oklch(94.5% 0.011 209); /* #eceff4 */
  --nord-frost-0: oklch(74.5% 0.058 195); /* #8fbcbb */
  --nord-frost-1: oklch(78.1% 0.071 215); /* #88c0d0 */
  --nord-frost-2: oklch(70.4% 0.082 232); /* #81a1c1 */
  --nord-frost-3: oklch(60.4% 0.107 248); /* #5e81ac */
  --nord-aurora-red: oklch(63.5% 0.169 27); /* #bf616a */
  --nord-aurora-orange: oklch(68.6% 0.092 47); /* #d08770 */
  --nord-aurora-yellow: oklch(86% 0.106 91); /* #ebcb8b */
  --nord-aurora-green: oklch(78.9% 0.099 142); /* #a3be8c */
  --nord-aurora-purple: oklch(67.6% 0.08 320); /* #b48ead */
}
```

#### Light variant

```css
[data-theme='nord-light'] {
  --color-bg: var(--nord-snow-2);
  --color-bg-subtle: var(--nord-snow-1);
  --color-bg-muted: var(--nord-snow-0);
  --color-bg-inverse: var(--nord-polar-0);
  --color-fg: var(--nord-polar-0);
  --color-fg-muted: var(--nord-polar-2);
  --color-fg-subtle: var(--nord-polar-3);
  --color-fg-inverse: var(--nord-snow-2);
  --color-border: var(--nord-snow-0);
  --color-border-strong: var(--nord-polar-3);
  --color-border-focus: var(--nord-frost-3);
  --color-accent: var(--nord-frost-3);
  --color-accent-hover: var(--nord-frost-2);
  --color-accent-bg: var(--nord-snow-1);
  --color-accent-fg: var(--nord-frost-3);
  --color-info-bg: var(--nord-snow-1);
  --color-info-fg: var(--nord-frost-3);
  --color-success-bg: var(--nord-snow-1);
  --color-success-fg: var(--nord-aurora-green);
  --color-warning-bg: var(--nord-snow-1);
  --color-warning-fg: var(--nord-aurora-orange);
  --color-danger-bg: var(--nord-snow-1);
  --color-danger-fg: var(--nord-aurora-red);
  --color-link: var(--nord-frost-3);
  --color-link-hover: var(--nord-frost-2);
  --color-link-visited: var(--nord-aurora-purple);
  --color-code-bg: var(--nord-snow-1);
  --color-code-fg: var(--nord-polar-0);
  --color-code-comment: var(--nord-polar-3);
  --color-code-keyword: var(--nord-aurora-purple);
  --color-code-string: var(--nord-aurora-green);
  --color-code-number: var(--nord-aurora-orange);
  --color-code-function: var(--nord-frost-1);
  --color-code-variable: var(--nord-frost-0);
  --color-code-type: var(--nord-frost-2);
  --color-selection-bg: var(--nord-frost-1);
  --color-selection-fg: var(--nord-polar-0);
}
```

#### Dark variant (the canonical Nord)

```css
[data-theme='nord'],
[data-theme='nord-dark'] {
  --color-bg: var(--nord-polar-0);
  --color-bg-subtle: var(--nord-polar-1);
  --color-bg-muted: var(--nord-polar-2);
  --color-bg-inverse: var(--nord-snow-2);
  --color-fg: var(--nord-snow-2);
  --color-fg-muted: var(--nord-snow-0);
  --color-fg-subtle: var(--nord-polar-3);
  --color-fg-inverse: var(--nord-polar-0);
  --color-border: var(--nord-polar-2);
  --color-border-strong: var(--nord-polar-3);
  --color-border-focus: var(--nord-frost-1);
  --color-accent: var(--nord-frost-1);
  --color-accent-hover: var(--nord-frost-0);
  --color-accent-bg: var(--nord-polar-2);
  --color-accent-fg: var(--nord-frost-1);
  --color-info-bg: var(--nord-polar-2);
  --color-info-fg: var(--nord-frost-1);
  --color-success-bg: var(--nord-polar-2);
  --color-success-fg: var(--nord-aurora-green);
  --color-warning-bg: var(--nord-polar-2);
  --color-warning-fg: var(--nord-aurora-yellow);
  --color-danger-bg: var(--nord-polar-2);
  --color-danger-fg: var(--nord-aurora-red);
  --color-link: var(--nord-frost-1);
  --color-link-hover: var(--nord-frost-0);
  --color-link-visited: var(--nord-aurora-purple);
  --color-code-bg: var(--nord-polar-1);
  --color-code-fg: var(--nord-snow-2);
  --color-code-comment: var(--nord-polar-3);
  --color-code-keyword: var(--nord-aurora-purple);
  --color-code-string: var(--nord-aurora-green);
  --color-code-number: var(--nord-aurora-orange);
  --color-code-function: var(--nord-frost-1);
  --color-code-variable: var(--nord-frost-0);
  --color-code-type: var(--nord-frost-2);
  --color-selection-bg: var(--nord-frost-3);
  --color-selection-fg: var(--nord-snow-2);
}
```

### 7.5 Solarized

Ethan Schoonover's palette. One set of 16 colors yields both a light and dark theme by swapping which neutrals are foreground vs background.

#### Palette additions

```css
[data-theme^='solarized'] {
  --sol-base03: oklch(20.6% 0.03 213); /* #002b36 — darkest bg */
  --sol-base02: oklch(26% 0.03 211); /* #073642 */
  --sol-base01: oklch(46.7% 0.02 207); /* #586e75 — darkest content */
  --sol-base00: oklch(52% 0.02 207); /* #657b83 */
  --sol-base0: oklch(64% 0.013 207); /* #839496 — lightest content */
  --sol-base1: oklch(70.1% 0.01 207); /* #93a1a1 */
  --sol-base2: oklch(92.8% 0.022 95); /* #eee8d5 */
  --sol-base3: oklch(97.2% 0.02 95); /* #fdf6e3 — lightest bg */
  --sol-yellow: oklch(60.9% 0.131 79); /* #b58900 */
  --sol-orange: oklch(55.2% 0.181 45); /* #cb4b16 */
  --sol-red: oklch(57.4% 0.211 27); /* #dc322f */
  --sol-magenta: oklch(58.8% 0.182 357); /* #d33682 */
  --sol-violet: oklch(56% 0.103 286); /* #6c71c4 */
  --sol-blue: oklch(60.4% 0.137 232); /* #268bd2 */
  --sol-cyan: oklch(63.6% 0.103 187); /* #2aa198 */
  --sol-green: oklch(60% 0.144 124); /* #859900 */
}
```

#### Light variant

```css
[data-theme='solarized-light'] {
  --color-bg: var(--sol-base3);
  --color-bg-subtle: var(--sol-base2);
  --color-bg-muted: var(--sol-base2);
  --color-bg-inverse: var(--sol-base03);
  --color-fg: var(--sol-base00);
  --color-fg-muted: var(--sol-base01);
  --color-fg-subtle: var(--sol-base1);
  --color-fg-inverse: var(--sol-base3);
  --color-border: var(--sol-base2);
  --color-border-strong: var(--sol-base1);
  --color-border-focus: var(--sol-blue);
  --color-accent: var(--sol-blue);
  --color-accent-hover: var(--sol-violet);
  --color-accent-bg: var(--sol-base2);
  --color-accent-fg: var(--sol-blue);
  --color-info-bg: var(--sol-base2);
  --color-info-fg: var(--sol-blue);
  --color-success-bg: var(--sol-base2);
  --color-success-fg: var(--sol-green);
  --color-warning-bg: var(--sol-base2);
  --color-warning-fg: var(--sol-yellow);
  --color-danger-bg: var(--sol-base2);
  --color-danger-fg: var(--sol-red);
  --color-link: var(--sol-blue);
  --color-link-hover: var(--sol-violet);
  --color-link-visited: var(--sol-magenta);
  --color-code-bg: var(--sol-base2);
  --color-code-fg: var(--sol-base00);
  --color-code-comment: var(--sol-base1);
  --color-code-keyword: var(--sol-green);
  --color-code-string: var(--sol-cyan);
  --color-code-number: var(--sol-magenta);
  --color-code-function: var(--sol-blue);
  --color-code-variable: var(--sol-orange);
  --color-code-type: var(--sol-yellow);
  --color-selection-bg: var(--sol-base2);
  --color-selection-fg: var(--sol-base01);
}
```

#### Dark variant

```css
[data-theme='solarized'],
[data-theme='solarized-dark'] {
  --color-bg: var(--sol-base03);
  --color-bg-subtle: var(--sol-base02);
  --color-bg-muted: var(--sol-base02);
  --color-bg-inverse: var(--sol-base3);
  --color-fg: var(--sol-base0);
  --color-fg-muted: var(--sol-base1);
  --color-fg-subtle: var(--sol-base01);
  --color-fg-inverse: var(--sol-base03);
  --color-border: var(--sol-base02);
  --color-border-strong: var(--sol-base01);
  --color-border-focus: var(--sol-blue);
  --color-accent: var(--sol-blue);
  --color-accent-hover: var(--sol-cyan);
  --color-accent-bg: var(--sol-base02);
  --color-accent-fg: var(--sol-blue);
  --color-info-bg: var(--sol-base02);
  --color-info-fg: var(--sol-blue);
  --color-success-bg: var(--sol-base02);
  --color-success-fg: var(--sol-green);
  --color-warning-bg: var(--sol-base02);
  --color-warning-fg: var(--sol-yellow);
  --color-danger-bg: var(--sol-base02);
  --color-danger-fg: var(--sol-red);
  --color-link: var(--sol-blue);
  --color-link-hover: var(--sol-cyan);
  --color-link-visited: var(--sol-magenta);
  --color-code-bg: var(--sol-base02);
  --color-code-fg: var(--sol-base0);
  --color-code-comment: var(--sol-base01);
  --color-code-keyword: var(--sol-green);
  --color-code-string: var(--sol-cyan);
  --color-code-number: var(--sol-magenta);
  --color-code-function: var(--sol-blue);
  --color-code-variable: var(--sol-orange);
  --color-code-type: var(--sol-yellow);
  --color-selection-bg: var(--sol-base02);
  --color-selection-fg: var(--sol-base1);
}
```

### 7.6 Adding a new theme

1. Add palette entries (Tier 1) scoped to `[data-theme='your-theme']`. Always OKLCH; ideally with hex provenance comments.
2. Re-bind every Tier 2 semantic token in the same selector. **Don't** skip any - a missing token will fall back to whichever theme was active before, producing weird mid-swap states.
3. Audit Tier 3 component tokens. Only override the ones that need bespoke treatment.
4. Visually verify the four status colors (`info`, `success`, `warning`, `danger`) read as themselves at body-text size. If a theme's "danger" doesn't read as red-ish, pick another hue inside that theme rather than smuggling in `oklch(... 27)` from the default palette.

---

## 8. Borders & radii

```css
:root {
  --radius-none: 0;
  --radius-xs: 0.125rem; /* 2px */
  --radius-sm: 0.25rem; /* 4px */
  --radius-md: 0.375rem; /* 6px — buttons, inputs */
  --radius-lg: 0.5rem; /* 8px — cards */
  --radius-xl: 0.75rem; /* 12px — modals */
  --radius-2xl: 1rem; /* 16px — hero blocks */
  --radius-full: 9999px; /* Pills, avatars */

  --border-width-thin: 1px;
  --border-width-base: 1px;
  --border-width-thick: 2px;
}
```

Radii do **not** fluid. A 6px button looks like a 6px button on every viewport.

---

## 9. Shadows

OKLCH-based. Shadows in dark themes use slightly different alpha to compensate for the dark background not receiving the same falloff.

```css
:root {
  --shadow-color: oklch(0% 0 0 / 0.08);
  --shadow-color-strong: oklch(0% 0 0 / 0.16);

  --shadow-sm: 0 1px 2px var(--shadow-color);
  --shadow-md: 0 4px 6px var(--shadow-color), 0 2px 4px var(--shadow-color);
  --shadow-lg: 0 10px 15px var(--shadow-color), 0 4px 6px var(--shadow-color);
  --shadow-xl: 0 20px 25px var(--shadow-color), 0 8px 10px var(--shadow-color-strong);
}

@media (prefers-color-scheme: dark) {
  :root {
    --shadow-color: oklch(0% 0 0 / 0.4);
    --shadow-color-strong: oklch(0% 0 0 / 0.6);
  }
}
```

---

## 10. Motion

```css
:root {
  --duration-instant: 0ms;
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;

  --easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --easing-emphasized: cubic-bezier(0.3, 0, 0, 1);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 11. Focus & accessibility

- All interactive elements must have a visible focus ring using `--color-border-focus`.
- Body text contrast: minimum WCAG AA (4.5:1). The default themes here clear this; new themes must too.
- Status colors must be paired with a non-color signal (icon, label, prefix) in callout/banner components.
- Never disable focus rings to "clean up" the design.

```css
:where(:focus-visible) {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-xs);
}
```

---

## 12. Reference layout

Pasting this minimal stylesheet into any HTML page yields a fully themed, fluid document.

```css
:root {
  /* Tier 1 palette + Tier 2 semantic (default-light) go here.       */
  /* See §6 and §7.2.                                                 */
  font-family: var(--font-sans);
  font-size: var(--font-size-0);
  line-height: var(--leading-normal);
  color: var(--color-fg);
  background: var(--color-bg);
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  padding-inline: var(--space-s);
  max-inline-size: 70ch;
  margin-inline: auto;
}

h1 {
  font-size: var(--font-h1);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tighter);
}
h2 {
  font-size: var(--font-h2);
  line-height: var(--leading-tight);
  letter-spacing: var(--tracking-tighter);
}
h3 {
  font-size: var(--font-h3);
  line-height: var(--leading-snug);
}
h4 {
  font-size: var(--font-h4);
  line-height: var(--leading-snug);
}
h5 {
  font-size: var(--font-h5);
}
h6 {
  font-size: var(--font-h6);
}

p {
  margin-block: var(--space-s);
}

a {
  color: var(--color-link);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}
a:hover {
  color: var(--color-link-hover);
}
a:visited {
  color: var(--color-link-visited);
}

code,
kbd,
samp,
pre {
  font-family: var(--font-mono);
  font-size: 0.92em;
}

code:not(pre code) {
  background: var(--color-code-bg);
  padding: 0.125em 0.375em;
  border-radius: var(--radius-sm);
}

pre {
  background: var(--color-code-bg);
  color: var(--color-code-fg);
  padding: var(--space-s);
  border-radius: var(--radius-md);
  overflow-x: auto;
  line-height: var(--leading-mono);
}

hr {
  border: 0;
  border-block-start: var(--border-width-base) solid var(--color-border);
  margin-block: var(--space-l);
}

blockquote {
  margin: var(--space-m) 0;
  padding-inline-start: var(--space-s);
  border-inline-start: 3px solid var(--color-border-strong);
  color: var(--color-fg-muted);
}

::selection {
  background: var(--color-selection-bg);
  color: var(--color-selection-fg);
}
```

---

## 13. Decisions log

| Decision                                     | Why                                                                                                              |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| OKLCH, not HSL or LCH                        | Perceptually uniform; well-supported in evergreen browsers.                                                      |
| Major Third → Perfect Fourth type scale      | Punchier hierarchy than 1.2/1.25. Suits docs that need landing-page-like front pages plus dense reference pages. |
| Fluid type/space, no breakpoints             | One scale to maintain. Layouts use breakpoints; sizing doesn't.                                                  |
| Soft 4px grid, not strict baseline           | Strict baseline grids and fluid type are incompatible without serious tooling. 4px is enough rhythm.             |
| `[data-theme]` over class names              | Cleaner CSS selectors; doesn't collide with utility class naming.                                                |
| Tailwind palette philosophy, no Tailwind dep | We own the values; no build step required to swap a hue.                                                         |
| No webfonts                                  | Instant first paint matters more for a docs reader than a brand-perfect H1.                                      |
| Pure black/white banned                      | Use neutral-50/950 instead. Easier on the eyes; consistent with the palette.                                     |

---

## 14. Open questions

- Should the CLI's terminal output use a separate, palette-aware theme (ANSI 16 → OKLCH mapping), or stay with chalk defaults? Lean: separate, generated from the same Tier 1 values.
- Print stylesheet: do we want one for the eventual static site renderer? Lean: yes, but post-v1.
- Internationalization: monospace fall-backs need a CJK pass before any non-Latin syntax-highlighted code is shipped.
