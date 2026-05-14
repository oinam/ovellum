import type {
  ClassDeclaration,
  EnumDeclaration,
  FunctionDeclaration,
  InterfaceDeclaration,
  MethodDeclaration,
  ParameterDeclaration,
  PropertyDeclaration,
  SourceFile,
  TypeAliasDeclaration,
} from 'ts-morph';
import type { DocNode, DocParam, OvellumConfig } from '@ovellum/core';
import { anchorId } from './anchor.js';
import { extractJsDoc, type JsDocInfo } from './jsdoc.js';

interface ExtractorContext {
  relPath: string;
  config: OvellumConfig;
}

export function extractFromFile(sf: SourceFile, ctx: ExtractorContext): DocNode[] {
  return [
    ...sf.getFunctions().flatMap((fn) => fromFunction(fn, ctx)),
    ...sf.getClasses().flatMap((cls) => fromClass(cls, ctx)),
    ...sf.getInterfaces().flatMap((iface) => fromInterface(iface, ctx)),
    ...sf.getTypeAliases().flatMap((alias) => fromTypeAlias(alias, ctx)),
    ...sf.getEnums().flatMap((en) => fromEnum(en, ctx)),
  ];
}

function shouldInclude(isExported: boolean, jsdoc: JsDocInfo, ctx: ExtractorContext): boolean {
  if (!isExported && !ctx.config.includeInternal) return false;
  if (jsdoc.internal && !ctx.config.includeInternal) return false;
  return true;
}

function fromFunction(fn: FunctionDeclaration, ctx: ExtractorContext): DocNode[] {
  const name = fn.getName();
  if (!name) return [];
  const jsdoc = extractJsDoc(fn);
  const isExported = fn.isExported();
  if (!shouldInclude(isExported, jsdoc, ctx)) return [];

  const params = fn.getParameters().map((p) => paramToDoc(p, jsdoc));
  const returnTypeText = fn.getReturnTypeNode()?.getText() ?? fn.getReturnType().getText(fn);

  const signature = buildFunctionSignature({
    name,
    generics: fn.getTypeParameters().map((tp) => tp.getText()),
    params: fn.getParameters().map(paramSignaturePart),
    returnType: returnTypeText,
    isAsync: fn.isAsync(),
  });

  const node: DocNode = {
    id: anchorId(ctx.relPath, name),
    kind: 'function',
    name,
    filePath: ctx.relPath,
    line: fn.getStartLineNumber(),
    signature,
    isExported,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
    params,
    returns: {
      type: returnTypeText,
      description: jsdoc.returnsDescription,
    },
  };
  attachJsDocFields(node, jsdoc);
  return [node];
}

function fromClass(cls: ClassDeclaration, ctx: ExtractorContext): DocNode[] {
  const name = cls.getName();
  if (!name) return [];
  const jsdoc = extractJsDoc(cls);
  const isExported = cls.isExported();
  if (!shouldInclude(isExported, jsdoc, ctx)) return [];

  const heritage: string[] = [];
  const extendsClause = cls.getExtends();
  if (extendsClause) heritage.push(`extends ${extendsClause.getText()}`);
  const implementsClause = cls.getImplements();
  if (implementsClause.length > 0) {
    heritage.push(`implements ${implementsClause.map((i) => i.getText()).join(', ')}`);
  }
  const generics = cls.getTypeParameters().map((tp) => tp.getText());
  const gen = generics.length ? `<${generics.join(', ')}>` : '';
  const signature = `class ${name}${gen}${heritage.length ? ' ' + heritage.join(' ') : ''}`;

  const children: DocNode[] = [];
  for (const method of cls.getMethods()) {
    const childNode = fromMethod(method, ctx, name);
    if (childNode) children.push(childNode);
  }
  for (const prop of cls.getProperties()) {
    const childNode = fromProperty(prop, ctx, name);
    if (childNode) children.push(childNode);
  }

  const node: DocNode = {
    id: anchorId(ctx.relPath, name),
    kind: 'class',
    name,
    filePath: ctx.relPath,
    line: cls.getStartLineNumber(),
    signature,
    isExported,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
    children: children.length ? children : undefined,
  };
  attachJsDocFields(node, jsdoc);
  return [node];
}

