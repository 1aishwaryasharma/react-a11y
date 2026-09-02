/**
 * The "effective style" of an element as far as static analysis can tell:
 * Tailwind utility classes (className / twrnc `tw`), merged with inline
 * `style` literals. Every rule that reasons about size, color or focus
 * styling goes through this module so NativeWind, Uniwind, twrnc and plain
 * Tailwind projects get the same checks as inline-styled ones.
 */
import ts from 'typescript';
import type { AttrValue, ElementNode } from './element.js';
import { staticExpression } from './element.js';
import type { ProjectInfo } from './project.js';
import type { Severity } from './types.js';
import { contrastRatio, isLargeText, parseColor } from './color.js';
import {
  applyUtility,
  isContrastExemptLayer,
  splitVariantsPublic,
  type TailwindOptions,
  type TailwindStyle,
} from './tailwind.js';

/** Style props we read from inline `style` object literals. */
const INLINE_PROPS: Array<keyof TailwindStyle> = [
  'width', 'height', 'minWidth', 'minHeight', 'maxHeight', 'color', 'backgroundColor',
  'fontSize', 'fontWeight', 'opacity',
];

export interface StyleModel {
  /**
   * Resolved class layers keyed by variant (`''`, `dark`, `sm:hover`) and
   * conditional set (`#2`, `#2|dark`). Conditional keys come from ternaries,
   * `&&` guards, object maps and template holes in the class expression.
   */
  layers: Map<string, TailwindStyle>;
  /** Inline literal style props; always win over classes. */
  inline: TailwindStyle;
  /**
   * True when a non-literal inline style (StyleSheet reference, spread,
   * identifier) could override anything we resolved — treat results as unknown.
   */
  dynamic: boolean;
  /** True when part of the class expression could not be read (e.g. `cn(base, props.className)`). */
  unknownClasses: boolean;
  /**
   * Where a conditional layer came from when it has a nameable source — a
   * `cva()` variant value such as `size.icon`. Lets a rule anchor a finding
   * on the variant definition instead of on every element that uses it.
   */
  origins: Map<string, LayerOrigin>;
}

export interface LayerOrigin {
  /** Human name for the source, e.g. `size.icon`. */
  label: string;
  /** The expression that supplied the classes. */
  node: ts.Node;
}

interface ClassSource {
  text: string;
  /** Conditional-set id (`#n`), or '' when the classes always apply. */
  condition: string;
}

interface ClassCollector {
  sources: ClassSource[];
  unknown: boolean;
  nextId: number;
  origins: Map<string, LayerOrigin>;
  /** File the expression came from; lets identifiers resolve to their initializer. */
  sourceFile?: ts.SourceFile;
  /** Identifiers currently being expanded, to stop a cyclic `const a = b`. */
  expanding: Set<string>;
}

/** Tagged-template tags and call names whose arguments are class strings. */
const CLASS_TAGS = new Set(['tw', 'twrnc', 'tailwind', 'style']);

/** How deep a chain of class constants we follow. */
const MAX_CONST_DEPTH = 6;

const CONSTANTS = new WeakMap<ts.SourceFile, Map<string, ts.Expression | null>>();

/**
 * Every `const x = …` in a file, by name. A name declared more than once is
 * ambiguous without a type checker (an inner scope may shadow an outer one),
 * so it maps to `null` and resolves to nothing. This is what lets a hoisted
 * `const base = 'h-10 w-10'` used as `className={base}` be read at all.
 */
function fileConstants(sf: ts.SourceFile): Map<string, ts.Expression | null> {
  const cached = CONSTANTS.get(sf);
  if (cached) return cached;
  const map = new Map<string, ts.Expression | null>();
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      map.set(node.name.text, map.has(node.name.text) ? null : node.initializer);
    }
    node.forEachChild(visit);
  };
  visit(sf);
  CONSTANTS.set(sf, map);
  return map;
}

/** `tw\`…\``, `tw(…)`, `tw.style(…)` — calls whose arguments are class strings. */
function isClassCall(expr: ts.CallExpression): boolean {
  const callee = expr.expression;
  if (ts.isIdentifier(callee)) return CLASS_TAGS.has(callee.text);
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return CLASS_TAGS.has(callee.expression.text) && CLASS_TAGS.has(callee.name.text);
  }
  return false;
}

/** Variant-table factories: class-variance-authority's `cva`, tailwind-variants' `tv`. */
const VARIANT_FACTORIES = new Set(['cva', 'tv']);

function isVariantFactory(expr: ts.Expression): expr is ts.CallExpression {
  return ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && VARIANT_FACTORIES.has(expr.expression.text);
}

