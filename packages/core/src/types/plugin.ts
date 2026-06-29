import type { DeployManifest } from './build.js';
import type { OvellumConfig, OvellumMode } from './config.js';

/**
 * A page handed to a plugin's {@link OvellumPlugin.transformPage} hook — one
 * rendered HTML page of a manual-mode site, just before it's written.
 */
export interface OvellumPageContext {
  /** Site-relative URL, e.g. `/guide/intro/`. */
  url: string;
  /** The full rendered HTML document for the page. */
  html: string;
  /** Output path the HTML will be written to, relative to the output dir. */
  outputPath: string;
  /** Parsed page frontmatter, when the page had any. */
  frontmatter?: Record<string, unknown>;
}

/** Return value of {@link OvellumPlugin.transformPage}. Omit to leave the page unchanged. */
export interface OvellumPageResult {
  /** Replacement HTML for the page. */
  html?: string;
}

/** Context for {@link OvellumPlugin.onBuildStart}. */
export interface OvellumBuildStartContext {
  config: OvellumConfig;
  cwd: string;
  mode: OvellumMode;
}

/** Context for {@link OvellumPlugin.onBuildComplete} — the deploy hook's payload. */
export interface OvellumBuildCompleteContext {
  /** Absolute path to the build output directory. */
  outDir: string;
  /**
   * Deploy inventory of the output. Always computed when any plugin defines
   * `onBuildComplete` (even without `--manifest`), so a deploy hook always has
   * the file list + hashes.
   */
  manifest: DeployManifest;
  cwd: string;
  mode: OvellumMode;
}

/**
 * An Ovellum plugin — a named unit bundling build lifecycle hooks (and, in a
 * later slice, markdown remark/rehype plugins). Supplied via
 * {@link OvellumConfig.plugins}. Hooks are all optional, may be async, and run
 * in plugin-array order; a hook that throws fails the build, attributed to the
 * plugin by `name`.
 */
export interface OvellumPlugin {
  /** Stable identifier, used in logs and error messages. */
  name: string;
  /**
   * Fires once after the config is loaded and CLI overrides are applied, before
   * building. Return a config to replace it for the rest of the build (chained
   * across plugins); the returned config is used as-is (not re-validated).
   */
  onResolveConfig?(config: OvellumConfig): OvellumConfig | void | Promise<OvellumConfig | void>;
  /** Fires once before any output is produced. */
  onBuildStart?(ctx: OvellumBuildStartContext): void | Promise<void>;
  /**
   * Fires per rendered HTML page (manual-mode site), just before write. Return
   * `{ html }` to replace the page; chained so each plugin sees the prior's
   * HTML. (Auto/hybrid Markdown output isn't a "page" and isn't transformed.)
   */
  transformPage?(
    page: OvellumPageContext,
  ): OvellumPageResult | void | Promise<OvellumPageResult | void>;
  /** Fires after the build completes — the place for deploy logic. */
  onBuildComplete?(ctx: OvellumBuildCompleteContext): void | Promise<void>;
  /**
   * Extra [remark](https://github.com/remarkjs/remark) plugins added to the
   * Markdown render pipeline (manual mode), each a unified `Pluggable` — a plugin
   * function or a `[plugin, options]` tuple. Injected **after** Ovellum's own
   * remark plugins and **before** the HTML conversion, so their output still
   * passes through sanitization.
   */
  remarkPlugins?: unknown[];
  /**
   * Extra [rehype](https://github.com/rehypejs/rehype) plugins, each a unified
   * `Pluggable`. Injected **before sanitization** — sanitize remains the security
   * guard over everything they produce, so a plugin can't inject unsanitized
   * HTML. (Only manual-mode HTML rendering runs these.)
   */
  rehypePlugins?: unknown[];
}
