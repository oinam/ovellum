export type DocKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'method'
  | 'property';

export interface DocParam {
  name: string;
  type: string;
  description?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface DocReturn {
  type: string;
  description?: string;
}

export interface DocNode {
  /** Stable anchor ID: `{relativeFilePath}::{symbolPath}`. */
  id: string;
  kind: DocKind;
  name: string;
  /** Relative to project root, POSIX-style separators. */
  filePath: string;
  line: number;
  /** Full type signature as a string. */
  signature: string;
  description?: string;
  params?: DocParam[];
  returns?: DocReturn;
  throws?: string[];
  examples?: string[];
  deprecated?: string;
  since?: string;
  /** Any additional JSDoc tags not modeled above. */
  tags: Record<string, string>;
  isExported: boolean;
  isInternal: boolean;
  /** Whether the symbol's JSDoc block carries `@preserve`. */
  isPreserved: boolean;
  /** For classes/interfaces/enums: methods, properties, members. */
  children?: DocNode[];
}

export interface DocFile {
  filePath: string;
  /** From `@module` tag, if present. */
  moduleName?: string;
  /** Module-level comment description. */
  description?: string;
  nodes: DocNode[];
}

export interface DocProject {
  name: string;
  version: string;
  files: DocFile[];
  /** ISO-8601 timestamp. */
  generatedAt: string;
}
