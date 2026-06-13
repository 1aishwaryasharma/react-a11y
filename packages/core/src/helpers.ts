import type { AttrValue, ElementNode } from './element.js';

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