function fromMethod(
  method: MethodDeclaration,
  ctx: ExtractorContext,
  className: string,
): DocNode | undefined {
  const name = method.getName();
  const jsdoc = extractJsDoc(method);
  const isStaticOrPublic =
    !method.hasModifier('private') || ctx.config.includePrivate || ctx.config.includeInternal;
  if (!isStaticOrPublic) return undefined;
  if (jsdoc.internal && !ctx.config.includeInternal) return undefined;

  const params = method.getParameters().map((p) => paramToDoc(p, jsdoc));
  const returnTypeText =
    method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText(method);
  const generics = method.getTypeParameters().map((tp) => tp.getText());
  const gen = generics.length ? `<${generics.join(', ')}>` : '';
  const signature = `${name}${gen}(${method.getParameters().map(paramSignaturePart).join(', ')}): ${returnTypeText}`;

  const node: DocNode = {
    id: anchorId(ctx.relPath, `${className}.${name}`),
    kind: 'method',
    name,
    filePath: ctx.relPath,
    line: method.getStartLineNumber(),
    signature,
    isExported: true,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
    params,
    returns: {
      type: returnTypeText,
      description: jsdoc.returnsDescription,
    },
  };
  attachJsDocFields(node, jsdoc);
  return node;
}

function fromProperty(
  prop: PropertyDeclaration,
  ctx: ExtractorContext,
  className: string,
): DocNode | undefined {
  const name = prop.getName();
  const jsdoc = extractJsDoc(prop);
  const isPrivate = prop.hasModifier('private');
  if (isPrivate && !ctx.config.includePrivate && !ctx.config.includeInternal) return undefined;
  if (jsdoc.internal && !ctx.config.includeInternal) return undefined;

  const typeText = prop.getTypeNode()?.getText() ?? prop.getType().getText(prop);
  const node: DocNode = {
    id: anchorId(ctx.relPath, `${className}.${name}`),
    kind: 'property',
    name,
    filePath: ctx.relPath,
    line: prop.getStartLineNumber(),
    signature: `${name}: ${typeText}`,
    isExported: true,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
  };
  attachJsDocFields(node, jsdoc);
  return node;
}

function fromInterface(iface: InterfaceDeclaration, ctx: ExtractorContext): DocNode[] {
  const name = iface.getName();
  const jsdoc = extractJsDoc(iface);
  const isExported = iface.isExported();
  if (!shouldInclude(isExported, jsdoc, ctx)) return [];

  const extendsList = iface.getExtends().map((e) => e.getText());
  const generics = iface.getTypeParameters().map((tp) => tp.getText());
  const gen = generics.length ? `<${generics.join(', ')}>` : '';
  const ext = extendsList.length ? ` extends ${extendsList.join(', ')}` : '';
  const signature = `interface ${name}${gen}${ext}`;

  const children: DocNode[] = [];
  for (const prop of iface.getProperties()) {
    const propJsdoc = extractJsDoc(prop);
    const propType = prop.getTypeNode()?.getText() ?? prop.getType().getText(prop);
    const optional = prop.hasQuestionToken() ? '?' : '';
    const propName = prop.getName();
    const propNode: DocNode = {
      id: anchorId(ctx.relPath, `${name}.${propName}`),
      kind: 'property',
      name: propName,
      filePath: ctx.relPath,
      line: prop.getStartLineNumber(),
      signature: `${propName}${optional}: ${propType}`,
      isExported: true,
      isInternal: propJsdoc.internal,
      isPreserved: propJsdoc.preserved,
      tags: propJsdoc.tags,
    };
    attachJsDocFields(propNode, propJsdoc);
    children.push(propNode);
  }
  for (const method of iface.getMethods()) {
    const methodJsdoc = extractJsDoc(method);
    const methodName = method.getName();
    const methodParams = method.getParameters().map(paramSignaturePart).join(', ');
    const methodReturn =
      method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText(method);
    const methodNode: DocNode = {
      id: anchorId(ctx.relPath, `${name}.${methodName}`),
      kind: 'method',
      name: methodName,
      filePath: ctx.relPath,
      line: method.getStartLineNumber(),
      signature: `${methodName}(${methodParams}): ${methodReturn}`,
      isExported: true,
      isInternal: methodJsdoc.internal,
      isPreserved: methodJsdoc.preserved,
      tags: methodJsdoc.tags,
      params: method.getParameters().map((p) => paramToDoc(p, methodJsdoc)),
      returns: { type: methodReturn, description: methodJsdoc.returnsDescription },
    };
    attachJsDocFields(methodNode, methodJsdoc);
    children.push(methodNode);
  }

  const node: DocNode = {
    id: anchorId(ctx.relPath, name),
    kind: 'interface',
    name,
    filePath: ctx.relPath,
    line: iface.getStartLineNumber(),
    signature,
    isExported,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
    children: children.length ? children : undefined,
  };
  attachJsDocFields(node, jsdoc);
  return [node];
}

