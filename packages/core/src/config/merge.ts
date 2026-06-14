import type {
  OvellumConfig,
  OvellumLandingConfig,
  OvellumSiteConfig,
  OvellumUpdateConfig,
  OvellumUserConfig,
  ProtectConfig,
} from '../types/config.js';

/**
 * Shallow merge a user override onto a resolved config. Arrays are replaced
 * wholesale (no concat); the nested `protect`, `update`, `site`,
 * `site.landing`, and `site.landing.hero` objects are merged field-by-field.
 * Child wins on every conflict.
 */
export function mergeConfig(base: OvellumConfig, override: OvellumUserConfig): OvellumConfig {
  const merged: OvellumConfig = { ...base };
  for (const key of Object.keys(override) as Array<keyof OvellumUserConfig>) {
    const value = override[key];
    if (value === undefined) continue;
    if (key === 'protect') {
      merged.protect = { ...base.protect, ...(value as Partial<ProtectConfig>) };
      continue;
    }
    if (key === 'update') {
      merged.update = { ...base.update, ...(value as Partial<OvellumUpdateConfig>) };
      continue;
    }
    if (key === 'site') {
      merged.site = mergeSite(base.site, value as Partial<OvellumSiteConfig>);
      continue;
    }
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}

function mergeSite(
  base: OvellumSiteConfig,
  override: Partial<OvellumSiteConfig>,
): OvellumSiteConfig {
  const out: OvellumSiteConfig = { ...base, ...override };
  if (override.landing !== undefined) {
    out.landing = mergeLanding(base.landing, override.landing as Partial<OvellumLandingConfig>);
  }
  if (override.search !== undefined) {
    out.search = { ...base.search, ...override.search };
  }
  if (override.pageMeta !== undefined) {
    out.pageMeta = { ...base.pageMeta, ...override.pageMeta };
  }
  if (override.sidebar !== undefined) {
    out.sidebar = { ...base.sidebar, ...override.sidebar };
  }
  if (override.backToTop !== undefined) {
    out.backToTop = { ...base.backToTop, ...override.backToTop };
  }
  if (override.ai !== undefined) {
    out.ai = { ...base.ai, ...override.ai };
  }
  return out;
}

function mergeLanding(
  base: OvellumLandingConfig,
  override: Partial<OvellumLandingConfig>,
): OvellumLandingConfig {
  const out: OvellumLandingConfig = { ...base, ...override };
  if (override.hero !== undefined) {
    out.hero = { ...base.hero, ...override.hero };
  }
  // `features`, `install`, `scenes`, and `trustStrip` follow the
  // array-wholesale-replacement rule (carried by the `{...base, ...override}`
  // spread above); nothing extra to do here.
  return out;
}
