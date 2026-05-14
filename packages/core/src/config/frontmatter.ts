import { ConfigError } from '../errors.js';
import type { OvellumFrontmatterOverride, OvellumMode, OvellumFormat } from '../types/config.js';

const MODES: readonly OvellumMode[] = ['hybrid', 'manual', 'auto'];
const FORMATS: readonly OvellumFormat[] = ['md', 'mdx'];

/**
 * Extract and validate the `ovellum:` block from parsed frontmatter. Returns
 * an empty object when no override is present. Throws on invalid shape.
 */
export function parseFrontmatterOverride(
  frontmatter: Record<string, unknown> | undefined,
): OvellumFrontmatterOverride {
  if (!frontmatter || frontmatter.ovellum === undefined) return {};
  const block = frontmatter.ovellum;
  if (typeof block === 'boolean') {
    // `ovellum: true` is the marker for auto-generated files. Not a config override.
    return {};
  }
  if (typeof block !== 'object' || block === null || Array.isArray(block)) {
    throw new ConfigError(
      "Frontmatter `ovellum:` must be an object (e.g. `ovellum: { mode: 'manual' }`).",
    );
  }
  const out: OvellumFrontmatterOverride = {};
  const b = block as Record<string, unknown>;
  if (b.mode !== undefined) {
    if (!MODES.includes(b.mode as OvellumMode)) {
      throw new ConfigError(`Frontmatter \`ovellum.mode\` must be one of: ${MODES.join(', ')}.`);
    }
    out.mode = b.mode as OvellumMode;
  }
  if (b.defaultFormat !== undefined) {
    if (!FORMATS.includes(b.defaultFormat as OvellumFormat)) {
      throw new ConfigError(
        `Frontmatter \`ovellum.defaultFormat\` must be one of: ${FORMATS.join(', ')}.`,
      );
    }
    out.defaultFormat = b.defaultFormat as OvellumFormat;
  }
  return out;
}
