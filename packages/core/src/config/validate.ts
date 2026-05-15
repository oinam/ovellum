import { ConfigError } from '../errors.js';
import type { OvellumUserConfig } from '../types/config.js';

const MODES = ['hybrid', 'manual', 'auto'] as const;
const FORMATS = ['md', 'mdx'] as const;
const ORPHAN_STRATEGIES = ['quarantine', 'warn'] as const;
const THEMES = ['auto', 'light', 'dark'] as const;

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
    if (s.baseUrl !== undefined && typeof s.baseUrl !== 'string') {
      throw new ConfigError('`site.baseUrl` must be a string URL.');
    }
    if (s.footer !== undefined && typeof s.footer !== 'string') {
      throw new ConfigError('`site.footer` must be a string.');
    }
    if (
      s.defaultTheme !== undefined &&
      !THEMES.includes(s.defaultTheme as (typeof THEMES)[number])
    ) {
      throw new ConfigError(`\`site.defaultTheme\` must be one of: ${THEMES.join(', ')}.`);
    }
  }

  return c as OvellumUserConfig;
}