function propertyNamed(obj: ts.ObjectLiteralExpression, name: string): ts.Expression | undefined {
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : undefined;
    if (key === name) return prop.initializer;
  }
  return undefined;
}

/** What a call site passed for each variant group: a literal choice, or something we cannot read. */
type VariantSelection = Map<string, string | 'dynamic'>;

function readSelection(arg: ts.Expression | undefined): { selection: VariantSelection; spread: boolean; className?: ts.Expression } {
  const selection: VariantSelection = new Map();
  if (arg === undefined) return { selection, spread: false };
  if (!ts.isObjectLiteralExpression(arg)) return { selection, spread: true };
  let spread = false;
  let className: ts.Expression | undefined;
  for (const prop of arg.properties) {
    if (ts.isSpreadAssignment(prop)) {
      spread = true;
      continue;
    }
    const name = (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop))
      && (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name))
      ? prop.name.text
      : undefined;
    if (name === undefined) {
      spread = true;
      continue;
    }
    if (name === 'className' || name === 'class') {
      className = ts.isPropertyAssignment(prop) ? prop.initializer : (prop as ts.ShorthandPropertyAssignment).name;
      continue;
    }
    const value = ts.isPropertyAssignment(prop) ? staticExpression(prop.initializer) : { kind: 'unknown' as const };
    selection.set(name, value.kind === 'value' && typeof value.value === 'string' ? value.value : 'dynamic');
  }
  return { selection, spread, className };
}

/**
 * Expand `buttonVariants({ size })` through its `cva()` / `tv()` definition:
 * the base classes always apply; a variant group the call pins to a literal
 * applies unconditionally; a group left dynamic contributes every one of its
 * values as its own conditional layer (never merged with each other); and an
 * omitted group falls back to `defaultVariants`. This is the entire
 * shadcn-for-React-Native authoring style, so without it a 40pt icon button
 * defined as `size: { icon: 'h-10 w-10' }` is invisible.
 */
function expandVariantDefinition(
  def: ts.CallExpression,
  callArg: ts.Expression | undefined,
  condition: string,
  out: ClassCollector,
): void {
  const [first, second] = def.arguments;
  // cva(base, config) versus tv({ base, ...config })
  const tvShape = first !== undefined && ts.isObjectLiteralExpression(first) && second === undefined;
  const config = tvShape ? first : second;
  const base = tvShape ? propertyNamed(first as ts.ObjectLiteralExpression, 'base') : first;
  if (base) collectClassExpression(base, condition, out);
  if (!config || !ts.isObjectLiteralExpression(config)) {
    if (config) out.unknown = true;
    return;
  }
  const { selection, spread, className } = readSelection(callArg);
  if (className) collectClassExpression(className, condition, out);

  const defaults = propertyNamed(config, 'defaultVariants');
  const defaultFor = (group: string): string | undefined => {
    if (!defaults || !ts.isObjectLiteralExpression(defaults)) return undefined;
    const value = propertyNamed(defaults, group);
    const literal = value ? staticExpression(value) : undefined;
    return literal?.kind === 'value' && typeof literal.value === 'string' ? literal.value : undefined;
  };

  const variants = propertyNamed(config, 'variants');
  if (variants && ts.isObjectLiteralExpression(variants)) {
    for (const group of variants.properties) {
      if (!ts.isPropertyAssignment(group) || !(ts.isIdentifier(group.name) || ts.isStringLiteral(group.name))) continue;
      const groupName = group.name.text;
      if (!ts.isObjectLiteralExpression(group.initializer)) continue;
      const chosen = selection.get(groupName) ?? (spread ? 'dynamic' : defaultFor(groupName));
      for (const option of group.initializer.properties) {
        if (!ts.isPropertyAssignment(option)) continue;
        const optionName = ts.isIdentifier(option.name) || ts.isStringLiteral(option.name) || ts.isNumericLiteral(option.name)
          ? option.name.text
          : undefined;
        if (optionName === undefined) continue;
        if (chosen !== undefined && chosen !== 'dynamic') {
          if (chosen === optionName) collectClassExpression(option.initializer, condition, out);
          continue;
        }
        if (chosen === undefined) continue; // group omitted with no default: the variant is off
        const id = `#${out.nextId++}`;
        out.origins.set(id, { label: `${groupName}.${optionName}`, node: option.initializer });
        collectClassExpression(option.initializer, id, out);
      }
    }
  }

  const compound = propertyNamed(config, 'compoundVariants');
  if (compound && ts.isArrayLiteralExpression(compound)) {
    for (const entry of compound.elements) {
      if (!ts.isObjectLiteralExpression(entry)) continue;
      const classes = propertyNamed(entry, 'class') ?? propertyNamed(entry, 'className');
      if (classes) collectClassExpression(classes, `#${out.nextId++}`, out);
    }
  }
}

