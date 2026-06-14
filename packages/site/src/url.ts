/**
 * Normalize a `site.basePath` config value. Returns the empty string for
 * root-hosted sites, otherwise a string that starts with `/` and has no
 * trailing slash (`/ovellum`, `/docs`, `/foo/bar`).
 *
 * Idempotent — feeding the result back through is a no-op.
 */
export function normaliseBasePath(value: string | undefined): string {
  if (!value) return '';
  let s = value.trim();
  if (!s) return '';
  if (!s.startsWith('/')) s = '/' + s;
  while (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s === '/' ? '' : s;
}

/**
 * Prepend the configured base path to a site-internal URL. External URLs,
 * fragment-only links, and relative links pass through unchanged.
 *
 *   siteUrl('/foo/', '/ovellum')          → '/ovellum/foo/'
 *   siteUrl('/', '/ovellum')               → '/ovellum/'
 *   siteUrl('/foo/', '')                   → '/foo/'
 *   siteUrl('https://x.test/y', '/ov')    → 'https://x.test/y'
 *   siteUrl('#hash', '/ov')               → '#hash'
 *   siteUrl('relative.md', '/ov')         → 'relative.md'
 */
export function siteUrl(url: string, basePath: string): string {
  if (!url) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url; // any scheme (http, https, mailto, tel, …)
  if (url.startsWith('//')) return url; // protocol-relative
  if (url.startsWith('#')) return url;
  if (!url.startsWith('/')) return url;
  if (!basePath) return url;
  // Avoid double prefixing if the caller already passed a prefixed URL in.
  if (url === basePath || url.startsWith(basePath + '/')) return url;
  return basePath + url;
}

/**
 * Asset URL helper for things like `/assets/ovellum.css`. Same logic as
 * `siteUrl`, but always returns a trailing slash for the prefix when called
 * with an empty path so callers don't have to special-case the "/" case.
 *
 *   assetsPrefix('/ovellum')   → '/ovellum/'
 *   assetsPrefix('')           → '/'
 */
export function assetsPrefix(basePath: string): string {
  return basePath ? basePath + '/' : '/';
}
