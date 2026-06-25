import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadOvellumConfig, type OvellumConfig } from '@ovellum/core';
import { outputPathFor } from '@ovellum/generator';
import { parseProject } from '@ovellum/parser';
import { runCheck } from '../../commands/check.js';
import { diffProjects } from '../diff.js';
import { collectNodes, readProjectIR, type PersistedIR } from '../ir.js';
import { loadOrphans, summarizeOrphans } from '../orphans.js';
import { runBuild } from '../run-build.js';
import { applyWriteZone } from './write-zone.js';

/**
 * The IR-backed tool surface exposed over MCP (`ovellum mcp`). Each handler is
 * a pure-ish async function of `(cwd, args)` returning a JSON-serialisable
 * payload; it throws an `Error` on a user-facing failure (the server turns that
 * into an MCP tool error). Kept transport-agnostic so it's testable without a
 * running stdio loop.
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (cwd: string, args: Record<string, unknown>) => Promise<unknown>;
}

async function loadConfig(cwd: string): Promise<OvellumConfig> {
  const { config } = await loadOvellumConfig({ cwd });
  return config;
}

function requireSnapshot(cwd: string): PersistedIR {
  const snapshot = readProjectIR(cwd);
  if (!snapshot) {
    throw new Error('no IR snapshot at .ovellum/ir.json — run the ovellum_build tool first.');
  }
  return snapshot;
}

function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string' || v.length === 0) throw new Error(`missing required string arg: ${key}`);
  return v;
}

export function ovellumTools(): McpTool[] {
  return [
    {
      name: 'ovellum_query_symbol',
      description:
        'Look up a documented symbol in the persisted IR snapshot by exact anchor id or by name. Returns kind, signature, source location, description, params, and returns.',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Exact anchor id, e.g. "src/math.ts::add".' },
          name: { type: 'string', description: 'Symbol name to match (returns all matches).' },
        },
      },
      handler: async (cwd, args) => {
        const snapshot = requireSnapshot(cwd);
        const nodes = collectNodes(snapshot.project);
        const id = typeof args.id === 'string' ? args.id : undefined;
        const name = typeof args.name === 'string' ? args.name : undefined;
        if (!id && !name) throw new Error('provide either `id` or `name`.');
        const matches = nodes.filter((n) => (id ? n.id === id : n.name === name));
        return {
          query: { id, name },
          count: matches.length,
          symbols: matches.map((n) => ({
            id: n.id,
            kind: n.kind,
            name: n.name,
            signature: n.signature,
            filePath: n.filePath,
            line: n.line,
            description: n.description,
            params: n.params,
            returns: n.returns,
            deprecated: n.deprecated,
            since: n.since,
          })),
        };
      },
    },
    {
      name: 'ovellum_diff',
      description:
        'Compare the current source against the last build IR snapshot. Returns added / removed / changed / renamed symbols and which docs would change. Read-only.',
      inputSchema: { type: 'object', properties: {} },
      handler: async (cwd) => {
        const config = await loadConfig(cwd);
        if (config.mode === 'manual') throw new Error('diff applies to auto / hybrid projects only.');
        const snapshot = requireSnapshot(cwd);
        const current = parseProject({ config, cwd });
        return diffProjects(snapshot.project, current, config);
      },
    },
    {
      name: 'ovellum_check',
      description:
        'Validate the project without writing: broken internal links, unsafe URL schemes, and stale translations (and, with strict, id-less protected zones, stale anchors, and title-less pages). Returns counts and a per-issue list.',
      inputSchema: {
        type: 'object',
        properties: {
          strict: { type: 'boolean', description: 'Run the stricter validations too.' },
        },
      },
      handler: async (cwd, args) => {
        const config = await loadConfig(cwd);
        const { issues, files } = await runCheck({ config, cwd, strict: args.strict === true });
        const unsafe = issues.filter((i) => i.kind === 'unsafe-scheme').length;
        const stale = issues.filter((i) => i.kind === 'stale-translation' || i.kind === 'orphan-translation').length;
        return {
          ok: issues.length === 0,
          mode: config.mode,
          pages: files.length,
          counts: { brokenLinks: issues.length - unsafe - stale, unsafeSchemes: unsafe, staleTranslations: stale },
          issues: issues.map((it) => ({ file: it.file, line: it.line, kind: it.kind, message: it.message })),
        };
      },
    },
    {
      name: 'ovellum_list_orphans',
      description:
        'List quarantined manual blocks under protect.orphanDir, with age, last-seen, and (vs the IR snapshot) whether each anchor is back in source. Optional stale filter.',
      inputSchema: {
        type: 'object',
        properties: {
          stale: { type: 'boolean', description: 'Only orphans older than protect.orphanRetention days.' },
        },
      },
      handler: async (cwd, args) => {
        const config = await loadConfig(cwd);
        const orphanDir = path.resolve(cwd, config.protect.orphanDir);
        const records = await loadOrphans(orphanDir);
        const snapshot = readProjectIR(cwd);
        const currentAnchorIds = snapshot ? new Set(collectNodes(snapshot.project).map((n) => n.id)) : null;
        let summaries = summarizeOrphans(records, {
          now: new Date(),
          retentionDays: config.protect.orphanRetention,
          currentAnchorIds,
          cwd,
        });
        if (args.stale === true) summaries = summaries.filter((s) => s.stale);
        return {
          count: summaries.length,
          orphans: summaries.map((s) => ({
            anchorId: s.record.anchorId,
            sourceFile: s.record.sourceFile,
            orphanedAt: s.record.orphanedAt,
            ageDays: s.ageDays,
            stale: s.stale,
            anchor: s.anchor,
            file: s.file,
          })),
        };
      },
    },
    {
      name: 'ovellum_get_page',
      description:
        "Read a built page's Markdown from the output directory (the AI-friendly .md mirror). Path is relative to the output dir; must stay inside it.",
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Path under the output dir, e.g. "guide/intro.md".' },
        },
        required: ['path'],
      },
      handler: async (cwd, args) => {
        const config = await loadConfig(cwd);
        const rel = str(args, 'path');
        const outputAbs = path.resolve(cwd, config.output);
        const target = path.resolve(outputAbs, rel);
        if (target !== outputAbs && !target.startsWith(outputAbs + path.sep)) {
          throw new Error('path escapes the output directory.');
        }
        if (!existsSync(target)) throw new Error(`no built file at ${rel} — run ovellum_build first.`);
        return { path: rel, content: await readFile(target, 'utf8') };
      },
    },
    {
      name: 'ovellum_build',
      description: 'Run an Ovellum build (parse + generate + merge, or site build). Returns the build summary.',
      inputSchema: {
        type: 'object',
        properties: {
          drafts: { type: 'boolean', description: 'Include draft pages.' },
        },
      },
      handler: async (cwd, args) => {
        const config = await loadConfig(cwd);
        return runBuild({ config, cwd, includeDrafts: args.drafts === true });
      },
    },
    {
      name: 'ovellum_write_zone',
      description:
        'Write Markdown prose into a protected @manual zone under an anchor id, so it survives the next hybrid regeneration. Inserts a new block or replaces an existing one with the same blockId. Use dryRun to preview without writing. Survival requires hybrid mode.',
      inputSchema: {
        type: 'object',
        properties: {
          anchorId: { type: 'string', description: 'Anchor the block attaches to, e.g. "src/math.ts::add".' },
          content: { type: 'string', description: 'Markdown body of the protected block.' },
          blockId: { type: 'string', description: 'Stable id for the block (default "agent-note").' },
          dryRun: { type: 'boolean', description: 'Preview the change without writing.' },
        },
        required: ['anchorId', 'content'],
      },
      handler: async (cwd, args) => {
        const config = await loadConfig(cwd);
        const anchorId = str(args, 'anchorId');
        const content = str(args, 'content');
        const blockId = typeof args.blockId === 'string' && args.blockId ? args.blockId : 'agent-note';
        const dryRun = args.dryRun === true;

        const sourceFile = anchorId.includes('::') ? anchorId.slice(0, anchorId.indexOf('::')) : anchorId;
        const docRel = outputPathFor(sourceFile, config);
        const docAbs = path.resolve(cwd, docRel);
        if (!existsSync(docAbs)) {
          throw new Error(`no built doc at ${docRel} for ${anchorId} — run ovellum_build first.`);
        }
        const doc = await readFile(docAbs, 'utf8');
        const result = applyWriteZone(doc, {
          anchorId,
          content,
          blockId,
          blockTag: config.protect.blockTag,
        });
        if (!result.ok) {
          throw new Error(`anchor "${anchorId}" not found in ${docRel} — is it documented and built?`);
        }
        if (!dryRun) await writeFile(docAbs, result.text, 'utf8');

        return {
          doc: docRel,
          anchorId,
          blockId,
          action: result.action,
          dryRun,
          block: result.block,
          note:
            config.mode === 'hybrid'
              ? 'In hybrid mode the next build preserves this block.'
              : `Mode is "${config.mode}"; protected blocks only survive regeneration in hybrid mode.`,
        };
      },
    },
  ];
}