/** `Platform.select({ ios: …, android: … })`. */
function isSelectCall(expr: ts.CallExpression): boolean {
  const callee = expr.expression;
  return ts.isPropertyAccessExpression(callee)
    && callee.name.text === 'select'
    && ts.isIdentifier(callee.expression)
    && callee.expression.text === 'Platform';
}

function collectClassExpression(expr: ts.Expression, condition: string, out: ClassCollector): void {
  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)
    || ts.isSatisfiesExpression(expr) || ts.isTypeAssertionExpression(expr)) {
    collectClassExpression(expr.expression, condition, out);
    return;
  }
  if (ts.isStringLiteralLike(expr)) {
    out.sources.push({ text: expr.text, condition });
    return;
  }
  if (ts.isTemplateExpression(expr)) {
    out.sources.push({ text: expr.head.text, condition });
    for (const span of expr.templateSpans) {
      collectClassExpression(span.expression, `#${out.nextId++}`, out);
      out.sources.push({ text: span.literal.text, condition });
    }
    return;
  }
  if (ts.isConditionalExpression(expr)) {
    collectClassExpression(expr.whenTrue, `#${out.nextId++}`, out);
    collectClassExpression(expr.whenFalse, `#${out.nextId++}`, out);
    return;
  }
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind;
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) {
      collectClassExpression(expr.right, `#${out.nextId++}`, out);
      return;
    }
    if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) {
      collectClassExpression(expr.left, `#${out.nextId++}`, out);
      collectClassExpression(expr.right, `#${out.nextId++}`, out);
      return;
    }
    if (op === ts.SyntaxKind.PlusToken) {
      collectClassExpression(expr.left, condition, out);
      collectClassExpression(expr.right, condition, out);
      return;
    }
    out.unknown = true;
    return;
  }
  if (ts.isCallExpression(expr)) {
    if (isSelectCall(expr)) {
      // Platform.select({ ios: 'text-sm', android: 'text-xs' }) — the branch
      // VALUES are the classes; the keys are platform names, not utilities.
      for (const arg of expr.arguments) {
        if (!ts.isObjectLiteralExpression(arg)) {
          collectClassExpression(arg, condition, out);
          continue;
        }
        for (const prop of arg.properties) {
          if (ts.isPropertyAssignment(prop)) collectClassExpression(prop.initializer, `#${out.nextId++}`, out);
          else out.unknown = true;
        }
      }
      return;
    }
    if (ts.isIdentifier(expr.expression) && out.sourceFile) {
      const definition = fileConstants(out.sourceFile).get(expr.expression.text);
      if (definition && isVariantFactory(definition) && !out.expanding.has(expr.expression.text)) {
        out.expanding.add(expr.expression.text);
        expandVariantDefinition(definition, expr.arguments[0], condition, out);
        out.expanding.delete(expr.expression.text);
        return;
      }
    }
    // cn(), clsx(), twMerge(), classNames(), tw() — every string argument is a
    // class source, regardless of the helper's name.
    for (const arg of expr.arguments) collectClassExpression(arg, condition, out);
    return;
  }
  if (ts.isIdentifier(expr) && out.sourceFile && out.expanding.size < MAX_CONST_DEPTH) {
    const initializer = fileConstants(out.sourceFile).get(expr.text);
    if (initializer && !out.expanding.has(expr.text)) {
      out.expanding.add(expr.text);
      collectClassExpression(initializer, condition, out);
      out.expanding.delete(expr.text);
      return;
    }
  }
  if (ts.isTaggedTemplateExpression(expr)) {
    collectClassExpression(expr.template, condition, out);
    return;
  }
  if (ts.isArrayLiteralExpression(expr)) {
    for (const item of expr.elements) collectClassExpression(item, condition, out);
    return;
  }
  if (ts.isObjectLiteralExpression(expr)) {
    // clsx-style { 'text-red-500': hasError }
    for (const prop of expr.properties) {
      if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
        const name = ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name) ? prop.name.text : undefined;
        if (name !== undefined) out.sources.push({ text: name, condition: `#${out.nextId++}` });
        else out.unknown = true;
      } else {
        out.unknown = true;
      }
    }
    return;
  }
  const literal = staticExpression(expr);
  if (literal.kind === 'value') return; // null/undefined/false contribute nothing
  out.unknown = true;
}

