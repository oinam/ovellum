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
