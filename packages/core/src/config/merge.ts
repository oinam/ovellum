import type { OvellumConfig, OvellumUserConfig, ProtectConfig } from '../types/config.js';

/**
 * Shallow merge a user override onto a resolved config. Arrays are replaced
 * wholesale (no concat), nested `protect` is merged field-by-field. Child wins
 * on every conflict.
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
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}
