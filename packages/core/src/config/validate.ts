import { ConfigError } from '../errors.js';
import type { OvellumUserConfig } from '../types/config.js';

const MODES = ['hybrid', 'manual', 'auto'] as const;
const FORMATS = ['md', 'mdx'] as const;
const ORPHAN_STRATEGIES = ['quarantine', 'warn'] as const;
const THEMES = ['auto', 'light', 'dark'] as const;
const PALETTES = ['default', 'nord', 'flexoki', 'solarized', 'eink', 'bare'] as const;
const CODE_THEMES = ['github', 'nord', 'solarized'] as const;
const FONTS = ['sans', 'serif', 'inter', 'geist'] as const;
const DATE_FORMATS = ['humanized', 'iso'] as const;
// BCP 47-ish: a 2–3 letter primary subtag, then optional script/region/variant
// subtags (e.g. en, en-US, zh-Hans, pt-BR). Deliberately permissive but enough
// to reject obvious mistakes ("EN-uk" lowercase-region passes; folder names are
// case-sensitive on some FS, so we keep authors' casing and don't normalize).
const LOCALE_CODE_RE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const CTA_STYLES = ['primary', 'secondary'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * A localizable config string: either a plain string (same in every locale) or
 * a per-locale `{ code: string }` map. Used for user-facing landing/nav labels.
 */
function isLocalized(v: unknown): boolean {
  return (
    typeof v === 'string' ||
    (isPlainObject(v) && Object.values(v).every((x) => typeof x === 'string'))
  );
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

  if (c.plugins !== undefined) {
    if (!Array.isArray(c.plugins)) {
      throw new ConfigError('`plugins` must be an array of plugin objects.');
    }
    const HOOKS = ['onResolveConfig', 'onBuildStart', 'transformPage', 'onBuildComplete'] as const;
    c.plugins.forEach((plugin, i) => {
      if (!isPlainObject(plugin)) {
        throw new ConfigError(`\`plugins[${i}]\` must be an object with a \`name\`.`);
      }
      if (typeof plugin.name !== 'string' || plugin.name.trim() === '') {
        throw new ConfigError(`\`plugins[${i}].name\` must be a non-empty string.`);
      }
      for (const hook of HOOKS) {
        if (plugin[hook] !== undefined && typeof plugin[hook] !== 'function') {
          throw new ConfigError(`\`plugins[${i}] (${plugin.name}).${hook}\` must be a function.`);
        }
      }
      for (const list of ['remarkPlugins', 'rehypePlugins'] as const) {
        if (plugin[list] !== undefined && !Array.isArray(plugin[list])) {
          throw new ConfigError(`\`plugins[${i}] (${plugin.name}).${list}\` must be an array.`);
        }
      }
    });
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
    if (s.appearance !== undefined) {
      const bad = "`site.appearance` must be 'control', 'inherit', or a { mode: 'inherit', storageKey?, darkValue?, lightValue? } object.";
      if (typeof s.appearance === 'string') {
        if (s.appearance !== 'control' && s.appearance !== 'inherit') {
          throw new ConfigError(bad);
        }
      } else if (isPlainObject(s.appearance)) {
        const ap = s.appearance;
        if (ap.mode !== 'inherit') {
          throw new ConfigError("`site.appearance.mode` must be `'inherit'` in the object form.");
        }
        for (const key of ['storageKey', 'darkValue', 'lightValue'] as const) {
          const v = ap[key];
          if (v !== undefined && (typeof v !== 'string' || v.trim() === '')) {
            throw new ConfigError(`\`site.appearance.${key}\` must be a non-empty string.`);
          }
        }
      } else {
        throw new ConfigError(bad);
      }
    }
    if (s.palette !== undefined && !PALETTES.includes(s.palette as (typeof PALETTES)[number])) {
      throw new ConfigError(`\`site.palette\` must be one of: ${PALETTES.join(', ')}.`);
    }
    if (s.accent !== undefined && (typeof s.accent !== 'string' || s.accent.trim() === '')) {
      throw new ConfigError('`site.accent` must be a non-empty CSS color string.');
    }
    if (s.font !== undefined) {
      if (isPlainObject(s.font)) {
        // Custom font object: `body` required; `mono`/`label` optional strings;
        // `source` an optional string or string[]. Reject CSS-breaking chars in
        // the family values (defense-in-depth; they're injected into a <style>).
        const f = s.font;
        if (typeof f.body !== 'string' || f.body.trim() === '') {
          throw new ConfigError('`site.font.body` must be a non-empty font-family string.');
        }
        for (const key of ['body', 'mono', 'label'] as const) {
          const v = f[key];
          if (v !== undefined && typeof v !== 'string') {
            throw new ConfigError(`\`site.font.${key}\` must be a string.`);
          }
          if (typeof v === 'string' && /[<>{};]/.test(v)) {
            throw new ConfigError(`\`site.font.${key}\` must not contain \`< > { } ;\`.`);
          }
        }
        const sources = f.source === undefined ? [] : Array.isArray(f.source) ? f.source : [f.source];
        for (const src of sources) {
          if (typeof src !== 'string' || src.trim() === '') {
            throw new ConfigError('`site.font.source` must be a stylesheet URL or an array of URLs.');
          }
          if (/^\s*(javascript|data|vbscript):/i.test(src)) {
            throw new ConfigError('`site.font.source` must be an http(s) or relative URL.');
          }
        }
      } else if (!FONTS.includes(s.font as (typeof FONTS)[number])) {
        throw new ConfigError(
          `\`site.font\` must be one of: ${FONTS.join(', ')} — or a { body, mono?, source?, label? } object.`,
        );
      }
    }
    if (
      s.dateFormat !== undefined &&
      !DATE_FORMATS.includes(s.dateFormat as (typeof DATE_FORMATS)[number])
    ) {
      throw new ConfigError(`\`site.dateFormat\` must be one of: ${DATE_FORMATS.join(', ')}.`);
    }
    if (s.locales !== undefined) {
      if (!Array.isArray(s.locales) || s.locales.length === 0) {
        throw new ConfigError('`site.locales` must be a non-empty array of { code, label }.');
      }
      const codes = new Set<string>();
      for (let i = 0; i < s.locales.length; i++) {
        const loc = s.locales[i] as { code?: unknown; label?: unknown };
        if (!isPlainObject(loc)) {
          throw new ConfigError(`\`site.locales[${i}]\` must be an object { code, label }.`);
        }
        if (typeof loc.code !== 'string' || !LOCALE_CODE_RE.test(loc.code)) {
          throw new ConfigError(
            `\`site.locales[${i}].code\` must be a BCP 47 tag like 'en-US', 'ja', or 'zh-Hans'.`,
          );
        }
        if (typeof loc.label !== 'string' || loc.label.trim() === '') {
          throw new ConfigError(`\`site.locales[${i}].label\` must be a non-empty string.`);
        }
        if (codes.has(loc.code)) {
          throw new ConfigError(`\`site.locales\` has a duplicate code '${loc.code}'.`);
        }
        codes.add(loc.code);
      }
      if (s.defaultLocale !== undefined) {
        if (typeof s.defaultLocale !== 'string' || !codes.has(s.defaultLocale)) {
          throw new ConfigError(
            '`site.defaultLocale` must match one of the `site.locales[].code` values.',
          );
        }
      }
    } else if (s.defaultLocale !== undefined) {
      throw new ConfigError('`site.defaultLocale` is set but `site.locales` is not.');
    }
    if (s.versions !== undefined) {
      if (!Array.isArray(s.versions) || s.versions.length === 0) {
        throw new ConfigError('`site.versions` must be a non-empty array of { id, label?, latest? }.');
      }
      const ids = new Set<string>();
      let latestCount = 0;
      for (let i = 0; i < s.versions.length; i++) {
        const v = s.versions[i] as { id?: unknown; label?: unknown; latest?: unknown };
        if (!isPlainObject(v)) {
          throw new ConfigError(`\`site.versions[${i}]\` must be an object { id, label?, latest? }.`);
        }
        if (typeof v.id !== 'string' || !/^[A-Za-z0-9._-]+$/.test(v.id)) {
          throw new ConfigError(
            `\`site.versions[${i}].id\` must be a URL/folder-safe string (letters, digits, '.', '_', '-').`,
          );
        }
        if (ids.has(v.id)) {
          throw new ConfigError(`\`site.versions\` has a duplicate id '${v.id}'.`);
        }
        ids.add(v.id);
        if (v.label !== undefined && typeof v.label !== 'string') {
          throw new ConfigError(`\`site.versions[${i}].label\` must be a string.`);
        }
        if (v.latest !== undefined) {
          if (typeof v.latest !== 'boolean') {
            throw new ConfigError(`\`site.versions[${i}].latest\` must be a boolean.`);
          }
          if (v.latest) latestCount++;
        }
      }
      if (latestCount > 1) {
        throw new ConfigError('`site.versions` may mark at most one entry as `latest`.');
      }
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
    if (s.ai !== undefined) {
      if (!isPlainObject(s.ai)) {
        throw new ConfigError('`site.ai` must be an object.');
      }
      for (const key of ['enabled', 'llmsTxt', 'fullText', 'mdMirror'] as const) {
        if (s.ai[key] !== undefined && typeof s.ai[key] !== 'boolean') {
          throw new ConfigError(`\`site.ai.${key}\` must be a boolean.`);
        }
      }
    }
    if (s.mermaid !== undefined) {
      if (!isPlainObject(s.mermaid)) {
        throw new ConfigError('`site.mermaid` must be an object.');
      }
      if (s.mermaid.enabled !== undefined && typeof s.mermaid.enabled !== 'boolean') {
        throw new ConfigError('`site.mermaid.enabled` must be a boolean.');
      }
      if (s.mermaid.url !== undefined && typeof s.mermaid.url !== 'string') {
        throw new ConfigError('`site.mermaid.url` must be a string.');
      }
    }
    if (s.topbarNav !== undefined) {
      if (!Array.isArray(s.topbarNav)) {
        throw new ConfigError('`site.topbarNav` must be an array.');
      }
      s.topbarNav.forEach((item, i) => {
        const path = `site.topbarNav[${i}]`;
        if (!isPlainObject(item)) throw new ConfigError(`\`${path}\` must be an object.`);
        if (!isLocalized(item.label)) {
          throw new ConfigError(
            `\`${path}.label\` must be a string or a per-locale map of strings.`,
          );
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
        if (!isLocalized(item.label)) {
          throw new ConfigError(
            `\`${path}.label\` must be a string or a per-locale map of strings.`,
          );
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
    if (s.backToTop !== undefined) {
      if (!isPlainObject(s.backToTop)) {
        throw new ConfigError('`site.backToTop` must be an object.');
      }
      if (s.backToTop.enabled !== undefined && typeof s.backToTop.enabled !== 'boolean') {
        throw new ConfigError('`site.backToTop.enabled` must be a boolean.');
      }
      if (
        s.backToTop.threshold !== undefined &&
        (typeof s.backToTop.threshold !== 'number' ||
          !Number.isFinite(s.backToTop.threshold) ||
          s.backToTop.threshold < 0)
      ) {
        throw new ConfigError('`site.backToTop.threshold` must be a non-negative number (px).');
      }
    }
    if (s.ignoreFolders !== undefined && !isStringArray(s.ignoreFolders)) {
      throw new ConfigError('`site.ignoreFolders` must be an array of folder-name strings.');
    }
    if (s.ignoreFiles !== undefined && !isStringArray(s.ignoreFiles)) {
      throw new ConfigError('`site.ignoreFiles` must be an array of glob-pattern strings.');
    }
    if (s.assetBaseUrl !== undefined) {
      if (typeof s.assetBaseUrl !== 'string' || s.assetBaseUrl.trim() === '') {
        throw new ConfigError('`site.assetBaseUrl` must be a non-empty URL string.');
      }
      if (/\s/.test(s.assetBaseUrl)) {
        throw new ConfigError('`site.assetBaseUrl` must not contain whitespace.');
      }
    }
    if (s.templateDir !== undefined && (typeof s.templateDir !== 'string' || s.templateDir.trim() === '')) {
      throw new ConfigError('`site.templateDir` must be a non-empty directory path.');
    }
    if (s.images !== undefined) {
      if (!isPlainObject(s.images)) {
        throw new ConfigError('`site.images` must be an object (e.g. `{ quality: 80 }`).');
      }
      const q = s.images.quality;
      if (q !== undefined && (typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > 100)) {
        throw new ConfigError('`site.images.quality` must be an integer between 1 and 100.');
      }
    }
    if (s.css !== undefined) {
      // One stylesheet URL or an array of them, injected as `<link>`s. Same
      // scheme guard as `site.font.source` — reject script-bearing schemes;
      // accept http(s) + relative/root-absolute.
      const sheets = Array.isArray(s.css) ? s.css : [s.css];
      if (Array.isArray(s.css) && s.css.length === 0) {
        throw new ConfigError('`site.css` must be a stylesheet URL or a non-empty array of URLs.');
      }
      for (const href of sheets) {
        if (typeof href !== 'string' || href.trim() === '') {
          throw new ConfigError('`site.css` must be a stylesheet URL or an array of URLs.');
        }
        if (/^\s*(javascript|data|vbscript):/i.test(href)) {
          throw new ConfigError('`site.css` must be an http(s) or relative URL.');
        }
      }
    }
    if (s.publicDir !== undefined) {
      if (typeof s.publicDir !== 'string' || s.publicDir.trim() === '') {
        throw new ConfigError('`site.publicDir` must be a non-empty folder name.');
      }
      if (s.publicDir.includes('/') || s.publicDir.includes('\\') || s.publicDir.includes('..')) {
        throw new ConfigError(
          '`site.publicDir` must be a single folder name at the input root (no slashes or `..`).',
        );
      }
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
    if (h.title !== undefined && !isLocalized(h.title)) {
      throw new ConfigError(
        '`site.landing.hero.title` must be a string or a per-locale map of strings.',
      );
    }
    if (h.subtitle !== undefined && !isLocalized(h.subtitle)) {
      throw new ConfigError(
        '`site.landing.hero.subtitle` must be a string or a per-locale map of strings.',
      );
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
    if (ts.label !== undefined && !isLocalized(ts.label)) {
      throw new ConfigError(
        '`site.landing.trustStrip.label` must be a string or a per-locale map of strings.',
      );
    }
    if (ts.items !== undefined) {
      if (!Array.isArray(ts.items)) {
        throw new ConfigError('`site.landing.trustStrip.items` must be an array.');
      }
      ts.items.forEach((it, i) => validateTrustItem(it, `site.landing.trustStrip.items[${i}]`));
    }
  }
  if (l.sections !== undefined) {
    if (!Array.isArray(l.sections)) {
      throw new ConfigError('`site.landing.sections` must be an array.');
    }
    l.sections.forEach((sec, i) => validateLandingSection(sec, `site.landing.sections[${i}]`));
  }
}

const LANDING_SECTION_TYPES = ['hero', 'install', 'features', 'trust', 'scene', 'prose', 'custom-html'];

function validateLandingSection(value: unknown, path: string): void {
  if (!isPlainObject(value)) {
    throw new ConfigError(`\`${path}\` must be an object.`);
  }
  const sec = value;
  if (typeof sec.type !== 'string' || !LANDING_SECTION_TYPES.includes(sec.type)) {
    throw new ConfigError(`\`${path}.type\` must be one of: ${LANDING_SECTION_TYPES.join(', ')}.`);
  }
  if (sec.type === 'scene') {
    if (sec.scene === undefined) {
      throw new ConfigError(`\`${path}.scene\` is required for a 'scene' section.`);
    }
    validateScene(sec.scene, `${path}.scene`);
  }
  if (sec.type === 'custom-html' && (typeof sec.html !== 'string' || sec.html.length === 0)) {
    throw new ConfigError(`\`${path}.html\` (non-empty string) is required for a 'custom-html' section.`);
  }
  if (sec.type === 'prose' && sec.html !== undefined && typeof sec.html !== 'string') {
    throw new ConfigError(`\`${path}.html\` must be a string.`);
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
  if (!isLocalized(c.label))
    throw new ConfigError(`\`${path}.label\` must be a string or a per-locale map of strings.`);
  if (typeof c.href !== 'string') throw new ConfigError(`\`${path}.href\` must be a string.`);
  if (c.style !== undefined && !CTA_STYLES.includes(c.style as (typeof CTA_STYLES)[number])) {
    throw new ConfigError(`\`${path}.style\` must be one of: ${CTA_STYLES.join(', ')}.`);
  }
}

function validateFeature(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const f = value;
  if (!isLocalized(f.title))
    throw new ConfigError(`\`${path}.title\` must be a string or a per-locale map of strings.`);
  if (!isLocalized(f.description)) {
    throw new ConfigError(`\`${path}.description\` must be a string or a per-locale map of strings.`);
  }
  if (f.icon !== undefined && typeof f.icon !== 'string') {
    throw new ConfigError(`\`${path}.icon\` must be a string.`);
  }
  if (f.href !== undefined && typeof f.href !== 'string') {
    throw new ConfigError(`\`${path}.href\` must be a string.`);
  }
}

function validateInstall(value: unknown, path: string): void {
  if (!isPlainObject(value)) throw new ConfigError(`\`${path}\` must be an object.`);
  const it = value;
  if (!isLocalized(it.title))
    throw new ConfigError(`\`${path}.title\` must be a string or a per-locale map of strings.`);
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
  if (!isLocalized(t.name))
    throw new ConfigError(`\`${path}.name\` must be a string or a per-locale map of strings.`);
  if (t.href !== undefined && typeof t.href !== 'string') {
    throw new ConfigError(`\`${path}.href\` must be a string.`);
  }
  if (t.image !== undefined && typeof t.image !== 'string') {
    throw new ConfigError(`\`${path}.image\` must be a string path.`);
  }
}
