import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadOvellumConfig } from '@ovellum/core';
import { collectAnchorIds, readProjectIR } from '../ir.js';
import { loadOrphans, summarizeOrphans } from '../orphans.js';

/**
 * MCP resources (M1) — Ovellum's read surface exposed as readable context an
 * agent can pull, rather than a tool round-trip: the AI output (`llms.txt`),
 * per-page Markdown mirrors, the IR snapshot, and the orphan archive. Pure-ish:
 * each handler reads from disk / loads config; no protocol concerns here.
 */

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}
export interface McpResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}
export interface McpResourceContents {
  uri: string;
  mimeType?: string;
  text: string;
}

/** Thrown when a resource URI can't be read; carries the MCP "not found" code. */
export class ResourceNotFound extends Error {
  readonly code = -32002;
}

const IR_URI = 'ovellum://ir';
const ORPHANS_URI = 'ovellum://orphans';
const LLMS_URI = 'ovellum://llms.txt';
const LLMS_FULL_URI = 'ovellum://llms-full.txt';
const PAGE_PREFIX = 'ovellum://page/';

/** Currently-readable concrete resources (depends on what's been built). */
export async function listResources(cwd: string): Promise<McpResource[]> {
  const { config } = await loadOvellumConfig({ cwd });
  const outputAbs = path.resolve(cwd, config.output);
  const resources: McpResource[] = [];

  if (existsSync(path.resolve(cwd, '.ovellum', 'ir.json'))) {
    resources.push({
      uri: IR_URI,
      name: 'IR snapshot',
      description: 'The parsed DocProject from the last build (.ovellum/ir.json).',
      mimeType: 'application/json',
    });
  }
  resources.push({
    uri: ORPHANS_URI,
    name: 'Orphans',
    description: 'Quarantined manual blocks with age and reattachability.',
    mimeType: 'application/json',
  });
  if (existsSync(path.join(outputAbs, 'llms.txt'))) {
    resources.push({
      uri: LLMS_URI,
      name: 'llms.txt',
      description: 'Link-first index of every page (llmstxt.org).',
      mimeType: 'text/plain',
    });
  }
  if (existsSync(path.join(outputAbs, 'llms-full.txt'))) {
    resources.push({
      uri: LLMS_FULL_URI,
      name: 'llms-full.txt',
      description: 'The whole docs corpus as one Markdown stream.',
      mimeType: 'text/plain',
    });
  }
  return resources;
}

/** Templated resources — read any built page's Markdown by output-relative path. */
export function listResourceTemplates(): McpResourceTemplate[] {
  return [
    {
      uriTemplate: 'ovellum://page/{path}',
      name: 'Built page',
      description: "A built page's Markdown by output-relative path, e.g. ovellum://page/guide/intro.md",
      mimeType: 'text/markdown',
    },
  ];
}

export async function readResource(cwd: string, uri: string): Promise<McpResourceContents> {
  const { config } = await loadOvellumConfig({ cwd });
  const outputAbs = path.resolve(cwd, config.output);

  if (uri === IR_URI) {
    const file = path.resolve(cwd, '.ovellum', 'ir.json');
    if (!existsSync(file)) throw new ResourceNotFound(`${uri}: no IR snapshot — run a build first.`);
    return { uri, mimeType: 'application/json', text: await readFile(file, 'utf8') };
  }

  if (uri === ORPHANS_URI) {
    const orphanDir = path.resolve(cwd, config.protect.orphanDir);
    const records = await loadOrphans(orphanDir);
    const snapshot = readProjectIR(cwd);
    const currentAnchorIds = snapshot ? collectAnchorIds(snapshot.project) : null;
    const summaries = summarizeOrphans(records, {
      now: new Date(),
      retentionDays: config.protect.orphanRetention,
      currentAnchorIds,
      cwd,
    });
    const payload = summaries.map((s) => ({
      anchorId: s.record.anchorId,
      sourceFile: s.record.sourceFile,
      orphanedAt: s.record.orphanedAt,
      ageDays: s.ageDays,
      stale: s.stale,
      anchor: s.anchor,
      file: s.file,
    }));
    return { uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) + '\n' };
  }

  if (uri === LLMS_URI || uri === LLMS_FULL_URI) {
    const name = uri === LLMS_URI ? 'llms.txt' : 'llms-full.txt';
    const file = path.join(outputAbs, name);
    if (!existsSync(file)) {
      throw new ResourceNotFound(`${uri}: ${name} not built — enable site.ai and build.`);
    }
    return { uri, mimeType: 'text/plain', text: await readFile(file, 'utf8') };
  }

  if (uri.startsWith(PAGE_PREFIX)) {
    const rel = decodeURIComponent(uri.slice(PAGE_PREFIX.length));
    const target = path.resolve(outputAbs, rel);
    if (target !== outputAbs && !target.startsWith(outputAbs + path.sep)) {
      throw new ResourceNotFound(`${uri}: path escapes the output directory.`);
    }
    if (!existsSync(target)) {
      throw new ResourceNotFound(`${uri}: no built file at ${rel} — run a build first.`);
    }
    return { uri, mimeType: 'text/markdown', text: await readFile(target, 'utf8') };
  }

  throw new ResourceNotFound(`${uri}: unknown resource.`);
}
