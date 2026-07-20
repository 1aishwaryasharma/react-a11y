import ts from 'typescript';

export type AttrValue =
  | { kind: 'static'; value: string | number | boolean | null | undefined; attrNode?: ts.JsxAttribute }
  | { kind: 'expression'; text: string; node?: ts.Expression; attrNode?: ts.JsxAttribute };

export interface SourceLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

/**
 * Normalized JSX element. This is the platform-agnostic surface rules are
 * written against — the same model backs React DOM, Next.js and React Native.
 */
export interface ElementNode {
  /** Tag as written: "img", "Image", "Animated.View" */
  name: string;
  /** True for components (uppercase / member expressions), false for DOM tags. */
  isComponent: boolean;
  /** Original exported component name, preserving aliases and namespaces. */
  importName: string | null;
  /** Module the component's root identifier was imported from, if resolvable. */
  importSource: string | null;
  attrs: Map<string, AttrValue>;
  hasSpread: boolean;
  parent: ElementNode | null;
  childElements: ElementNode[];
  /** Direct non-whitespace JSX text child. */
  hasTextChild: boolean;
  /** Concatenated direct JSX text, whitespace-collapsed. */
  directText: string;
  /** Direct `{expression}` child. */
  hasExpressionChild: boolean;
  selfClosing: boolean;
  loc: SourceLocation;
}

export interface FileModel {
  elements: ElementNode[];
  imports: Map<string, string>;
  sourceFile: ts.SourceFile;
}

interface ImportBinding {
  importedName: string;
  source: string;
}

function collectImports(sf: ts.SourceFile): Map<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const source = stmt.moduleSpecifier.text;
    const clause = stmt.importClause;
    if (!clause) continue;
    if (clause.name) bindings.set(clause.name.text, { importedName: 'default', source });
    const namedBindings = clause.namedBindings;
    if (namedBindings) {
      if (ts.isNamespaceImport(namedBindings)) {
        // Preserve the namespace marker; the JSX tag supplies the export name.
        bindings.set(namedBindings.name.text, { importedName: '*', source });
      } else {
        for (const spec of namedBindings.elements) {
          const importedName = spec.propertyName?.text ?? spec.name.text;
          bindings.set(spec.name.text, { importedName, source });
        }
      }
    }
  }
  return bindings;
}

/** Static classification of an expression node. */
export type StaticExpression =
  | { kind: 'value'; value: string | number | boolean | bigint | null | undefined }
  | { kind: 'composite' }
  | { kind: 'unknown' };

/**
 * Classify an expression as a statically-known primitive value, a composite
 * (object/array) literal, or statically unknowable. The single decoder behind
 * attribute values and object-literal property checks.
 */
export function staticExpression(node: ts.Expression): StaticExpression {
  if (ts.isStringLiteralLike(node)) return { kind: 'value', value: node.text };
  if (ts.isNumericLiteral(node)) return { kind: 'value', value: Number(node.text) };
  if (ts.isBigIntLiteral(node)) return { kind: 'value', value: BigInt(node.text.slice(0, -1)) };
  if (node.kind === ts.SyntaxKind.TrueKeyword) return { kind: 'value', value: true };
  if (node.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'value', value: false };
  if (node.kind === ts.SyntaxKind.NullKeyword) return { kind: 'value', value: null };
  if (ts.isIdentifier(node)) {
    return node.text === 'undefined' ? { kind: 'value', value: undefined } : { kind: 'unknown' };
  }
  if (ts.isVoidExpression(node)) return { kind: 'value', value: undefined };
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken)
  ) {
    const negate = node.operator === ts.SyntaxKind.MinusToken;
    const operand = staticExpression(node.operand);
    if (operand.kind === 'value' && typeof operand.value === 'number') {
      return { kind: 'value', value: negate ? -operand.value : operand.value };
    }
    if (operand.kind === 'value' && typeof operand.value === 'bigint') {
      return { kind: 'value', value: negate ? -operand.value : operand.value };
    }
    return { kind: 'unknown' };
  }
  if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
    return { kind: 'composite' };
  }
  return { kind: 'unknown' };
}

function attrValue(init: ts.JsxAttribute['initializer']): AttrValue {
  if (init === undefined) return { kind: 'static', value: true };
  if (ts.isStringLiteral(init)) return { kind: 'static', value: init.text };
  if (ts.isJsxExpression(init)) {
    const expr = init.expression;
    if (!expr) return { kind: 'expression', text: '' };
    const literal = staticExpression(expr);
    if (literal.kind === 'value' && typeof literal.value !== 'bigint') {
      return { kind: 'static', value: literal.value };
    }
    return { kind: 'expression', text: expr.getText(), node: expr };
  }
  return { kind: 'expression', text: init.getText() };
}

