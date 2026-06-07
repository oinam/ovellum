/**
 * Look up the latest published `ovellum` version on the npm registry.
 *
 * Uses the lightweight dist-tags endpoint (a few bytes) rather than the full
 * packument, the platform `fetch`, and a hard timeout. Every failure mode —
 * offline, timeout, non-200, malformed JSON — resolves to `null` so callers
 * can treat "couldn't check" the same as "nothing to report".
 */

const DIST_TAGS_URL = 'https://registry.npmjs.org/-/package/ovellum/dist-tags';

export async function fetchLatestVersion(timeoutMs = 1500): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(DIST_TAGS_URL, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (data && typeof data === 'object' && 'latest' in data) {
      const latest = (data as Record<string, unknown>).latest;
      if (typeof latest === 'string' && latest.length > 0) return latest;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
