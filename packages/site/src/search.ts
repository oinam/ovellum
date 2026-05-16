import * as pagefind from 'pagefind';

export interface IndexSiteInput {
  /** Absolute path of the `dist/` directory the build wrote. */
  outputAbs: string;
}

export interface IndexSiteResult {
  /** Number of pages Pagefind successfully indexed. */
  pageCount: number;
  /** Pagefind's internal exit code (`0` clean). Non-zero means partial failure. */
  exitCode: number;
  /** Any non-fatal errors emitted by Pagefind. */
  errors: string[];
}

/**
 * Run Pagefind against an already-built site. Emits a `pagefind/` subdirectory
 * inside `outputAbs` containing the index, the wasm bundle, and the default
 * UI assets that the template loads at runtime.
 *
 * Pagefind is heavy as a build-time dep but ships nothing extra at runtime
 * beyond its own bundle (loaded only on pages where the template injects
 * `<script src="/pagefind/pagefind-ui.js">`). When `site.search.enabled` is
 * false, this function is never called and Pagefind doesn't even load.
 */
export async function indexSite(input: IndexSiteInput): Promise<IndexSiteResult> {
  const { index } = await pagefind.createIndex({});
  if (!index) {
    return { pageCount: 0, exitCode: 1, errors: ['pagefind.createIndex returned no index'] };
  }
  const addRes = await index.addDirectory({ path: input.outputAbs });
  const writeRes = await index.writeFiles({ outputPath: `${input.outputAbs}/pagefind` });
  await pagefind.close();
  return {
    pageCount: addRes.page_count ?? 0,
    exitCode: writeRes.errors.length === 0 ? 0 : 1,
    errors: writeRes.errors,
  };
}
