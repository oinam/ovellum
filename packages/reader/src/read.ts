import { readFile } from 'node:fs/promises';
import matter from 'gray-matter';
import type { ManualDoc } from '@ovellum/core';
import { extractProtectedZones } from './zones.js';

/**
 * Read a Markdown / MDX file and return a `ManualDoc`: frontmatter, body
 * content (frontmatter stripped), and all protected zones in document order.
 *
 * Errors are thrown via `OvellumError` for unclosed / nested / stray tags so
 * the CLI can surface them with a clear hint.
 */
export async function readManualDoc(filePath: string): Promise<ManualDoc> {
  const raw = await readFile(filePath, 'utf8');
  return parseManualDoc(raw, filePath);
}

/**
 * Like `readManualDoc` but operates on an in-memory string. Useful for tests
 * and for callers that already have the file contents.
 */
export function parseManualDoc(raw: string, filePath: string): ManualDoc {
  const parsed = matter(raw);
  const frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
  const content = parsed.content;
  const protectedBlocks = extractProtectedZones(content);
  return { filePath, frontmatter, content, protectedBlocks };
}