function fromTypeAlias(alias: TypeAliasDeclaration, ctx: ExtractorContext): DocNode[] {
  const name = alias.getName();
  const jsdoc = extractJsDoc(alias);
  const isExported = alias.isExported();
  if (!shouldInclude(isExported, jsdoc, ctx)) return [];

  const generics = alias.getTypeParameters().map((tp) => tp.getText());
  const gen = generics.length ? `<${generics.join(', ')}>` : '';
  const typeText = alias.getTypeNode()?.getText() ?? alias.getType().getText(alias);

  const node: DocNode = {
    id: anchorId(ctx.relPath, name),
    kind: 'type',
    name,
    filePath: ctx.relPath,
    line: alias.getStartLineNumber(),
    signature: `type ${name}${gen} = ${typeText}`,
    isExported,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
  };
  attachJsDocFields(node, jsdoc);
  return [node];
}

function fromEnum(en: EnumDeclaration, ctx: ExtractorContext): DocNode[] {
  const name = en.getName();
  const jsdoc = extractJsDoc(en);
  const isExported = en.isExported();
  if (!shouldInclude(isExported, jsdoc, ctx)) return [];

  const children: DocNode[] = en.getMembers().map((member) => {
    const memberJsdoc = extractJsDoc(member);
    const memberName = member.getName();
    const value = member.getInitializer()?.getText();
    const sigBody = value !== undefined ? `${memberName} = ${value}` : memberName;
    const memberNode: DocNode = {
      id: anchorId(ctx.relPath, `${name}.${memberName}`),
      kind: 'property',
      name: memberName,
      filePath: ctx.relPath,
      line: member.getStartLineNumber(),
      signature: sigBody,
      isExported: true,
      isInternal: memberJsdoc.internal,
      isPreserved: memberJsdoc.preserved,
      tags: memberJsdoc.tags,
    };
    attachJsDocFields(memberNode, memberJsdoc);
    return memberNode;
  });

  const node: DocNode = {
    id: anchorId(ctx.relPath, name),
    kind: 'enum',
    name,
    filePath: ctx.relPath,
    line: en.getStartLineNumber(),
    signature: `enum ${name}`,
    isExported,
    isInternal: jsdoc.internal,
    isPreserved: jsdoc.preserved,
    tags: jsdoc.tags,
    children,
  };
  attachJsDocFields(node, jsdoc);
  return [node];
}

function paramSignaturePart(p: ParameterDeclaration): string {
  const name = p.getName();
  const type = paramTypeText(p);
  const optional = p.hasQuestionToken() ? '?' : '';
  const rest = p.isRestParameter() ? '...' : '';
  const init = p.getInitializer()?.getText();
  return init
    ? `${rest}${name}${optional}: ${type} = ${init}`
    : `${rest}${name}${optional}: ${type}`;
}

function paramTypeText(p: ParameterDeclaration): string {
  return p.getTypeNode()?.getText() ?? p.getType().getText(p);
}

function paramToDoc(p: ParameterDeclaration, jsdoc: JsDocInfo): DocParam {
  const name = p.getName();
  const defaultValue = p.getInitializer()?.getText();
  const description = jsdoc.paramDescriptions[name];
  const out: DocParam = {
    name,
    type: paramTypeText(p),
    optional: p.hasQuestionToken() || p.isRestParameter() || defaultValue !== undefined,
  };
  if (defaultValue !== undefined) out.defaultValue = defaultValue;
  if (description !== undefined) out.description = description;
  return out;
}

function buildFunctionSignature(opts: {
  name: string;
  generics: string[];
  params: string[];
  returnType: string;
  isAsync: boolean;
}): string {
  const gen = opts.generics.length ? `<${opts.generics.join(', ')}>` : '';
  const asyncKw = opts.isAsync ? 'async ' : '';
  return `${asyncKw}function ${opts.name}${gen}(${opts.params.join(', ')}): ${opts.returnType}`;
}

function attachJsDocFields(node: DocNode, jsdoc: JsDocInfo): void {
  if (jsdoc.description) node.description = jsdoc.description;
  if (jsdoc.examples.length) node.examples = jsdoc.examples;
  if (jsdoc.throws.length) node.throws = jsdoc.throws;
  if (jsdoc.deprecated) node.deprecated = jsdoc.deprecated;
  if (jsdoc.since) node.since = jsdoc.since;
}
