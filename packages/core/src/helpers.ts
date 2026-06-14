import ts from 'typescript';
import type { AttrValue, ElementNode } from './element.js';
import type { Severity } from './types.js';
import { contrastRatio, isLargeText, parseColor } from './color.js';

export function getAttr(el: ElementNode, name: string): AttrValue | undefined {
  return el.attrs.get(name);
}

export function hasAttr(el: ElementNode, name: string): boolean {
  return el.attrs.has(name);
}

/** Static value when statically known, otherwise undefined. */
export function staticValue(el: ElementNode, name: string): string | number | boolean | null | undefined {
  const attr = el.attrs.get(name);
  return attr?.kind === 'static' ? attr.value : undefined;
}

/** Static string value (trimmed) when statically known to be a string. */
export function staticString(el: ElementNode, name: string): string | undefined {
  const v = staticValue(el, name);
  return typeof v === 'string' ? v : undefined;
}

/** True when the attribute is present as a dynamic expression. */
export function isExpression(el: ElementNode, name: string): boolean {
  return el.attrs.get(name)?.kind === 'expression';
}

export function isStaticTrue(el: ElementNode, name: string): boolean {
  const v = staticValue(el, name);
  return v === true || v === 'true';
}

export function isAriaHidden(el: ElementNode): boolean {
  return isStaticTrue(el, 'aria-hidden');
}

/**
 * True when the attribute could plausibly carry a usable value: present as a
 * non-empty static string, or dynamic (benefit of the doubt to avoid false
 * positives in a purely static analysis).
 */
export function attrProvidesValue(el: ElementNode, name: string): boolean {
  const attr = el.attrs.get(name);
  if (!attr) return false;
  if (attr.kind === 'expression') return true;
  return typeof attr.value === 'string' ? attr.value.trim().length > 0 : attr.value != null && attr.value !== false;
}

/**
 * Conservative check that an element's *content* can supply an accessible
 * name: direct text, dynamic children, unknown components (which may render
 * text), spreads, or an <img> with non-empty alt.
 */
export function contentProvidesName(el: ElementNode): boolean {
  if (el.hasTextChild || el.hasExpressionChild) return true;
  if (hasAttr(el, 'dangerouslySetInnerHTML')) return true;
  return el.childElements.some((child) => {
    if (isAriaHidden(child)) return false;
    if (child.isComponent) return true;
    if (child.hasSpread) return true;
    if (child.name === 'img' && attrProvidesValue(child, 'alt')) return true;
    return contentProvidesName(child);
  });
}

/** Accessible name via attributes or content, for web elements. */
export function hasAccessibleName(el: ElementNode): boolean {
  if (el.hasSpread) return true;
  if (attrProvidesValue(el, 'aria-label')) return true;
  if (attrProvidesValue(el, 'aria-labelledby')) return true;
  if (attrProvidesValue(el, 'title')) return true;
  return contentProvidesName(el);
}

const PRESENTATION_ROLES = new Set(['presentation', 'none']);

export function isPresentational(el: ElementNode): boolean {
  const role = staticString(el, 'role');
  return role !== undefined && PRESENTATION_ROLES.has(role.trim().toLowerCase());
}

/**
 * Statically-known value of a property in an inline style object literal,
 * e.g. style={{ width: 20 }}. Returns undefined for dynamic styles,
 * StyleSheet references, or non-literal values.
 */
export function inlineStyleValue(el: ElementNode, prop: string): string | number | undefined {
  const style = el.attrs.get('style');
  if (style?.kind !== 'expression' || !style.node || !ts.isObjectLiteralExpression(style.node)) return undefined;
  for (const p of style.node.properties) {
    if (!ts.isPropertyAssignment(p)) continue;
    const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
    if (name !== prop) continue;
    const init = p.initializer;
    if (ts.isStringLiteralLike(init)) return init.text;
    if (ts.isNumericLiteral(init)) return Number(init.text);
    return undefined;
  }
  return undefined;
}

export function inlineStyleNumber(el: ElementNode, prop: string): number | undefined {
  const v = inlineStyleValue(el, prop);
  return typeof v === 'number' ? v : undefined;
}