function classSourcesOf(attr: AttrValue | undefined, out: ClassCollector): void {
  if (!attr) return;
  if (attr.kind === 'static') {
    if (typeof attr.value === 'string') out.sources.push({ text: attr.value, condition: '' });
    return;
  }
  if (!attr.node) {
    out.unknown = true;
    return;
  }
  out.sourceFile ??= attr.node.getSourceFile();
  collectClassExpression(attr.node, '', out);
}

function readInlineObject(node: ts.ObjectLiteralExpression, into: TailwindStyle, known: Set<string>): boolean {
  let complete = true;
  for (const p of node.properties) {
    if (ts.isSpreadAssignment(p)) {
      complete = false;
      continue;
    }
    if (!ts.isPropertyAssignment(p)) {
      if (ts.isShorthandPropertyAssignment(p)) complete = false;
      continue;
    }
    const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
    if (!name || !(INLINE_PROPS as string[]).includes(name)) continue;
    const literal = staticExpression(p.initializer);
    const key = name as keyof TailwindStyle;
    if (literal.kind === 'value' && (typeof literal.value === 'string' || typeof literal.value === 'number')) {
      (into as Record<string, unknown>)[key] = literal.value;
      known.add(name);
    } else {
      (into as Record<string, unknown>)[key] = null; // dynamic value for this prop
      known.add(name);
    }
  }
  return complete;
}

/**
 * Read a `style` attribute: object literals contribute inline props, twrnc
 * `tw\`…\`` templates contribute classes, arrays are read in order (later
 * entries win), and anything else marks the style dynamic.
 */
function readStyleAttr(el: ElementNode, model: StyleModel, classes: ClassCollector): void {
  const attr = el.attrs.get('style');
  if (!attr) return;
  if (attr.kind === 'static') {
    if (attr.value != null && attr.value !== false) model.dynamic = true;
    return;
  }
  if (!attr.node) {
    model.dynamic = true;
    return;
  }
  const known = new Set<string>();
  const visit = (node: ts.Expression): void => {
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
      visit(node.expression);
      return;
    }
    if (ts.isObjectLiteralExpression(node)) {
      if (!readInlineObject(node, model.inline, known)) model.dynamic = true;
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const item of node.elements) visit(item);
      return;
    }
    if (ts.isTaggedTemplateExpression(node) && ts.isIdentifier(node.tag) && CLASS_TAGS.has(node.tag.text)) {
      classes.sourceFile ??= node.getSourceFile();
      collectClassExpression(node.template, '', classes);
      return;
    }
    if (ts.isCallExpression(node) && isClassCall(node)) {
      for (const arg of node.arguments) collectClassExpression(arg, '', classes);
      return;
    }
    const literal = staticExpression(node);
    if (literal.kind === 'value' && (literal.value == null || literal.value === false)) return;
    // A StyleSheet reference or expression may set anything: earlier literals
    // and every class are now unknown, but literals that follow it still win.
    model.dynamic = true;
    model.inline = {};
  };
  visit(attr.node);
}

/** Attributes whose value is a Tailwind class string. */
const CLASS_ATTRS = ['className', 'class'];

/**
 * Build the style model for an element. Class resolution only happens when
 * the project has Tailwind options; otherwise only inline styles are read.
 */
export function styleModel(el: ElementNode, project: ProjectInfo | undefined): StyleModel {
  const model: StyleModel = { layers: new Map(), inline: {}, dynamic: false, unknownClasses: false, origins: new Map() };
  const classes: ClassCollector = { sources: [], unknown: false, nextId: 1, expanding: new Set(), origins: model.origins };
  const tailwind = project?.tailwind;
  if (tailwind) {
    for (const name of CLASS_ATTRS) classSourcesOf(el.attrs.get(name), classes);
  }
  readStyleAttr(el, model, classes);
  if (tailwind) {
    for (const source of classes.sources) applyClassSource(model.layers, source, tailwind);
    model.unknownClasses = classes.unknown;
  } else if (classes.sources.length > 0) {
    // tw`…` without Tailwind configured — the classes decide the style, but we can't read them.
    model.dynamic = true;
  }
  return model;
}

function applyClassSource(layers: Map<string, TailwindStyle>, source: ClassSource, options: TailwindOptions): void {
  for (const token of source.text.split(/\s+/)) {
    if (!token) continue;
    const { variants, utility } = splitVariantsPublic(token);
    const variant = variants.join(':');
    const key = source.condition ? (variant ? `${source.condition}|${variant}` : source.condition) : variant;
    let style = layers.get(key);
    if (!style) {
      style = {};
      layers.set(key, style);
    }
    applyUtility(style, utility, options);
  }
}

