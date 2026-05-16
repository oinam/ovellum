import type {
  OvellumConfig,
  OvellumLandingConfig,
  OvellumSiteConfig,
  OvellumUserConfig,
  ProtectConfig,
} from '../types/config.js';

/**
 * Shallow merge a user override onto a resolved config. Arrays are replaced
 * wholesale (no concat); the nested `protect`, `site`, `site.landing`, and
 * `site.landing.hero` objects are merged field-by-field. Child wins on every
 * conflict.
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
  // `features` and `trustStrip` follow the array-wholesale-replacement rule;
  // nothing extra to do here.
  return out;
}
