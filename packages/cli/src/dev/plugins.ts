import type { OvellumPlugin } from '@ovellum/core';
import type { TransformPage } from '@ovellum/site';

/**
 * Invoke a plugin hook, attributing any failure to the plugin by name so a
 * broken plugin produces a clear `[plugin: <name>] <hook> failed: …` instead of
 * an opaque stack. Re-throws as a plain Error (build fails fast).
 */
export async function runPluginHook<T>(
  plugin: OvellumPlugin,
  hook: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`[plugin: ${plugin.name}] ${hook} failed: ${detail}`);
  }
}

/**
 * Fold every plugin's `transformPage` into a single resolved callback the site
 * builder can call per page (the same shape as `onLog` — the site package never
 * sees the plugin array). Plugins run in order, each receiving the prior's HTML;
 * returns `undefined` when no plugin transforms pages, so the builder skips the
 * work entirely.
 */
export function composeTransformPage(plugins: OvellumPlugin[]): TransformPage | undefined {
  const active = plugins.filter((p) => p.transformPage);
  if (active.length === 0) return undefined;
  return async (page) => {
    let html = page.html;
    for (const plugin of active) {
      const result = await runPluginHook(plugin, 'transformPage', () =>
        plugin.transformPage!({ ...page, html }),
      );
      if (result && typeof result.html === 'string') html = result.html;
    }
    return html;
  };
}