function merge(into: TailwindStyle, from: TailwindStyle | undefined): void {
  if (from) Object.assign(into, from);
}

/**
 * The style in effect under a layer key: unconditional classes, then the
 * variant part, then the conditional part, then the exact layer, and finally
 * inline literals (which always win over classes).
 */
export function effectiveStyle(model: StyleModel, key = ''): TailwindStyle {
  const style: TailwindStyle = {};
  merge(style, model.layers.get(''));
  if (key) {
    const [cond, variant] = key.startsWith('#') ? key.split('|') : ['', key];
    if (variant) merge(style, model.layers.get(variant));
    if (cond) merge(style, model.layers.get(cond));
    if (cond && variant) merge(style, model.layers.get(key));
  }
  merge(style, model.inline);
  return style;
}

/**
 * The model with everything a dynamic style could override removed: when a
 * non-literal style is present only inline literals written after it count.
 */
function knownModel(model: StyleModel): StyleModel {
  return model.dynamic
    ? { layers: new Map(), inline: model.inline, dynamic: false, unknownClasses: model.unknownClasses, origins: new Map() }
    : model;
}

/** The variant half of a layer key; conditional ids are only meaningful within one element. */
function variantOf(key: string): string {
  return key.startsWith('#') ? key.split('|')[1] ?? '' : key;
}

/** Effective base style, honouring dynamic overrides (see `knownModel`). */
function knownStyle(model: StyleModel): TailwindStyle {
  return effectiveStyle(knownModel(model));
}

/**
 * A statically-known numeric style value from classes or inline literals.
 * Undefined when unknown, set-but-unresolvable, or a dynamic style could
 * override it.
 */
export function resolvedStyleNumber(
  el: ElementNode,
  prop: keyof TailwindStyle,
  project: ProjectInfo | undefined,
): number | undefined {
  const model = styleModel(el, project);
  const value = knownStyle(model)[prop];
  return typeof value === 'number' ? value : undefined;
}

const SIZE_PROPS: Array<keyof TailwindStyle> = ['width', 'height', 'minWidth', 'minHeight'];

export interface SizeCandidate {
  /** Layer key ('' for the always-on style). */
  layer: string;
  /** Where a conditional layer came from, when nameable (a `cva` variant). */
  origin?: LayerOrigin;
  width?: number;
  height?: number;
}

/**
 * The element's size under each conditional class set (the base first), with
 * `min-*` floors applied. A `cva` size table yields one candidate per variant,
 * so a `size: { icon: 'h-10 w-10' }` can be judged even though the call site
 * passes `size` dynamically. Responsive and state variants (`sm:`, `hover:`)
 * are not enumerated. Empty when a dynamic style could override everything.
 */
export function sizeCandidates(el: ElementNode, project: ProjectInfo | undefined): SizeCandidate[] {
  const raw = styleModel(el, project);
  if (raw.dynamic) {
    const style = effectiveStyle(knownModel(raw));
    return [{ layer: '', ...dimensions(style) }];
  }
  // A conditional layer is a candidate only when it sets a dimension itself.
  // One that merely inherits the base height (`variant.primary` on a button
  // whose base says `h-10`) would restate the base finding once per variant.
  const setsSize = (style: TailwindStyle | undefined): boolean =>
    style !== undefined && SIZE_PROPS.some((prop) => style[prop] !== undefined);
  const keys = ['', ...[...raw.layers.keys()].filter((k) => k.startsWith('#') && !k.includes('|') && setsSize(raw.layers.get(k)))];
  return keys.map((layer) => ({
    layer,
    ...(raw.origins.get(layer) ? { origin: raw.origins.get(layer) } : {}),
    ...dimensions(effectiveStyle(raw, layer)),
  }));
}

export interface TargetSizeFinding extends SizeCandidate {
  tier: 'below-min' | 'below-recommended';
  /** `40×40`, `20-tall` — the dimension(s) we could read. */
  size: string;
  /** Anchor for the report: the variant definition when there is one, else the element. */
  anchor: { el: ElementNode } | { node: ts.Node };
}

/** Variant definitions already reported in a file, so one `size.icon` is one finding, not one per use. */
const REPORTED_ORIGINS = new WeakMap<ts.SourceFile, Set<number>>();

/**
 * Every size at which the element is an undersized target, one per class
 * set. A finding that comes from a `cva` variant is anchored on the variant's
 * definition and reported once per file, however many elements use it.
 */
