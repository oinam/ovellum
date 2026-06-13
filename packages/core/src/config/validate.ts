import { ConfigError } from '../errors.js';
import type { OvellumUserConfig } from '../types/config.js';

const MODES = ['hybrid', 'manual', 'auto'] as const;
const FORMATS = ['md', 'mdx'] as const;
const ORPHAN_STRATEGIES = ['quarantine', 'warn'] as const;
const THEMES = ['auto', 'light', 'dark'] as const;
const PALETTES = ['default', 'nord', 'flexoki', 'solarized', 'eink'] as const;
const CODE_THEMES = ['github', 'nord', 'solarized'] as const;
const FONTS = ['sans', 'serif'] as const;
const CTA_STYLES = ['primary', 'secondary'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Validate a user-supplied config (post-parse, pre-merge). Throws `ConfigError`
 * with a path-qualified message on the first invalid field encountered.
 */
export function validateUserConfig(input: unknown): OvellumUserConfig {
  if (!isPlainObject(input)) {
    throw new ConfigError('Config must be an object.', {
      hint: 'Export a plain object from ovellum.config.ts (use defineConfig({ ... })).',
    });
  }

  const c = input;

  if (c.name !== undefined && typeof c.name !== 'string') {
    throw new ConfigError('`name` must be a string.');
  }
  if (c.version !== undefined && typeof c.version !== 'string') {
    throw new ConfigError("`version` must be a string (e.g. '1.0.0' or 'auto').");
  }
  if (c.mode !== undefined && !MODES.includes(c.mode as (typeof MODES)[number])) {
    throw new ConfigError(`\`mode\` must be one of: ${MODES.join(', ')}.`);
  }
  if (c.input !== undefined && typeof c.input !== 'string') {
    throw new ConfigError('`input` must be a string path.');
  }
  if (c.output !== undefined && typeof c.output !== 'string') {
    throw new ConfigError('`output` must be a string path.');
  }
  if (c.include !== undefined && !isStringArray(c.include)) {
    throw new ConfigError('`include` must be an array of glob strings.');
  }
  if (c.exclude !== undefined && !isStringArray(c.exclude)) {
    throw new ConfigError('`exclude` must be an array of glob strings.');
  }
  if (c.includeInternal !== undefined && typeof c.includeInternal !== 'boolean') {
    throw new ConfigError('`includeInternal` must be a boolean.');
  }
  if (c.includePrivate !== undefined && typeof c.includePrivate !== 'boolean') {
    throw new ConfigError('`includePrivate` must be a boolean.');
  }
  if (
    c.defaultFormat !== undefined &&
    !FORMATS.includes(c.defaultFormat as (typeof FORMATS)[number])
  ) {
    throw new ConfigError(`\`defaultFormat\` must be one of: ${FORMATS.join(', ')}.`);
  }

  if (c.protect !== undefined) {
    if (!isPlainObject(c.protect)) {
      throw new ConfigError('`protect` must be an object.');
    }
    const p = c.protect;
    if (p.blockTag !== undefined && typeof p.blockTag !== 'string') {
      throw new ConfigError('`protect.blockTag` must be a string.');
    }
    if (p.inlineTag !== undefined && typeof p.inlineTag !== 'string') {
      throw new ConfigError('`protect.inlineTag` must be a string.');
    }
    if (
      p.orphanStrategy !== undefined &&
      !ORPHAN_STRATEGIES.includes(p.orphanStrategy as (typeof ORPHAN_STRATEGIES)[number])
    ) {
      throw new ConfigError(
        `\`protect.orphanStrategy\` must be one of: ${ORPHAN_STRATEGIES.join(', ')}.`,
      );
    }
    if (p.orphanDir !== undefined && typeof p.orphanDir !== 'string') {
      throw new ConfigError('`protect.orphanDir` must be a string path.');
    }
    if (p.orphanRetention !== undefined) {
      if (typeof p.orphanRetention !== 'number' || !Number.isFinite(p.orphanRetention)) {
        throw new ConfigError('`protect.orphanRetention` must be a finite number of days.');
      }
      if (p.orphanRetention < 0) {
        throw new ConfigError('`protect.orphanRetention` must be >= 0.');
      }
    }
  }

  if (c.site !== undefined) {
    if (!isPlainObject(c.site)) {
      throw new ConfigError('`site` must be an object.');
    }
    const s = c.site;
    if (s.title !== undefined && typeof s.title !== 'string') {
      throw new ConfigError('`site.title` must be a string.');
    }
    if (s.description !== undefined && typeof s.description !== 'string') {
      throw new ConfigError('`site.description` must be a string.');
    }
    if (s.logo !== undefined) {
      if (typeof s.logo !== 'string' || s.logo.trim() === '') {
        throw new ConfigError('`site.logo` must be a non-empty path or URL string.');
      }
      // The logo is rendered into a CSS `mask-image: url('…')`; quotes, parens,
      // and whitespace would break out of that. A real path/URL never needs them.
      if (/['"()<>;\\\s]/.test(s.logo)) {
        throw new ConfigError(
          '`site.logo` must not contain quotes, parentheses, angle brackets, semicolons, or whitespace.',
          { hint: 'Use a plain path or URL, e.g. "/public/logo.svg".' },
        );
      }
    }
    if (s.favicon !== undefined && (typeof s.favicon !== 'string' || s.favicon.trim() === '')) {
      throw new ConfigError('`site.favicon` must be a non-empty path or URL string.');
    }
    if (s.home !== undefined && (typeof s.home !== 'string' || s.home.trim() === '')) {
      throw new ConfigError('`site.home` must be a non-empty path to a Markdown file.');
    }
    if (s.baseUrl !== undefined && typeof s.baseUrl !== 'string') {
      throw new ConfigError('`site.baseUrl` must be a string URL.');
    }
    if (s.basePath !== undefined) {
      if (typeof s.basePath !== 'string') {
        throw new ConfigError('`site.basePath` must be a string path.');
      }
      if (s.basePath !== '' && !s.basePath.startsWith('/')) {
        throw new ConfigError(
          '`site.basePath` must start with `/` (e.g. `/ovellum`) or be the empty string.',
          { hint: 'Strip the protocol+host; that belongs in `site.baseUrl`.' },
        );
      }
    }
    if (s.footer !== undefined && typeof s.footer !== 'string') {
      throw new ConfigError('`site.footer` must be a string.');
    }
    if (s.credit !== undefined && typeof s.credit !== 'boolean') {
      throw new ConfigError('`site.credit` must be a boolean.');
    }
    if (s.editUrlPattern !== undefined && typeof s.editUrlPattern !== 'string') {
      throw new ConfigError('`site.editUrlPattern` must be a string URL template.');
    }
    if (s.headExtra !== undefined && typeof s.headExtra !== 'string') {
      throw new ConfigError('`site.headExtra` must be a string of raw HTML.');
    }
    if (
      s.defaultTheme !== undefined &&
      !THEMES.includes(s.defaultTheme as (typeof THEMES)[number])
    ) {
      throw new ConfigError(`\`site.defaultTheme\` must be one of: ${THEMES.join(', ')}.`);
    }
    if (s.palette !== undefined && !PALETTES.includes(s.palette as (typeof PALETTES)[number])) {
      throw new ConfigError(`\`site.palette\` must be one of: ${PALETTES.join(', ')}.`);
    }
    if (s.accent !== undefined && (typeof s.accent !== 'string' || s.accent.trim() === '')) {
      throw new ConfigError('`site.accent` must be a non-empty CSS colour string.');
    }
    if (s.font !== undefined && !FONTS.includes(s.font as (typeof FONTS)[number])) {
      throw new ConfigError(`\`site.font\` must be one of: ${FONTS.join(', ')}.`);
    }
    if (
      s.codeTheme !== undefined &&
      !CODE_THEMES.includes(s.codeTheme as (typeof CODE_THEMES)[number])
    ) {
      throw new ConfigError(`\`site.codeTheme\` must be one of: ${CODE_THEMES.join(', ')}.`);
    }
    if (s.search !== undefined) {
      if (!isPlainObject(s.search)) {
        throw new ConfigError('`site.search` must be an object.');
      }
      if (s.search.enabled !== undefined && typeof s.search.enabled !== 'boolean') {
        throw new ConfigError('`site.search.enabled` must be a boolean.');
      }
    }
    if (s.topbarNav !== undefined) {
      if (!Array.isArray(s.topbarNav)) {
        throw new ConfigError('`site.topbarNav` must be an array.');
      }
      s.topbarNav.forEach((item, i) => {
        const path = `site.topbarNav[${i}]`;
        if (!isPlainObject(item)) throw new ConfigError(`\`${path}\` must be an object.`);
        if (typeof item.label !== 'string') {
          throw new ConfigError(`\`${path}.label\` must be a string.`);
        }
        if (typeof item.href !== 'string') {
          throw new ConfigError(`\`${path}.href\` must be a string.`);
        }
        if (item.icon !== undefined && typeof item.icon !== 'string') {
          throw new ConfigError(`\`${path}.icon\` must be a string.`);
        }
        if (item.external !== undefined && typeof item.external !== 'boolean') {
          throw new ConfigError(`\`${path}.external\` must be a boolean.`);
        }
      });
    }
    if (s.version !== undefined && typeof s.version !== 'string') {
      throw new ConfigError('`site.version` must be a string when set.');
    }
    if (s.footerNav !== undefined) {
      if (!Array.isArray(s.footerNav)) {
        throw new ConfigError('`site.footerNav` must be an array.');
      }
      s.footerNav.forEach((item, i) => {
        const path = `site.footerNav[${i}]`;
        if (!isPlainObject(item)) throw new ConfigError(`\`${path}\` must be an object.`);
        if (typeof item.label !== 'string') {
          throw new ConfigError(`\`${path}.label\` must be a string.`);
        }
        if (typeof item.href !== 'string') {
          throw new ConfigError(`\`${path}.href\` must be a string.`);
        }
        if (item.icon !== undefined && typeof item.icon !== 'string') {
          throw new ConfigError(`\`${path}.icon\` must be a string.`);
        }
        if (item.external !== undefined && typeof item.external !== 'boolean') {
          throw new ConfigError(`\`${path}.external\` must be a boolean.`);
        }
      });
    }
    if (s.pageMeta !== undefined) {
      if (!isPlainObject(s.pageMeta)) {
        throw new ConfigError('`site.pageMeta` must be an object.');
      }
      if (s.pageMeta.readingTime !== undefined && typeof s.pageMeta.readingTime !== 'boolean') {
        throw new ConfigError('`site.pageMeta.readingTime` must be a boolean.');
      }
      if (s.pageMeta.lastModified !== undefined && typeof s.pageMeta.lastModified !== 'boolean') {
        throw new ConfigError('`site.pageMeta.lastModified` must be a boolean.');
      }
    }
    if (s.sidebar !== undefined) {
      if (!isPlainObject(s.sidebar)) {
        throw new ConfigError('`site.sidebar` must be an object.');
      }
      if (s.sidebar.collapse !== undefined && typeof s.sidebar.collapse !== 'boolean') {
        throw new ConfigError('`site.sidebar.collapse` must be a boolean.');
      }
    }
    if (s.ignoreFolders !== undefined && !isStringArray(s.ignoreFolders)) {
      throw new ConfigError('`site.ignoreFolders` must be an array of folder-name strings.');
    }
    if (s.ignoreFiles !== undefined && !isStringArray(s.ignoreFiles)) {
      throw new ConfigError('`site.ignoreFiles` must be an array of glob-pattern strings.');
    }
    if (s.landing !== undefined) validateLanding(s.landing);
  }

  if (c.update !== undefined) {
    if (!isPlainObject(c.update)) {
      throw new ConfigError('`update` must be an object.');
    }
    const u = c.update;
    if (u.check !== undefined && typeof u.check !== 'boolean') {
      throw new ConfigError('`update.check` must be a boolean.');
    }
    if (u.intervalHours !== undefined) {
      if (typeof u.intervalHours !== 'number' || !Number.isFinite(u.intervalHours)) {
        throw new ConfigError('`update.intervalHours` must be a finite number of hours.');
      }
      if (u.intervalHours < 0) {
        throw new ConfigError('`update.intervalHours` must be >= 0.');
      }
    }
  }

  return c as OvellumUserConfig;
}

function validateLanding(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new ConfigError('`site.landing` must be an object.');
  }
  const l = value;
  if (l.enabled !== undefined && typeof l.enabled !== 'boolean') {
    throw new ConfigError('`site.landing.enabled` must be a boolean.');
  }
  if (l.docsHref !== undefined && typeof l.docsHref !== 'string') {
    throw new ConfigError('`site.landing.docsHref` must be a string URL or path.');
  }
  if (l.hero !== undefined) {
    if (!isPlainObject(l.hero)) {
      throw new ConfigError('`site.landing.hero` must be an object.');
    }
    const h = l.hero;
    if (h.title !== undefined && typeof h.title !== 'string') {
      throw new ConfigError('`site.landing.hero.title` must be a string.');
    }
    if (h.subtitle !== undefined && typeof h.subtitle !== 'string') {
      throw new ConfigError('`site.landing.hero.subtitle` must be a string.');
    }
    if (h.ctas !== undefined) {
      if (!Array.isArray(h.ctas)) {
        throw new ConfigError('`site.landing.hero.ctas` must be an array.');
      }
      h.ctas.forEach((cta, i) => validateCta(cta, `site.landing.hero.ctas[${i}]`));
    }
    if (h.media !== undefined) validateHeroMedia(h.media);
  }
  if (l.features !== undefined) {
    if (!Array.isArray(l.features)) {
      throw new ConfigError('`site.landing.features` must be an array.');
    }
    l.features.forEach((f, i) => validateFeature(f, `site.landing.features[${i}]`));
  }
  if (l.install !== undefined) {
    if (!Array.isArray(l.install)) {
      throw new ConfigError('`site.landing.install` must be an array.');
    }
    l.install.forEach((it, i) => validateInstall(it, `site.landing.install[${i}]`));
  }
  if (l.scenes !== undefined) {
    if (!Array.isArray(l.scenes)) {
      throw new ConfigError('`site.landing.scenes` must be an array.');
    }
    l.scenes.forEach((s, i) => validateScene(s, `site.landing.scenes[${i}]`));
  }
  if (l.trustStrip !== undefined) {
    if (!isPlainObject(l.trustStrip)) {
      throw new ConfigError('`site.landing.trustStrip` must be an object.');
    }
    const ts = l.trustStrip;
    if (ts.label !== undefined && typeof ts.label !== 'string') {
      throw new ConfigError('`site.landing.trustStrip.label` must be a string.');
    }
    if (ts.items !== undefined) {
      if (!Array.isArray(ts.items)) {
        throw new ConfigError('`site.landing.trustStrip.items` must be an array.');
      }
      ts.items.forEach((it, i) => validateTrustItem(it, `site.landing.trustStrip.items[${i}]`));
    }
  }
}

function validateHeroMedia(value: unknown): void {
  if (!isPlainObject(value)) {
    throw new ConfigError('`site.landing.hero.media` must be an object.');
  }
  const m = value;
  if (typeof m.light !== 'string' || m.light.length === 0) {
    throw new ConfigError('`site.landing.hero.media.light` must be a non-empty string path.');
  }
  if (m.dark !== undefined && typeof m.dark !== 'string') {
    throw new ConfigError('`site.landing.hero.media.dark` must be a string path.');
  }
  if (m.alt !== undefined && typeof m.alt !== 'string') {
    throw new ConfigError('`site.landing.hero.media.alt` must be a string.');
  }
}

function validateCta(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const c = value;
  if (typeof c.label !== 'string') throw new ConfigError(`\`${path}.label\` must be a string.`);
  if (typeof c.href !== 'string') throw new ConfigError(`\`${path}.href\` must be a string.`);
  if (c.style !== undefined && !CTA_STYLES.includes(c.style as (typeof CTA_STYLES)[number])) {
    throw new ConfigError(`\`${path}.style\` must be one of: ${CTA_STYLES.join(', ')}.`);
  }
}

function validateFeature(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const f = value;
  if (typeof f.title !== 'string') throw new ConfigError(`\`${path}.title\` must be a string.`);
  if (typeof f.description !== 'string') {
    throw new ConfigError(`\`${path}.description\` must be a string.`);
  }
  if (f.icon !== undefined && typeof f.icon !== 'string') {
    throw new ConfigError(`\`${path}.icon\` must be a string.`);
  }
}

function validateInstall(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const it = value;
  if (typeof it.title !== 'string') throw new ConfigError(`\`${path}.title\` must be a string.`);
  if (typeof it.code !== 'string') throw new ConfigError(`\`${path}.code\` must be a string.`);
  if (it.lang !== undefined && typeof it.lang !== 'string') {
    throw new ConfigError(`\`${path}.lang\` must be a string.`);
  }
}

function validateScene(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const s = value;
  if (typeof s.light !== 'string' || s.light.length === 0) {
    throw new ConfigError(`\`${path}.light\` must be a non-empty string path.`);
  }
  if (s.dark !== undefined && typeof s.dark !== 'string') {
    throw new ConfigError(`\`${path}.dark\` must be a string path.`);
  }
  if (s.alt !== undefined && typeof s.alt !== 'string') {
    throw new ConfigError(`\`${path}.alt\` must be a string.`);
  }
}

function validateTrustItem(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const t = value;
  if (typeof t.name !== 'string') throw new ConfigError(`\`${path}.name\` must be a string.`);
  if (t.href !== undefined && typeof t.href !== 'string') {
    throw new ConfigError(`\`${path}.href\` must be a string.`);
  }
  if (t.image !== undefined && typeof t.image !== 'string') {
    throw new ConfigError(`\`${path}.image\` must be a string path.`);
  }
}
