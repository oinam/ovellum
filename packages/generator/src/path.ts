import path from 'node:path';
import type { OvellumConfig } from '@ovellum/core';

/**
 * Map a source file path (relative to project root) onto the doc output path
 * (also relative to project root).
 *
 *   src/utils/format.ts  →  docs/utils/format.md
 *
 * The mapping strips the configured `input` directory prefix and rebases under
 * `output`, replacing the extension with `.md` (or `.mdx` when configured).
 */
export function outputPathFor(sourceRelPath: string, config: OvellumConfig): string {
  const inputDir = stripLeadingDotSlash(config.input);
  const outputDir = stripLeadingDotSlash(config.output);
  const ext = config.defaultFormat === 'mdx' ? '.mdx' : '.md';

  const posix = sourceRelPath.replace(/\\/g, '/');
  const trimmed = posix.startsWith(inputDir + '/') ? posix.slice(inputDir.length + 1) : posix;
  const withoutExt = trimmed.replace(/\.(tsx?|jsx?|mts|cts|mjs|cjs)$/, '');
  return path.posix.join(outputDir, withoutExt + ext);
}

function stripLeadingDotSlash(p: string): string {
  return p.replace(/^\.\/+/, '').replace(/\/+$/, '');
}
