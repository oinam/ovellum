import type { JSDocableNode, JSDoc, JSDocTag } from 'ts-morph';

export interface JsDocInfo {
  description?: string;
  /** Param name → description, from `@param`. */
  paramDescriptions: Record<string, string>;
  returnsDescription?: string;
  examples: string[];
  throws: string[];
  see: string[];
  deprecated?: string;
  since?: string;
  internal: boolean;
  preserved: boolean;
  /** Module-name from `@module`, only meaningful at file scope. */
  moduleName?: string;
  /** Any unrecognized tag → its raw comment text. */
  tags: Record<string, string>;
}

const KNOWN_TAGS = new Set([
  'param',
  'returns',
  'return',
  'throws',
  'exception',
  'example',
  'deprecated',
  'since',
  'see',
  'remarks',
  'description',
  'preserve',
  'internal',
  'module',
]);

export function emptyJsDocInfo(): JsDocInfo {
  return {
    paramDescriptions: {},
    examples: [],
    throws: [],
    see: [],
    internal: false,
    preserved: false,
    tags: {},
  };
}

export function extractJsDoc(node: JSDocableNode): JsDocInfo {
  const blocks = node.getJsDocs();
  if (blocks.length === 0) return emptyJsDocInfo();
  // Use the last JSDoc block (closest to the declaration).
  const block = blocks[blocks.length - 1]!;
  return parseBlock(block);
}

function parseBlock(block: JSDoc): JsDocInfo {
  const out = emptyJsDocInfo();
  const desc = block.getDescription().trim();
  if (desc) out.description = desc;

  for (const tag of block.getTags()) {
    consumeTag(tag, out);
  }
  return out;
}

function consumeTag(tag: JSDocTag, info: JsDocInfo): void {
  const name = tag.getTagName();
  const comment = readComment(tag);

  switch (name) {
    case 'param': {
      const paramName = readParamName(tag);
      if (paramName) info.paramDescriptions[paramName] = comment;
      return;
    }
    case 'returns':
    case 'return':
      info.returnsDescription = comment;
      return;
    case 'throws':
    case 'exception':
      if (comment) info.throws.push(comment);
      return;
    case 'example':
      if (comment) info.examples.push(comment);
      return;
    case 'deprecated':
      info.deprecated = comment || 'Deprecated.';
      return;
    case 'since':
      info.since = comment;
      return;
    case 'see':
      if (comment) info.see.push(comment);
      return;
    case 'internal':
      info.internal = true;
      return;
    case 'preserve':
      info.preserved = true;
      return;
    case 'module':
      info.moduleName = comment;
      return;
    case 'remarks':
    case 'description':
      // Merge into description if not already set.
      if (!info.description && comment) info.description = comment;
      return;
    default:
      if (!KNOWN_TAGS.has(name)) info.tags[name] = comment;
  }
}

function readComment(tag: JSDocTag): string {
  const raw = tag.getCommentText();
  // Strip a leading dash separator used by `@param name - description`.
  return (raw ?? '').replace(/^\s*-\s*/, '').trim();
}

function readParamName(tag: JSDocTag): string | undefined {
  // Try the typed accessor first; fall back to parsing the raw text.
  const node = tag.compilerNode as { name?: { getText?: () => string } };
  const named = node.name?.getText?.();
  if (named) return named;
  const text = tag.getText();
  const match = text.match(/@param\s+(?:\{[^}]*\}\s+)?([A-Za-z_$][\w$]*)/);
  return match ? match[1] : undefined;
}
