import type { DocKind, DocNode, DocProject, OvellumConfig } from '@ovellum/core';
import { outputPathFor } from '@ovellum/generator';
import { detectRenames, type Rename } from './rename.js';

/**
 * Structural diff between two parsed IRs (the persisted `.ovellum/ir.json`
 * snapshot and a fresh parse of the current source). Pure: no I/O, no writes.
 * Powers `ovellum diff` — a preview of what a rebuild would change.
 */

export interface SymbolRef {
  /** Stable anchor id: `{sourceFile}::{symbolPath}`. */
  id: string;
  kind: DocKind;
  name: string;
  /** Source file the symbol lives in (the anchor-id prefix). */
  source: string;
}

export interface SymbolChange extends SymbolRef {
  /** Names of the DocNode fields that differ (e.g. `['signature', 'params']`). */
  fields: string[];
}

export interface DocChange {
  /** Output doc path (relative), via the generator's `outputPathFor`. */
  output: string;
  /** Source file (relative). */
  source: string;
  /** Whether the source file is new, gone, or edited in place. */
  status: 'added' | 'removed' | 'modified';
  added: number;
  removed: number;
  changed: number;
}

export interface IRDiff {
  added: SymbolRef[];
  removed: SymbolRef[];
  changed: SymbolChange[];
  /** Likely renames — pairs lifted out of `added`/`removed` (suggest-only). */
  renames: Rename[];
  /** Output docs a rebuild would touch, with per-doc symbol tallies. */
  docs: DocChange[];
  hasChanges: boolean;
}

/**
 * DocNode fields that constitute a meaningful change to the documented API
 * surface. Deliberately excludes `id`/`children` (handled by flattening) and
 * `line`/`filePath` (which shift on unrelated edits above a symbol and would
 * otherwise produce false positives).
 */
const COMPARED_FIELDS = [
  'kind',
  'name',
  'signature',
  'description',
  'params',
  'returns',
  'throws',
  'examples',
  'deprecated',
  'since',
  'tags',
  'isExported',
  'isInternal',
  'isPreserved',
] as const satisfies readonly (keyof DocNode)[];

function* walk(nodes: DocNode[]): Generator<DocNode> {
  for (const node of nodes) {
    yield node;
    if (node.children) yield* walk(node.children);
  }
}

/** Flatten a project's node tree (incl. class/interface members) by anchor id. */
function flatten(project: DocProject): Map<string, DocNode> {
  const map = new Map<string, DocNode>();
  for (const file of project.files) {
    for (const node of walk(file.nodes)) map.set(node.id, node);
  }
  return map;
}

/** The source file an anchor id belongs to (the prefix before `::`). */
function sourceOf(id: string): string {
  const i = id.indexOf('::');
  return i === -1 ? id : id.slice(0, i);
}

function changedFields(prev: DocNode, next: DocNode): string[] {
  const fields: string[] = [];
  for (const field of COMPARED_FIELDS) {
    if (JSON.stringify(prev[field]) !== JSON.stringify(next[field])) fields.push(field);
  }
  return fields;
}

function ref(node: DocNode): SymbolRef {
  return { id: node.id, kind: node.kind, name: node.name, source: sourceOf(node.id) };
}

const byId = (a: SymbolRef, b: SymbolRef): number => a.id.localeCompare(b.id);

/**
 * Diff `current` (fresh parse) against `baseline` (the persisted snapshot).
 * Symbols are matched by stable anchor id, so a rename surfaces as a
 * remove + add (rename *detection* is a later, separate feature).
 */
export function diffProjects(
  baseline: DocProject,
  current: DocProject,
  config: OvellumConfig,
): IRDiff {
  const base = flatten(baseline);
  const cur = flatten(current);

  const addedNodes: DocNode[] = [];
  const removedNodes: DocNode[] = [];
  const changed: SymbolChange[] = [];

  for (const [id, node] of cur) {
    const prev = base.get(id);
    if (!prev) {
      addedNodes.push(node);
    } else {
      const fields = changedFields(prev, node);
      if (fields.length > 0) changed.push({ ...ref(node), fields });
    }
  }
  for (const [id, node] of base) {
    if (!cur.has(id)) removedNodes.push(node);
  }

  // Lift likely renames out of the raw add/remove sets so a refactor reads as a
  // rename, not an unrelated removal + addition.
  const renames = detectRenames(removedNodes, addedNodes);
  const renamedFrom = new Set(renames.map((r) => r.from.id));
  const renamedTo = new Set(renames.map((r) => r.to.id));

  const added = addedNodes.filter((n) => !renamedTo.has(n.id)).map(ref).sort(byId);
  const removed = removedNodes.filter((n) => !renamedFrom.has(n.id)).map(ref).sort(byId);
  changed.sort(byId);

  const docs = rollUpDocs(baseline, current, config, { added, removed, changed, renames });

  return {
    added,
    removed,
    changed,
    renames,
    docs,
    hasChanges:
      added.length > 0 || removed.length > 0 || changed.length > 0 || renames.length > 0,
  };
}

/** Group symbol-level changes by their source file → output doc. */
function rollUpDocs(
  baseline: DocProject,
  current: DocProject,
  config: OvellumConfig,
  changes: { added: SymbolRef[]; removed: SymbolRef[]; changed: SymbolChange[]; renames: Rename[] },
): DocChange[] {
  const baseFiles = new Set(baseline.files.map((f) => f.filePath));
  const curFiles = new Set(current.files.map((f) => f.filePath));

  const tally = new Map<string, { added: number; removed: number; changed: number }>();
  const bump = (source: string, key: 'added' | 'removed' | 'changed') => {
    const entry = tally.get(source) ?? { added: 0, removed: 0, changed: 0 };
    entry[key] += 1;
    tally.set(source, entry);
  };
  for (const s of changes.added) bump(s.source, 'added');
  for (const s of changes.removed) bump(s.source, 'removed');
  for (const s of changes.changed) bump(s.source, 'changed');
  // A rename moves an anchor: gone from the old doc, present in the new one.
  for (const r of changes.renames) {
    bump(r.from.source, 'removed');
    bump(r.to.source, 'added');
  }

  const docs: DocChange[] = [];
  for (const [source, counts] of tally) {
    const inCur = curFiles.has(source);
    const inBase = baseFiles.has(source);
    const status: DocChange['status'] = !inBase && inCur ? 'added' : inBase && !inCur ? 'removed' : 'modified';
    docs.push({ output: outputPathFor(source, config), source, status, ...counts });
  }
  docs.sort((a, b) => a.output.localeCompare(b.output));
  return docs;
}
