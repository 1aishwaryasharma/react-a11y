import {
  INTERACTIVE_ROLES,
  INTERACTIVE_TAGS,
  hasAttr,
  isAriaHidden,
  isPresentational,
  staticString,
  staticValue,
} from '@react-a11y/core';
import type { ElementNode } from '@react-a11y/core';
import { defineRule } from '../util.js';

/** Interaction handlers that imply the element is meant to be operated. */
const HANDLER_PROPS = [
  'onClick', 'onDoubleClick', 'onMouseDown', 'onMouseUp',
  'onKeyDown', 'onKeyUp', 'onKeyPress', 'onTouchStart', 'onTouchEnd',
];

/**
 * Semantic HTML elements with a non-interactive implicit role. `div`/`span`
 * are deliberately excluded — they are generic and are the recommended escape
 * hatch for taking on a role, so flagging them would be noise.
 */
const NONINTERACTIVE_TAGS = new Set([
  'main', 'nav', 'article', 'section', 'aside', 'header', 'footer',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
  'figure', 'figcaption', 'blockquote',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'caption',
  'address', 'hr', 'output', 'img', 'fieldset', 'legend',
]);

/** ARIA roles that do not expose an interactive widget. */
const NONINTERACTIVE_ROLES = new Set([
  'article', 'banner', 'complementary', 'contentinfo', 'definition', 'directory',
  'document', 'feed', 'figure', 'group', 'heading', 'img', 'list', 'listitem',
  'main', 'math', 'navigation', 'note', 'region', 'status', 'table', 'term',
  'time', 'tooltip', 'paragraph',
]);

const ALWAYS_FOCUSABLE = new Set(['button', 'select', 'textarea', 'summary', 'iframe', 'embed']);

function isFocusable(el: ElementNode): boolean {
  if (staticValue(el, 'disabled') === true) return false;
  const tabIndex = staticValue(el, 'tabIndex');
  if (typeof tabIndex === 'number') return tabIndex >= 0;
  if (typeof tabIndex === 'string' && tabIndex.trim() !== '') return Number(tabIndex) >= 0;
  if (el.isComponent) return false;
  if (ALWAYS_FOCUSABLE.has(el.name)) return true;
  if ((el.name === 'a' || el.name === 'area') && hasAttr(el, 'href')) return true;
  if (el.name === 'input') return staticString(el, 'type') !== 'hidden';
  if ((el.name === 'audio' || el.name === 'video') && hasAttr(el, 'controls')) return true;
  return false;
}

/** Native HTML elements that are inherently interactive controls. */
function isInteractiveElement(el: ElementNode): boolean {
  if (el.isComponent) return false;
  if (el.name === 'a' || el.name === 'area') return hasAttr(el, 'href');
  if (el.name === 'input') return staticString(el, 'type') !== 'hidden';
  if (el.name === 'audio' || el.name === 'video') return hasAttr(el, 'controls');
  return INTERACTIVE_TAGS.has(el.name);
}

function firstHandler(el: ElementNode): string | undefined {
  return HANDLER_PROPS.find((h) => hasAttr(el, h));
}

/**
 * An element given an interactive role but unreachable by keyboard: it needs
 * tabIndex to be focusable, or assistive-technology users cannot operate it.
 */
export const interactiveSupportsFocus = defineRule(
  {
    id: 'interactive-supports-focus',
    description: 'Elements with an interactive role and a handler must be focusable.',
    severity: 'serious',
    wcag: ['2.1.1', '4.1.2'],
  },
  (el, ctx) => {
    if (el.isComponent || el.hasSpread) return;
    if (isAriaHidden(el) || isPresentational(el)) return;
    const role = staticString(el, 'role')?.trim();
    if (!role || !INTERACTIVE_ROLES.has(role)) return;
    if (!firstHandler(el)) return;
    if (isFocusable(el) || hasAttr(el, 'tabIndex')) return;
    ctx.report({
      el,
      message: `<${el.name} role="${role}"> handles interaction but is not focusable. Add tabIndex={0} so keyboard users can reach it.`,
    });
  },
);

/**
 * Event handlers on semantic non-interactive elements (li, main, h2, …) are
 * unreachable by keyboard and screen reader users. Move the handler to a
 * <button>/<a>, or give the element an interactive role and focus support.
 */
export const noNoninteractiveElementInteractions = defineRule(
  {
    id: 'no-noninteractive-element-interactions',
    description: 'Non-interactive elements should not have interaction handlers.',
    severity: 'serious',
    wcag: ['2.1.1', '4.1.2'],
  },
  (el, ctx) => {
    if (el.isComponent || el.hasSpread) return;
    if (isAriaHidden(el)) return;
    const role = staticString(el, 'role')?.trim();
    if (role && INTERACTIVE_ROLES.has(role)) return;
    if (hasAttr(el, 'tabIndex')) return; // author opted into interactivity
    const nonInteractive = NONINTERACTIVE_TAGS.has(el.name) || (role !== undefined && NONINTERACTIVE_ROLES.has(role));
    if (!nonInteractive) return;
    const handler = firstHandler(el);
    if (!handler) return;
    ctx.report({
      el,
      message: `<${el.name}> is non-interactive but has ${handler}. Move the action to a <button>/<a>, or add an interactive role with tabIndex and a keyboard handler.`,
    });
  },
);

