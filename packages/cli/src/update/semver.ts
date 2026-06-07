/**
 * Tiny semver comparator — just enough to decide "is the published version
 * newer than mine?" without pulling in the full `semver` package.
 *
 * Implements the SemVer 2.0.0 precedence rules that matter here: numeric
 * compare of major/minor/patch, then prerelease precedence (a version WITH a
 * prerelease is lower than the same version without one; prerelease
 * identifiers compare field-by-field, numeric < by value, alphanumeric < by
 * ASCII, numeric identifiers always rank below alphanumeric ones). Build
 * metadata (`+…`) is ignored, per spec.
 */

interface Parsed {
  major: number;
  minor: number;
  patch: number;
  /** Dot-separated prerelease identifiers, or [] for a release. */
  pre: string[];
}

/** Parse `1.2.3`, `1.2.3-beta.1`, `1.2.3+build` → structured, or null if it
 *  doesn't look like a semver core. Leading `v` is tolerated. */
export function parseSemver(input: string): Parsed | null {
  const cleaned = input.trim().replace(/^v/, '');
  // Strip build metadata first (everything after the first `+`).
  const noBuild = cleaned.split('+', 1)[0]!;
  const dashIdx = noBuild.indexOf('-');
  const core = dashIdx === -1 ? noBuild : noBuild.slice(0, dashIdx);
  const preStr = dashIdx === -1 ? '' : noBuild.slice(dashIdx + 1);

  const parts = core.split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nums.some((n) => Number.isNaN(n))) return null;

  return {
    major: nums[0]!,
    minor: nums[1]!,
    patch: nums[2]!,
    pre: preStr === '' ? [] : preStr.split('.'),
  };
}

/**
 * Compare two semver strings. Returns a negative number if `a < b`, `0` if
 * equal in precedence, positive if `a > b`. Unparseable input sorts as
 * "equal" (0) so callers treat it as "no upgrade signal" rather than crashing.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;

  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;

  // Equal cores: a release outranks a prerelease.
  if (pa.pre.length === 0 && pb.pre.length === 0) return 0;
  if (pa.pre.length === 0) return 1; // a is the release
  if (pb.pre.length === 0) return -1; // b is the release

  // Both prerelease: compare identifiers left to right.
  const len = Math.max(pa.pre.length, pb.pre.length);
  for (let i = 0; i < len; i++) {
    const ai = pa.pre[i];
    const bi = pb.pre[i];
    if (ai === undefined) return -1; // shorter set has lower precedence
    if (bi === undefined) return 1;
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);
    if (aNum && bNum) {
      const d = Number(ai) - Number(bi);
      if (d !== 0) return d;
    } else if (aNum !== bNum) {
      return aNum ? -1 : 1; // numeric identifiers rank below alphanumeric
    } else if (ai !== bi) {
      return ai < bi ? -1 : 1;
    }
  }
  return 0;
}

/** True when `latest` is strictly newer than `current`. */
export function isNewer(current: string, latest: string): boolean {
  return compareSemver(current, latest) < 0;
}
