---
title: Configuration
description: All the knobs you can turn in `ovellum.config.json` for manual mode.
---

# Configuration

Manual mode reads from the same `OvellumConfig` shape as the other modes,
plus an optional `site` sub-object for site-specific settings.

## Top-level fields

| Field           | Type       | Default  | Notes                                           |
| --------------- | ---------- | -------- | ----------------------------------------------- |
| `mode`          | `'manual'` | required | Tell Ovellum to run the site builder.           |
| `input`         | `string`   | `./src`  | Content directory of `.md` files.               |
| `output`        | `string`   | `./docs` | Where to write the built site.                  |
| `defaultFormat` | `'md'`     | `'md'`   | Only `md` is supported in v1. `mdx` will error. |

## The `site` block

```typescript
interface OvellumSiteConfig {
  title?: string;
  description?: string;
  baseUrl?: string;
  defaultTheme?: 'auto' | 'light' | 'dark';
  footer?: string;
}
```

### Notes

- `title` falls back to `OvellumConfig.name`, then to `"Ovellum site"`.
- `baseUrl` is used for canonical `<link>` tags and Open Graph cards.
  Leave it unset for relative-link output.
- `defaultTheme` is the initial theme **before** the user's stored
  preference loads. `auto` means follow the OS.
- `footer` accepts any string. Set it to an empty string to drop the
  footer entirely.

## Per-page frontmatter

Every `.md` file may declare its own metadata at the top:

```yaml
---
title: Page title in the sidebar and <title>
description: One-line description used in <meta>
---
```

If `title` is missing, Ovellum uses the first `# H1` in the body, or
finally the filename.
