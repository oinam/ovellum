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
  const absInput = path.resolve(cwd, config.input);

  const project = new Project({
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

  const patterns = [
    ...config.include.map((g) => toPosix(path.join(absInput, g))),
    ...config.exclude.map((g) => '!' + toPosix(path.join(absInput, g))),
  ];
  project.addSourceFilesAtPaths(patterns);

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

  // Sort files for deterministic output ordering.
  files.sort((a, b) => a.filePath.localeCompare(b.filePath));

  return {
    name: options.projectName ?? config.name ?? 'project',
    version: options.projectVersion ?? '0.0.0',
    files,
    generatedAt: new Date().toISOString(),
  };
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