export function targetSizeFindings(el: ElementNode, project: ProjectInfo | undefined): TargetSizeFinding[] {
  const findings: TargetSizeFinding[] = [];
  // A conditional set that lands in the same tier as the always-on style
  // (`h-5` plus `isEmpty && 'w-5'`) restates the base finding; only a set
  // that makes the target worse is a second finding.
  let baseTier: TargetSizeFinding['tier'] | undefined;
  for (const candidate of sizeCandidates(el, project)) {
    const { width, height, origin } = candidate;
    if (width === undefined && height === undefined) continue;
    const min = Math.min(width ?? Infinity, height ?? Infinity);
    const tier = min < 24 ? 'below-min' : min < 44 ? 'below-recommended' : undefined;
    if (candidate.layer === '') baseTier = tier;
    if (!tier) continue;
    if (candidate.layer !== '' && baseTier !== undefined && !(tier === 'below-min' && baseTier === 'below-recommended')) continue;
    if (origin) {
      const sf = origin.node.getSourceFile();
      const seen = REPORTED_ORIGINS.get(sf) ?? new Set<number>();
      REPORTED_ORIGINS.set(sf, seen);
      const at = origin.node.getStart(sf);
      if (seen.has(at)) continue;
      seen.add(at);
    }
    const size = width !== undefined && height !== undefined
      ? `${width}×${height}`
      : width !== undefined ? `${width}-wide` : `${height}-tall`;
    findings.push({
      ...candidate,
      tier,
      size,
      anchor: origin ? { node: origin.node } : { el },
    });
  }
  return findings;
}

function dimensions(style: TailwindStyle): { width?: number; height?: number } {
  const dim = (value: number | null | undefined, floor: number | null | undefined): number | undefined => {
    if (typeof value !== 'number') return undefined;
    return typeof floor === 'number' ? Math.max(value, floor) : value;
  };
  const width = dim(style.width, style.minWidth);
  const height = dim(style.height, style.minHeight);
  return { ...(width !== undefined ? { width } : {}), ...(height !== undefined ? { height } : {}) };
}

/** Same as `resolvedStyleNumber` for string-valued props. */
export function resolvedStyleString(
  el: ElementNode,
  prop: keyof TailwindStyle,
  project: ProjectInfo | undefined,
): string | undefined {
  const model = styleModel(el, project);
  const value = knownStyle(model)[prop];
  return typeof value === 'string' ? value : undefined;
}

export interface ContrastFinding {
  message: string;
  severity: Severity;
  ratio: number;
  /** Layer key the finding applies to ('' for the default appearance). */
  layer: string;
  /** Element whose background the text was checked against (itself or an ancestor). */
  background: ElementNode;
}

/** Module specifiers whose components are transparent layout wrappers we may look through for a background. */
const TRANSPARENT_SOURCES = new Set([
  'react-native', 'react-native-web', 'react-native-gesture-handler',
  'react-native-safe-area-context', 'react-native-reanimated',
]);

/** Components that paint their own backdrop; never look through them. */
const OPAQUE_NAMES = new Set(['ImageBackground', 'Modal', 'Image', 'img', 'video', 'canvas', 'svg']);

/**
 * Layout primitives that never paint a background of their own, whatever they
 * were imported from. Any other component — including one defined in this very
 * file — may render its own styled root, so its children's backgrounds are
 * unknowable and the walk stops there.
 */
const TRANSPARENT_NAMES = new Set([
  'View', 'ScrollView', 'SafeAreaView', 'KeyboardAvoidingView', 'Pressable',
  'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback',
  'Fragment', 'React.Fragment', 'GestureHandlerRootView',
]);

/** True when we may look through `el` for the background painted behind it. */
function isTransparentWrapper(el: ElementNode): boolean {
  if (!el.isComponent) return true;
  if (el.name.startsWith('Animated.')) return true;
  if (TRANSPARENT_NAMES.has(el.name)) return true;
  return el.importSource !== null && TRANSPARENT_SOURCES.has(el.importSource);
}

function isFontBold(weight: number | string | null | undefined): boolean {
  if (typeof weight === 'number') return weight >= 700;
  if (typeof weight === 'string') return weight === 'bold' || Number(weight) >= 700;
  return false;
}

function describeLayer(key: string): string {
  if (!key) return '';
  const [cond, variant] = key.startsWith('#') ? key.split('|') : ['', key];
  const parts: string[] = [];
  if (variant) parts.push(`in the \`${variant}:\` variant`);
  if (cond) parts.push('under a conditional class set');
  return ` (${parts.join(', ')})`;
}

