import type { OvellumUserConfig } from '../types/config.js';

/**
 * Identity helper that gives users type-safe autocomplete in `ovellum.config.ts`.
 * Accepts a partial config; all defaults are applied during load.
 */
export function defineConfig(config: OvellumUserConfig): OvellumUserConfig {
  return config;
}
