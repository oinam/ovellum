import type { DocNode, DocParam } from '@ovellum/core';

/** Render a single top-level node + any children to markdown. */
export function renderNode(node: DocNode): string {
  const parts: string[] = [];
  parts.push(headingFor(node));
  parts.push(anchorComment(node));
  parts.push(signatureBlock(node));

  if (node.deprecated) {
    parts.push(`> **Deprecated.** ${escapeInline(node.deprecated)}`);
  }
  if (node.description) {
    parts.push(node.description.trim());
  }
  if (node.since) {
    parts.push(`*Since: ${escapeInline(node.since)}*`);
  }

  if (node.params && node.params.length > 0) {
    parts.push('**Parameters**');
    parts.push(paramsTable(node.params));
  }

  if (node.returns && node.returns.type && node.returns.type !== 'void') {
    const desc = node.returns.description ? ` - ${node.returns.description}` : '';
    parts.push(`**Returns** \`${node.returns.type}\`${desc}`);
  }

  if (node.throws && node.throws.length > 0) {
    parts.push('**Throws**');
    for (const t of node.throws) parts.push(`- ${escapeInline(t)}`);
  }

  if (node.examples && node.examples.length > 0) {
    parts.push('**Example**');
    for (const ex of node.examples) parts.push(fence(ex.trim(), 'typescript'));
  }

  if (node.children && node.children.length > 0) {
    parts.push(renderChildren(node));
  }

  return parts.filter(Boolean).join('\n\n');
}

function renderChildren(parent: DocNode): string {
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
    sections.push(`#### Methods\n\n${buckets.method.map(renderMember).join('\n\n')}`);
  }
  if (buckets.other.length) {
    sections.push(buckets.other.map(renderMember).join('\n\n'));
  }
  return sections.join('\n\n');
}

function renderMember(node: DocNode): string {
  const parts: string[] = [];
  parts.push(`##### \`${node.name}\``);
  parts.push(anchorComment(node));
  parts.push(fence(node.signature, 'typescript'));
  if (node.description) parts.push(node.description.trim());
  if (node.params && node.params.length > 0) {
    parts.push(paramsTable(node.params));
  }
  if (node.returns && node.returns.type && node.returns.type !== 'void') {
    parts.push(`Returns \`${node.returns.type}\``);
  }
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