/**
 * WCAG 1.4.3 findings for an element's text color against its background.
 * The background may come from the element itself or from the nearest
 * ancestor with a statically-known background, as long as nothing in between
 * could paint its own (dynamic styles, third-party components, images). Each
 * Tailwind variant (`dark:`) and conditional class set is checked separately.
 */
export function contrastFindings(el: ElementNode, project: ProjectInfo | undefined): ContrastFinding[] {
  const own = knownModel(styleModel(el, project));

  // Locate the background: own, else the closest ancestor that sets one.
  let bgModel: StyleModel | undefined;
  let bgEl: ElementNode = el;
  const ownBase = effectiveStyle(own);
  if ((ownBase.backgroundColor !== undefined && ownBase.backgroundColor !== 'transparent')
    || hasLayerBackground(own)) {
    bgModel = own;
  } else {
    let from: ElementNode = el;
    let cur = el.parent;
    while (cur) {
      // Anything that is not a plain host element or a known-transparent
      // wrapper may paint its own backdrop. A locally-defined <Screen> is as
      // opaque to us as an imported one, so it stops the walk too.
      if (OPAQUE_NAMES.has(cur.name) || !isTransparentWrapper(cur)) return [];
      if (cur.hasSpread) return [];
      // A covering sibling — a hero image, a gradient scrim, an `absolute
      // inset-0` overlay — paints between this ancestor's background and our
      // text, so the ancestor's colour is not what is behind it.
      if (hasCoveringSibling(cur, from, project)) return [];
      const ancestor = styleModel(cur, project);
      if (ancestor.unknownClasses) return [];
      const m = knownModel(ancestor);
      const bg = effectiveStyle(m).backgroundColor;
      if (bg === null || (ancestor.dynamic && bg === undefined)) return [];
      if (bg !== undefined && bg !== 'transparent') {
        bgModel = m;
        bgEl = cur;
        break;
      }
      // A variant-only background (dark:bg-…) with no base still anchors the check.
      if (hasLayerBackground(m)) {
        bgModel = m;
        bgEl = cur;
        break;
      }
      from = cur;
      cur = cur.parent;
    }
  }
  if (!bgModel) return [];

  // Conditional-set ids (`#2`) are allocated per element, so `#2` on the text
  // and `#2` on an ancestor are unrelated and must never be paired as if they
  // were one condition — that is what fabricates white-on-white.
  //
  // When the text colour is unconditional, though, every conditional
  // background the ancestor can take really does appear behind it, so each is
  // a candidate. When the text colour is itself conditional the two may be
  // driven by the same flag and we cannot tell, so only the ancestor's
  // unconditional background counts.
  const sameElement = bgModel === own;
  const textIsConditional = [...own.layers.keys()].some(isConditional);
  const textKeys = new Set<string>(['', ...own.layers.keys()]);
  // A variant (`dark:`, `active:`) means the same thing on both elements, so
  // an ancestor's variant is a layer worth checking; a conditional id is not.
  for (const key of bgModel.layers.keys()) textKeys.add(sameElement ? key : variantOf(key));

  const findings: ContrastFinding[] = [];
  const seenPairs = new Set<string>();
  for (const key of textKeys) {
    if (isContrastExemptLayer(key)) continue;
    const text = effectiveStyle(own, key);
    const fgRaw = text.color;
    if (!fgRaw || fgRaw === 'transparent') continue;
    for (const bgRaw of backgroundCandidates(text, bgModel, key, sameElement, textIsConditional)) {
    if (!bgRaw || bgRaw === 'transparent') continue;
    // A variant that resolves to the same pair as a layer already reported is
    // a no-op restatement of it, not a second problem.
    const pair = `${fgRaw}|${bgRaw}`;
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    const fg = parseColor(fgRaw);
    const bg = parseColor(bgRaw);
    if (!fg || !bg) continue;
    const fontSize = typeof text.fontSize === 'number' ? text.fontSize : undefined;
    // An unknown font size is not large text: an unstyled <p> is 16px and an
    // RN <Text> is 14px, and both need the full 4.5:1. Only bold text could
    // clear the 18.66px large-text floor without us seeing a size, so that is
    // the one case that keeps the benefit of the doubt.
    const large = fontSize === undefined
      ? isFontBold(text.fontWeight)
      : isLargeText(fontSize, isFontBold(text.fontWeight));
    const ratio = contrastRatio(fg, bg);
    if (ratio >= 4.5) continue;
    if (ratio >= 3 && large) continue;
    const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
    const requirement = large ? '3:1 (large text)' : '4.5:1';
    const where = bgEl === el ? '' : ` (background from the enclosing <${bgEl.name}>)`;
    const message = `Contrast between ${fgRaw} and ${bgRaw} is ${fmt(ratio)}:1 — below the ${requirement} required by WCAG 1.4.3${describeLayer(key)}${where}.`;
    findings.push({ message, severity: ratio < 3 ? 'serious' : 'moderate', ratio, layer: key, background: bgEl });
    }
  }
  return findings;
}