function rootIdentifier(tag: ts.JsxTagNameExpression): string {
  let node: ts.Node = tag;
  while (ts.isPropertyAccessExpression(node)) node = node.expression;
  return ts.isIdentifier(node) ? node.text : node.getText();
}

function componentImportName(
  tag: ts.JsxTagNameExpression,
  root: string,
  binding: ImportBinding | undefined,
): string | null {
  if (!binding) return null;
  if (binding.importedName === 'default') return root;
  if (binding.importedName !== '*') return binding.importedName;
  return tag.getText().split('.').at(-1) ?? null;
}

export function buildFileModel(sf: ts.SourceFile): FileModel {
  const bindings = collectImports(sf);
  const imports = new Map([...bindings].map(([local, binding]) => [local, binding.source]));
  const elements: ElementNode[] = [];

  function makeElement(
    opening: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    parent: ElementNode | null,
    selfClosing: boolean,
  ): ElementNode {
    const name = opening.tagName.getText(sf);
    const root = rootIdentifier(opening.tagName);
    const isComponent =
      ts.isPropertyAccessExpression(opening.tagName) || !/^[a-z]/.test(name);
    const binding = isComponent ? bindings.get(root) : undefined;
    const attrs = new Map<string, AttrValue>();
    let hasSpread = false;
    for (const prop of opening.attributes.properties) {
      if (ts.isJsxSpreadAttribute(prop)) {
        hasSpread = true;
      } else if (ts.isJsxAttribute(prop)) {
        const value = attrValue(prop.initializer);
        value.attrNode = prop;
        attrs.set(prop.name.getText(sf), value);
      }
    }
    const start = sf.getLineAndCharacterOfPosition(opening.getStart(sf));
    const end = sf.getLineAndCharacterOfPosition(opening.getEnd());
    const el: ElementNode = {
      attrs,
      childElements: [],
      directText: '',
      hasExpressionChild: false,
      hasSpread,
      hasTextChild: false,
      importName: isComponent
        ? componentImportName(opening.tagName, root, binding)
        : null,
      importSource: binding?.source ?? null,
      isComponent,
      loc: {
        column: start.character + 1,
        endColumn: end.character + 1,
        endLine: end.line + 1,
        line: start.line + 1,
      },
      name,
      parent,
      selfClosing,
    };
    if (parent) parent.childElements.push(el);
    elements.push(el);
    return el;
  }

  function markDirectChildren(children: ts.NodeArray<ts.JsxChild>, el: ElementNode): void {
    const textParts: string[] = [];
    for (const child of children) {
      if (ts.isJsxText(child)) {
        const text = child.text.replace(/\s+/g, ' ').trim();
        if (text.length > 0) {
          el.hasTextChild = true;
          textParts.push(text);
        }
      } else if (ts.isJsxExpression(child) && child.expression !== undefined) {
        if (ts.isStringLiteralLike(child.expression)) {
          // {"literal"} children are still static text
          const text = child.expression.text.replace(/\s+/g, ' ').trim();
          if (text.length > 0) {
            el.hasTextChild = true;
            textParts.push(text);
          }
        } else {
          el.hasExpressionChild = true;
        }
      }
    }
    el.directText = textParts.join(' ');
  }

  function visit(node: ts.Node, parentEl: ElementNode | null): void {
    let nextParent = parentEl;
    if (ts.isJsxElement(node)) {
      const el = makeElement(node.openingElement, parentEl, false);
      markDirectChildren(node.children, el);
      nextParent = el;
    } else if (ts.isJsxSelfClosingElement(node)) {
      nextParent = makeElement(node, parentEl, true);
    }
    node.forEachChild((c) => visit(c, nextParent));
  }

  visit(sf, null);
  return { elements, imports, sourceFile: sf };
}

export function walkDescendants(el: ElementNode, cb: (child: ElementNode) => void): void {
  for (const child of el.childElements) {
    cb(child);
    walkDescendants(child, cb);
  }
}

export function findAncestor(
  el: ElementNode,
  predicate: (ancestor: ElementNode) => boolean,
): ElementNode | null {
  let cur = el.parent;
  while (cur) {
    if (predicate(cur)) return cur;
    cur = cur.parent;
  }
  return null;
}
