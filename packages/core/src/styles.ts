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
}

/** Tagged-template tags and call names whose arguments are class strings. */
const CLASS_TAGS = new Set(['tw', 'twrnc', 'tailwind', 'style']);

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
    // cn(), clsx(), twMerge(), classNames(), tw(), cva()(…) — every string
    // argument is a class source, regardless of the helper's name.
    for (const arg of expr.arguments) collectClassExpression(arg, condition, out);
    return;
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
      collectClassExpression(node.template, '', classes);
      return;
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && CLASS_TAGS.has(node.expression.text)) {
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
  const model: StyleModel = { layers: new Map(), inline: {}, dynamic: false, unknownClasses: false };
  const classes: ClassCollector = { sources: [], unknown: false, nextId: 1 };
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
  return model.dynamic ? { layers: new Map(), inline: model.inline, dynamic: false, unknownClasses: false } : model;
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
  if (ownBase.backgroundColor !== undefined && ownBase.backgroundColor !== 'transparent') {
    bgModel = own;
  } else {
    let cur = el.parent;
    while (cur) {
      if (OPAQUE_NAMES.has(cur.name) || (cur.isComponent && cur.importSource !== null && !TRANSPARENT_SOURCES.has(cur.importSource))) return [];
      if (cur.hasSpread) return [];
      const raw = styleModel(cur, project);
      const m = knownModel(raw);
      const bg = effectiveStyle(m).backgroundColor;
      if (bg === null || (raw.dynamic && bg === undefined)) return [];
      if (bg !== undefined && bg !== 'transparent') {
        bgModel = m;
        bgEl = cur;
        break;
      }
      // A variant-only background (dark:bg-…) with no base still anchors the check.
      if ([...m.layers.entries()].some(([k, s]) => k && s.backgroundColor)) {
        bgModel = m;
        bgEl = cur;
        break;
      }
      cur = cur.parent;
    }
  }
  if (!bgModel) return [];

  const keys = new Set<string>(['', ...own.layers.keys(), ...bgModel.layers.keys()]);
  const findings: ContrastFinding[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    if (isContrastExemptLayer(key)) continue;
    const text = effectiveStyle(own, key);
    const fgRaw = text.color;
    if (!fgRaw || fgRaw === 'transparent') continue;
    const bgRaw = bgModel === own
      ? text.backgroundColor
      : (text.backgroundColor ?? effectiveStyle(bgModel, key).backgroundColor);
    if (!bgRaw || bgRaw === 'transparent') continue;
    const fg = parseColor(fgRaw);
    const bg = parseColor(bgRaw);
    if (!fg || !bg) continue;
    const fontSize = typeof text.fontSize === 'number' ? text.fontSize : undefined;
    const large = isLargeText(fontSize, isFontBold(text.fontWeight));
    const ratio = contrastRatio(fg, bg);
    if (ratio >= 4.5) continue;
    if (ratio >= 3 && (large || fontSize === undefined)) continue;
    const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
    const requirement = large ? '3:1 (large text)' : '4.5:1';
    const where = bgEl === el ? '' : ` (background from the enclosing <${bgEl.name}>)`;
    const message = `Contrast between ${fgRaw} and ${bgRaw} is ${fmt(ratio)}:1 — below the ${requirement} required by WCAG 1.4.3${describeLayer(key)}${where}.`;
    if (seen.has(message)) continue;
    seen.add(message);
    findings.push({ message, severity: ratio < 3 ? 'serious' : 'moderate', ratio, layer: key, background: bgEl });
  }
  return findings;
}

/** True when any resolved class layer removes the outline (`outline-none`). */
export function classesRemoveOutline(model: StyleModel): boolean {
  return [...model.layers.entries()].some(([key, style]) => !key.includes(':') && !key.startsWith('#') && style.outlineNone === true)
    || model.layers.get('')?.outlineNone === true;
}
