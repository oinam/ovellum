import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Project, ScriptTarget, ModuleKind } from 'ts-morph';
import type { DocFile, DocProject, OvellumConfig } from '@ovellum/core';
import { extractFromFile } from './extractors.js';
import { extractJsDoc } from './jsdoc.js';
import { anchorId, MODULE_SYMBOL } from './anchor.js';

export interface ParseOptions {
  config: OvellumConfig;
  /** Project root - paths in `config.input`, `include`, `exclude` resolve from here. */
  cwd: string;
  /** Project name for the output IR; defaults to `config.name` or `'project'`. */
  projectName?: string;
  /** Project version for the output IR; defaults to `'0.0.0'` (resolved upstream when 'auto'). */
  projectVersion?: string;
}

/**
 * Parse a TypeScript/JavaScript project into the Ovellum IR.
 *
 * Implemented as of Phase 2 (slice): functions, classes (methods+props), interfaces, type
 * aliases, enums. Overloads, namespaces, re-exports, and `declare module` are not yet
 * supported - they'll either be skipped or partially captured. See TODO.md Phase 2.
 */
export function parseProject(options: ParseOptions): DocProject {
  const { config, cwd } = options;
  const project = newProject();
  project.addSourceFilesAtPaths(globPatterns(cwd, config));
  return {
    ...projectMeta(options),
    files: extractAll(project, cwd, config),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * A parser that keeps its ts-morph `Project` warm across rebuilds (A7). The
 * expensive part of a cold parse is creating the project and reading every file
 * from disk; `update()` reuses the project, refreshing only the files that
 * changed, then re-extracts (cheap, in-memory AST walks) the whole project so
 * cross-file effects are still reflected. It reports which `DocFile`s actually
 * changed so callers can rebuild only the affected outputs.
 */
export interface IncrementalParser {
  /** The current whole-project IR (kept in sync by `update`). */
  readonly project: DocProject;
  /**
   * Apply file changes and return the refreshed IR plus the relative paths of
   * source files whose `DocFile` changed (new or edited — including ripples
   * from a cross-file type change).
   */
  update(changes: { changed?: string[]; removed?: string[] }): {
    project: DocProject;
    affected: string[];
  };
}

export function createIncrementalParser(options: ParseOptions): IncrementalParser {
  const { config, cwd } = options;
  const patterns = globPatterns(cwd, config);
  const project = newProject();
  project.addSourceFilesAtPaths(patterns);

  const meta = projectMeta(options);
  let current: DocProject = { ...meta, files: extractAll(project, cwd, config), generatedAt: new Date().toISOString() };

  return {
    get project() {
      return current;
    },
    update({ changed = [], removed = [] }) {
      for (const abs of removed) {
        const sf = project.getSourceFile(abs);
        if (sf) project.removeSourceFile(sf);
      }
      let sawNew = false;
      for (const abs of changed) {
        const sf = project.getSourceFile(abs);
        if (sf) {
          // Re-read from disk and re-parse just this file's AST.
          try {
            sf.replaceWithText(readFileSync(abs, 'utf8'));
          } catch {
            // The file vanished between the event and now — drop it.
            project.removeSourceFile(sf);
          }
        } else {
          sawNew = true;
        }
      }
      // A genuinely new path is only documented if it matches the include/
      // exclude globs — let ts-morph apply them rather than guessing.
      if (sawNew) project.addSourceFilesAtPaths(patterns);

      const before = new Map(current.files.map((f) => [f.filePath, JSON.stringify(f)]));
      const files = extractAll(project, cwd, config);
      const affected: string[] = [];
      for (const f of files) {
        if (before.get(f.filePath) !== JSON.stringify(f)) affected.push(f.filePath);
      }

      current = { ...meta, files, generatedAt: new Date().toISOString() };
      return { project: current, affected };
    },
  };
}

function newProject(): Project {
  return new Project({
    compilerOptions: {
      allowJs: true,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      strict: false,
      skipLibCheck: true,
    },
    skipAddingFilesFromTsConfig: true,
    useInMemoryFileSystem: false,
  });
}

function globPatterns(cwd: string, config: OvellumConfig): string[] {
  const absInput = path.resolve(cwd, config.input);
  return [
    ...config.include.map((g) => toPosix(path.join(absInput, g))),
    ...config.exclude.map((g) => '!' + toPosix(path.join(absInput, g))),
  ];
}

function projectMeta(options: ParseOptions): { name: string; version: string } {
  return {
    name: options.projectName ?? options.config.name ?? 'project',
    version: options.projectVersion ?? '0.0.0',
  };
}

/** Extract every source file in the project into DocFiles (sorted, stable). */
function extractAll(project: Project, cwd: string, config: OvellumConfig): DocFile[] {
  const files: DocFile[] = [];
  for (const sf of project.getSourceFiles()) {
    const abs = sf.getFilePath();
    const rel = toPosix(path.relative(cwd, abs));
    const moduleDoc = readModuleJsDoc(sf);
    const nodes = extractFromFile(sf, { relPath: rel, config });
    if (nodes.length === 0 && !moduleDoc.description && !moduleDoc.moduleName) continue;

    const docFile: DocFile = { filePath: rel, nodes };
    if (moduleDoc.moduleName) docFile.moduleName = moduleDoc.moduleName;
    if (moduleDoc.description) docFile.description = moduleDoc.description;
    files.push(docFile);
  }
  files.sort((a, b) => a.filePath.localeCompare(b.filePath));
  return files;
}

function readModuleJsDoc(sf: import('ts-morph').SourceFile): {
  description?: string;
  moduleName?: string;
} {
  // Look for a JSDoc block at the top of the file. ts-morph attaches leading
  // JSDoc to the first statement; we accept it as "module-level" if it carries
  // `@module` or if the file has no other JSDoc-bearing top-level statements
  // above the first statement's actual code.
  const first = sf.getStatements()[0];
  if (!first) return {};
  const docable = first as unknown as { getJsDocs?: () => unknown[] };
  if (typeof docable.getJsDocs !== 'function') return {};
  const info = extractJsDoc(first as unknown as Parameters<typeof extractJsDoc>[0]);
  if (info.moduleName !== undefined) {
    return { description: info.description, moduleName: info.moduleName };
  }
  return {};
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

export { anchorId, MODULE_SYMBOL };
