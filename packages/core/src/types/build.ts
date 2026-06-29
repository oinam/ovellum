/**
 * Severity for a {@link BuildWarning}. `'warning'` is a real problem the author
 * should act on (orphaned content, an asset skipped for safety, an unparseable
 * date); `'info'` is a benign note about what the build chose to do (drafts
 * excluded, `sitemap.xml` skipped because `site.baseUrl` is unset). Splitting
 * the two keeps genuine problems from being buried under routine notes.
 */
export type BuildWarningSeverity = 'info' | 'warning';

/**
 * A single diagnostic emitted by a build, carried in `BuildSummary.warnings`
 * (and `BuildSiteResult.warnings`). The CLI renders `'warning'` entries first
 * and counts them separately from `'info'` notes; `--json` exposes both fields.
 */
export interface BuildWarning {
  message: string;
  severity: BuildWarningSeverity;
}

/** One file in a {@link DeployManifest}: its output-relative path, size, hash. */
export interface ManifestFile {
  /** Path relative to the output directory, POSIX-separated. */
  path: string;
  bytes: number;
  sha256: string;
}

/**
 * A deterministic inventory of a built output directory — every file with its
 * size and sha256 — so a deploy tool can push only changed hashes, verify
 * completeness, and cache-bust without depending on any specific host. Written
 * to `<output>/.ovellum/manifest.json` by `ovellum build --manifest`, and handed
 * to a plugin's `onBuildComplete` hook.
 */
export interface DeployManifest {
  generator: 'ovellum';
  version: string;
  generatedAt: string;
  /** The output directory's basename (e.g. `dist`, `docs`). */
  output: string;
  fileCount: number;
  totalBytes: number;
  files: ManifestFile[];
}
