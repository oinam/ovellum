export type { DocKind, DocParam, DocReturn, DocNode, DocFile, DocProject } from './types/ir.js';

export type {
  OvellumMode,
  OvellumFormat,
  OrphanStrategy,
  OvellumDefaultTheme,
  OvellumCtaStyle,
  ProtectConfig,
  OvellumSiteConfig,
  OvellumLandingConfig,
  OvellumLandingHero,
  OvellumLandingCta,
  OvellumLandingFeature,
  OvellumLandingTrustStrip,
  OvellumLandingTrustItem,
  OvellumConfig,
  OvellumUserConfig,
  OvellumFrontmatterOverride,
} from './types/config.js';
export { DEFAULT_CONFIG } from './types/config.js';

export type { ProtectedBlock, ManualDoc } from './types/manual.js';
export type { OrphanRecord } from './types/orphan.js';

export { OvellumError, ConfigError } from './errors.js';
export type { OvellumErrorOptions } from './errors.js';

export { defineConfig } from './config/define.js';
export { mergeConfig } from './config/merge.js';
export { validateUserConfig } from './config/validate.js';
export { parseFrontmatterOverride } from './config/frontmatter.js';
export { loadOvellumConfig, loadDirectoryOverride } from './config/load.js';
export type { LoadOvellumConfigOptions, LoadedOvellumConfig } from './config/load.js';