/**
 * The full visible text of an element, when it is entirely static. Returns
 * null as soon as an expression child or component child makes the text
 * unknowable. aria-hidden subtrees are excluded (they are not "visible
 * label" for 2.5.3 purposes).
 */
export function deepStaticText(el: ElementNode): string | null {
  if (el.hasExpressionChild) return null;
  const parts: string[] = el.directText ? [el.directText] : [];
  for (const child of el.childElements) {
    if (isAriaHidden(child)) continue;
    if (child.isComponent || child.hasSpread) return null;
    const childText = deepStaticText(child);
    if (childText === null) return null;
    if (childText) parts.push(childText);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export interface ContrastInfo {
  ratio: number;
  required: number;
  large: boolean;
  fontSizeKnown: boolean;
  fg: string;
  bg: string;
}

/**
 * Contrast of statically-known inline color/backgroundColor on the same
 * element. Null when either color is dynamic, unparseable or translucent.
 */
export function inlineStyleContrast(el: ElementNode): ContrastInfo | null {
  const fgRaw = inlineStyleValue(el, 'color');
  const bgRaw = inlineStyleValue(el, 'backgroundColor') ?? inlineStyleValue(el, 'background');
  const fg = parseColor(fgRaw);
  const bg = parseColor(bgRaw);
  if (!fg || !bg) return null;
  const fontSize = inlineStyleNumber(el, 'fontSize');
  const weight = inlineStyleValue(el, 'fontWeight');
  const bold = weight === 'bold' || weight === 700 || weight === '700' || weight === 800 || weight === '800' || weight === 900 || weight === '900';
  const large = isLargeText(fontSize, bold);
  return {
    ratio: contrastRatio(fg, bg),
    required: large ? 3 : 4.5,
    large,
    fontSizeKnown: fontSize !== undefined,
    fg: String(fgRaw),
    bg: String(bgRaw),
  };
}

/**
 * WCAG 1.4.3 contrast check for an element's inline literal color/background.
 * Returns the finding (message + severity) to report, or null when it passes,
 * the colors aren't static, or the size makes it indeterminate. Shared by the
 * web and native `color-contrast` rules so the thresholds live in one place.
 */
export function colorContrastFinding(el: ElementNode): { message: string; severity: Severity } | null {
  const info = inlineStyleContrast(el);
  if (!info) return null;
  if (info.ratio >= 4.5) return null;
  if (info.ratio >= 3 && (info.large || !info.fontSizeKnown)) return null;
  if (info.ratio >= info.required && info.fontSizeKnown) return null;
  const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
  const requirement = info.large ? '3:1 (large text)' : '4.5:1';
  return {
    message: `Contrast between ${info.fg} and ${info.bg} is ${fmt(info.ratio)}:1 — below the ${requirement} required by WCAG 1.4.3.`,
    severity: info.ratio < 3 ? 'serious' : 'moderate',
  };
}

/**
 * The WCAG target-size tier for a pointer target, by its smaller dimension.
 * `below-min` < 24px (WCAG 2.5.8 AA), `below-recommended` < 44px (2.5.5 AAA /
 * Apple HIG / Material). Keeps the 24/44 thresholds in one place; each rule
 * maps the tier to its own severity and platform wording.
 */
export function targetSizeTier(width: number, height: number): 'below-min' | 'below-recommended' | null {
  const min = Math.min(width, height);
  if (min < 24) return 'below-min';
  if (min < 44) return 'below-recommended';
  return null;
}

/** Statically-known keys of an object-literal prop, e.g. accessibilityState={{...}}. */
export function objectLiteralKeys(el: ElementNode, attrName: string): string[] | undefined {
  const attr = el.attrs.get(attrName);
  if (attr?.kind !== 'expression' || !attr.node || !ts.isObjectLiteralExpression(attr.node)) return undefined;
  const keys: string[] = [];
  for (const p of attr.node.properties) {
    if (ts.isSpreadAssignment(p)) return undefined; // unknowable
    if ((ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
        (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
      keys.push(p.name.text);
    }
  }
  return keys;
}
