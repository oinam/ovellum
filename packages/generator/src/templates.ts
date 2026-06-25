import type { DocNode, DocParam } from '@ovellum/core';

export interface RenderOptions {
  /**
   * When true, a `@preserve`-tagged symbol's body is wrapped in a `@manual`
   * protected zone so the hybrid merge engine keeps it across regeneration
   * (A5). Only meaningful in hybrid mode — auto rebuilds fully each time, so
   * the wrap would be misleading there.
   */
  wrapPreserved?: boolean;
}

/** Render a single top-level node + any children to markdown. */
export function renderNode(node: DocNode, opts: RenderOptions = {}): string {
  const parts: string[] = [];
  parts.push(headingFor(node));
  parts.push(anchorComment(node));

  const body: string[] = [];
  body.push(signatureBlock(node));
  if (node.deprecated) {
    body.push(`> **Deprecated.** ${escapeInline(node.deprecated)}`);
  }
  if (node.description) {
    body.push(node.description.trim());
  }
  if (node.since) {
    body.push(`*Since: ${escapeInline(node.since)}*`);
  }
  if (node.params && node.params.length > 0) {
    body.push('**Parameters**');
    body.push(paramsTable(node.params));
  }
  if (node.returns && node.returns.type && node.returns.type !== 'void') {
    const desc = node.returns.description ? ` - ${node.returns.description}` : '';
    body.push(`**Returns** \`${node.returns.type}\`${desc}`);
  }
  if (node.throws && node.throws.length > 0) {
    body.push('**Throws**');
    for (const t of node.throws) body.push(`- ${escapeInline(t)}`);
  }
  if (node.examples && node.examples.length > 0) {
    body.push('**Example**');
    for (const ex of node.examples) body.push(fence(ex.trim(), 'typescript'));
  }
  parts.push(wrapPreserved(node, body, opts));

  if (node.children && node.children.length > 0) {
    parts.push(renderChildren(node, opts));
  }

  return parts.filter(Boolean).join('\n\n');
}

/**
 * Join a node's body parts, wrapping them in a `@manual` protected zone keyed
 * by the node's anchor id when the symbol is `@preserve`-tagged and wrapping is
 * enabled. The zone seeds the generated content on first build; thereafter the
 * merge engine keeps whatever the author edited inside it.
 */
function wrapPreserved(node: DocNode, body: string[], opts: RenderOptions): string {
  const joined = body.filter(Boolean).join('\n\n');
  if (!joined) return '';
  if (opts.wrapPreserved && node.isPreserved) {
    return `<!-- @manual:start id="${node.id}" -->\n${joined}\n<!-- @manual:end -->`;
  }
  return joined;
}

function renderChildren(parent: DocNode, opts: RenderOptions): string {
  const buckets = {
    method: [] as DocNode[],
    property: [] as DocNode[],
    other: [] as DocNode[],
  };
  for (const child of parent.children ?? []) {
    if (child.kind === 'method') buckets.method.push(child);
    else if (child.kind === 'property') buckets.property.push(child);
    else buckets.other.push(child);
  }

  const sections: string[] = [];
  if (buckets.property.length) {
    sections.push(`#### Properties\n\n${membersTable(buckets.property)}`);
  }
  if (buckets.method.length) {
    sections.push(`#### Methods\n\n${buckets.method.map((m) => renderMember(m, opts)).join('\n\n')}`);
  }
  if (buckets.other.length) {
    sections.push(buckets.other.map((m) => renderMember(m, opts)).join('\n\n'));
  }
  return sections.join('\n\n');
}

function renderMember(node: DocNode, opts: RenderOptions): string {
  const parts: string[] = [];
  parts.push(`##### \`${node.name}\``);
  parts.push(anchorComment(node));
  const body: string[] = [];
  body.push(fence(node.signature, 'typescript'));
  if (node.description) body.push(node.description.trim());
  if (node.params && node.params.length > 0) {
    body.push(paramsTable(node.params));
  }
  if (node.returns && node.returns.type && node.returns.type !== 'void') {
    body.push(`Returns \`${node.returns.type}\``);
  }
  parts.push(wrapPreserved(node, body, opts));
  return parts.filter(Boolean).join('\n\n');
}

function headingFor(node: DocNode): string {
  return `## \`${node.name}\``;
}

function signatureBlock(node: DocNode): string {
  return fence(node.signature, 'typescript');
}

function paramsTable(params: DocParam[]): string {
  const head = '| Name | Type | Description |\n| --- | --- | --- |';
  const rows = params.map((p) => {
    const name = `\`${p.name}${p.optional ? '?' : ''}\``;
    const type = `\`${escapePipe(p.type)}\``;
    const desc = p.description ? escapeInline(p.description) : '';
    const def =
      p.defaultValue !== undefined ? ` *(default: \`${escapePipe(p.defaultValue)}\`)*` : '';
    return `| ${name} | ${type} | ${desc}${def} |`;
  });
  return [head, ...rows].join('\n');
}

function membersTable(props: DocNode[]): string {
  const head = '| Name | Type | Description |\n| --- | --- | --- |';
  const rows = props.map((p) => {
    const type = signatureTypeOnly(p.signature, p.name);
    const desc = p.description ? escapeInline(p.description) : '';
    return `| \`${p.name}\` | \`${escapePipe(type)}\` | ${desc} |`;
  });
  return [head, ...rows].join('\n');
}

function signatureTypeOnly(signature: string, name: string): string {
  // `name: T` or `name?: T` — strip the name + colon.
  const colonMatch = signature.match(new RegExp(`^${escapeRegex(name)}\\??\\s*:\\s*(.+)$`));
  if (colonMatch) return colonMatch[1]!.trim();
  // `name = value` — enum-member shape; show the value as the column body.
  const eqMatch = signature.match(new RegExp(`^${escapeRegex(name)}\\s*=\\s*(.+)$`));
  if (eqMatch) return eqMatch[1]!.trim();
  return signature;
}

function anchorComment(node: DocNode): string {
  return `<!-- ovellum:anchor id="${node.id}" generated="${new Date().toISOString()}" -->`;
}

function fence(content: string, lang: string): string {
  return '```' + lang + '\n' + content + '\n```';
}

function escapeInline(s: string): string {
  return s.replace(/\n+/g, ' ').trim();
}

function escapePipe(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