/** True for a conditional-set key (`#2`, `#2|dark`) rather than a plain variant. */
function isConditional(key: string): boolean {
  return key.startsWith('#');
}

/**
 * Every background that can sit behind the text under layer `key`: the
 * element's own if it sets one, otherwise each candidate layer of the
 * background element whose variant is compatible with the text's.
 */
function backgroundCandidates(
  text: TailwindStyle,
  bgModel: StyleModel,
  key: string,
  sameElement: boolean,
  textIsConditional: boolean,
): Array<string | null | undefined> {
  if (sameElement) return [text.backgroundColor];
  if (text.backgroundColor !== undefined) return [text.backgroundColor];
  const variant = variantOf(key);
  const candidates = new Set<string | null | undefined>();
  candidates.add(effectiveStyle(bgModel, variant).backgroundColor);
  // Each conditional background the ancestor can take really does appear
  // behind unconditional text. When the text colour is conditional too, the
  // two may be driven by the same flag and pairing them would invent a
  // combination that never renders.
  if (!textIsConditional) {
    for (const bgKey of bgModel.layers.keys()) {
      if (!isConditional(bgKey) || variantOf(bgKey) !== variant) continue;
      candidates.add(effectiveStyle(bgModel, bgKey).backgroundColor);
    }
  }
  return [...candidates];
}

/** How deep we look inside an overlay for the thing it paints. */
const OVERLAY_DEPTH = 3;

/** An image or a filled element inside an overlay is what actually covers the background. */
function paintsSomething(el: ElementNode, project: ProjectInfo | undefined, depth = 0): boolean {
  if (OPAQUE_NAMES.has(el.name)) return true;
  const background = effectiveStyle(styleModel(el, project)).backgroundColor;
  if (background !== undefined && background !== 'transparent') return true;
  if (depth >= OVERLAY_DEPTH) return false;
  return el.childElements.some((child) => paintsSomething(child, project, depth + 1));
}

/**
 * True when `parent` has a child other than `except` that covers it — a hero
 * image, a gradient scrim, an `absolute inset-0` overlay — so `parent`'s own
 * background is not what sits behind our text. An out-of-flow child that only
 * pins itself to a corner (`absolute -top-1 -right-1`, a badge) covers
 * nothing and is not treated as a backdrop.
 */
function hasCoveringSibling(parent: ElementNode, except: ElementNode, project: ProjectInfo | undefined): boolean {
  for (const child of parent.childElements) {
    if (child === except) continue;
    const style = effectiveStyle(styleModel(child, project));
    if (style.position !== 'absolute' && style.position !== 'fixed') continue;
    const stretched = style.insetX === true && style.insetY === true;
    if (stretched || paintsSomething(child, project)) return true;
  }
  return false;
}

/** True when a variant or conditional layer sets a background the base layer does not. */
function hasLayerBackground(model: StyleModel): boolean {
  return [...model.layers.entries()].some(([key, style]) => key !== '' && Boolean(style.backgroundColor));
}

/**
 * True when the element is not something a pointer can hit or an eye can read:
 * `sr-only`, `display:none`, fully transparent, `hidden`, `aria-hidden`, or a
 * hidden input. Size and contrast requirements do not apply to these — a
 * visually-hidden validation input is not a 1px touch target.
 */
export function isVisuallyHidden(el: ElementNode, project: ProjectInfo | undefined): boolean {
  const attrs = el.attrs;
  const hidden = attrs.get('hidden');
  if (hidden?.kind === 'static' && hidden.value !== false) return true;
  const ariaHidden = attrs.get('aria-hidden');
  if (ariaHidden?.kind === 'static' && (ariaHidden.value === true || ariaHidden.value === 'true')) return true;
  const type = attrs.get('type');
  if (el.name === 'input' && type?.kind === 'static' && type.value === 'hidden') return true;
  const style = knownStyle(styleModel(el, project));
  return style.srOnly === true || style.display === 'none' || style.opacity === 0;
}

/** True when any resolved class layer removes the outline (`outline-none`). */
export function classesRemoveOutline(model: StyleModel): boolean {
  return [...model.layers.entries()].some(([key, style]) => !key.includes(':') && !key.startsWith('#') && style.outlineNone === true)
    || model.layers.get('')?.outlineNone === true;
}