/**
 * An interactive element whose role removes its interactive semantics
 * (e.g. <button role="article">) becomes invisible to assistive technology
 * as a control.
 */
export const noInteractiveElementToNoninteractiveRole = defineRule(
  {
    id: 'no-interactive-element-to-noninteractive-role',
    description: 'Interactive elements must not be given a non-interactive role.',
    severity: 'serious',
    wcag: ['4.1.2', '1.3.1'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    if (!isInteractiveElement(el)) return;
    const role = staticString(el, 'role')?.trim();
    if (!role || INTERACTIVE_ROLES.has(role)) return;
    if (!(NONINTERACTIVE_ROLES.has(role) || role === 'presentation' || role === 'none')) return;
    ctx.report({
      el,
      message: `<${el.name}> is an interactive control but role="${role}" strips its semantics — screen reader users lose the control.`,
    });
  },
);

/**
 * A semantic non-interactive element given an interactive role (e.g.
 * <li role="button">) should be a generic container or a native control —
 * native elements carry behavior the role alone does not.
 */
export const noNoninteractiveElementToInteractiveRole = defineRule(
  {
    id: 'no-noninteractive-element-to-interactive-role',
    description: 'Non-interactive elements must not be given an interactive role.',
    severity: 'serious',
    wcag: ['4.1.2', '1.3.1'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    if (!NONINTERACTIVE_TAGS.has(el.name)) return;
    const role = staticString(el, 'role')?.trim();
    if (!role || !INTERACTIVE_ROLES.has(role)) return;
    ctx.report({
      el,
      message: `<${el.name}> is non-interactive but has interactive role="${role}". Use a native control, or a <div>/<span> with the role plus tabIndex and key handlers.`,
    });
  },
);

/** tabIndex on a non-interactive element adds a tab stop that does nothing. */
export const noNoninteractiveTabindex = defineRule(
  {
    id: 'no-noninteractive-tabindex',
    description: 'tabIndex must not be placed on non-interactive elements.',
    severity: 'moderate',
    wcag: ['2.4.3', '4.1.2'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    const v = staticValue(el, 'tabIndex');
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    if (!Number.isFinite(n) || n < 0) return;
    const role = staticString(el, 'role')?.trim();
    if (role && INTERACTIVE_ROLES.has(role)) return;
    if (isInteractiveElement(el)) return;
    const nonInteractive = NONINTERACTIVE_TAGS.has(el.name) || (role !== undefined && NONINTERACTIVE_ROLES.has(role));
    if (!nonInteractive) return;
    ctx.report({
      el,
      message: `tabIndex={${n}} on non-interactive <${el.name}> creates a tab stop with no interactive purpose. Remove it, or make the element a real control.`,
    });
  },
);

/** Roles that re-implement a native element, with the element to prefer. */
const ROLE_TO_TAG: Record<string, string> = {
  button: '<button>',
  link: '<a href>',
  checkbox: '<input type="checkbox">',
  radio: '<input type="radio">',
  heading: '<h1>–<h6>',
  list: '<ul> or <ol>',
  listitem: '<li>',
  table: '<table>',
  row: '<tr>',
  cell: '<td>',
  columnheader: '<th scope="col">',
  rowheader: '<th scope="row">',
  navigation: '<nav>',
  main: '<main>',
  banner: '<header>',
  contentinfo: '<footer>',
  complementary: '<aside>',
  article: '<article>',
  figure: '<figure>',
  form: '<form>',
  textbox: '<input> or <textarea>',
  img: '<img>',
  separator: '<hr>',
  region: '<section>',
  progressbar: '<progress>',
  combobox: '<select>',
};

/**
 * A role on a generic <div>/<span> that has a native element equivalent —
 * prefer the native tag for built-in keyboard handling and semantics.
 * (Redundant roles on the matching element itself are handled by
 * no-redundant-roles.)
 */
export const preferTagOverRole = defineRule(
  {
    id: 'prefer-tag-over-role',
    description: 'Prefer the native element over a role that re-implements it.',
    severity: 'minor',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (el.name !== 'div' && el.name !== 'span') return;
    const role = staticString(el, 'role')?.trim();
    if (!role) return;
    const suggestion = ROLE_TO_TAG[role];
    if (!suggestion) return;
    ctx.report({
      el,
      message: `role="${role}" re-implements a native element. Prefer ${suggestion} for built-in keyboard support and semantics.`,
    });
  },
);
