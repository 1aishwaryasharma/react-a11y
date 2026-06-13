import {
  INTERACTIVE_ROLES,
  INTERACTIVE_TAGS,
  hasAttr,
  inlineStyleValue,
  isAriaHidden,
  staticString,
  staticValue,
} from '@react-a11y/core';
import { defineRule } from '../util.js';

const KEY_HANDLERS = ['onKeyDown', 'onKeyUp', 'onKeyPress'];
const NON_CONTENT_TAGS = new Set(['html', 'body', 'head', 'script', 'style']);

/**
 * Click handlers on non-interactive elements (div, span, …) are invisible to
 * keyboard and screen reader users unless role, tabIndex and a key handler
 * are added. Prefer a real <button> or <a>.
 */
export const noStaticElementInteractions = defineRule(
  {
    id: 'no-static-element-interactions',
    description: 'Non-interactive elements with click handlers must be keyboard accessible and expose a role.',
    severity: 'serious',
    wcag: ['2.1.1', '4.1.2'],
  },
  (el, ctx) => {
    if (el.isComponent || el.hasSpread) return;
    if (INTERACTIVE_TAGS.has(el.name) || NON_CONTENT_TAGS.has(el.name)) return;
    if (!hasAttr(el, 'onClick') && !hasAttr(el, 'onDoubleClick')) return;
    if (isAriaHidden(el)) return;
    if (hasAttr(el, 'contentEditable')) return;

    const role = staticString(el, 'role')?.trim();
    const missing: string[] = [];
    if (!role || !INTERACTIVE_ROLES.has(role)) missing.push('an interactive role (e.g. role="button")');
    if (!hasAttr(el, 'tabIndex')) missing.push('tabIndex={0} so keyboard users can reach it');
    if (!KEY_HANDLERS.some((h) => hasAttr(el, h))) missing.push('a keyboard handler (onKeyDown)');
    if (missing.length === 0) return;
    ctx.report({
      el,
      message: `<${el.name}> handles clicks but is missing ${missing.join(', ')}. Prefer a native <button>.`,
    });
  },
);

/** Hover-only affordances exclude keyboard users. */
export const mouseEventsHaveKeyEvents = defineRule(
  {
    id: 'mouse-events-have-key-events',
    description: 'onMouseOver/onMouseOut must be paired with onFocus/onBlur.',
    severity: 'moderate',
    wcag: ['2.1.1'],
  },
  (el, ctx) => {
    if (el.isComponent || el.hasSpread) return;
    if (hasAttr(el, 'onMouseOver') && !hasAttr(el, 'onFocus')) {
      ctx.report({ el, message: `<${el.name}> has onMouseOver without onFocus — keyboard users never trigger it.` });
    }
    if (hasAttr(el, 'onMouseOut') && !hasAttr(el, 'onBlur')) {
      ctx.report({ el, message: `<${el.name}> has onMouseOut without onBlur — keyboard users never trigger it.` });
    }
  },
);

/** Positive tabIndex breaks natural focus order. */
export const noPositiveTabindex = defineRule(
  {
    id: 'no-positive-tabindex',
    description: 'tabIndex must not be greater than zero.',
    severity: 'serious',
    wcag: ['2.4.3'],
  },
  (el, ctx) => {
    const v = staticValue(el, 'tabIndex');
    const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
    if (Number.isFinite(n) && n > 0) {
      ctx.report({ el, message: `tabIndex={${n}} hijacks the tab order for the whole page. Use tabIndex={0} and DOM order instead.` });
    }
  },
);

/** Autofocus moves focus unexpectedly, disorienting screen reader users. */
export const noAutofocus = defineRule(
  {
    id: 'no-autofocus',
    description: 'Avoid autoFocus — unexpected focus moves disorient assistive technology users.',
    severity: 'moderate',
    wcag: ['3.2.1'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    if (!hasAttr(el, 'autoFocus') || staticValue(el, 'autoFocus') === false) return;
    ctx.report({ el, message: `autoFocus on <${el.name}> moves focus on page load, which disorients screen reader and magnification users.` });
  },
);

/** accessKey shortcuts conflict with screen reader and OS shortcuts. */
export const noAccessKey = defineRule(
  {
    id: 'no-access-key',
    description: 'Avoid accessKey — it conflicts with assistive technology shortcuts.',
    severity: 'moderate',
    wcag: ['2.1.1'],
  },
  (el, ctx) => {
    if (hasAttr(el, 'accessKey')) {
      ctx.report({ el, message: 'accessKey conflicts with screen reader and OS keyboard shortcuts. Remove it.' });
    }
  },
);

/**
 * WCAG 2.5.2: activating on down-events (mousedown/touchstart) means users
 * cannot abort by sliding off the control before releasing.
 */
export const pointerCancellation = defineRule(
  {
    id: 'pointer-cancellation',
    description: 'Do not trigger actions on mousedown/touchstart — use click/up events.',
    severity: 'moderate',
    wcag: ['2.5.2'],
    partial: true,
  },
  (el, ctx) => {
    if (el.isComponent || el.hasSpread) return;
    if (el.name !== 'button' && el.name !== 'a') return;
    const hasDown = hasAttr(el, 'onMouseDown') || hasAttr(el, 'onTouchStart');
    const hasUp = hasAttr(el, 'onClick') || hasAttr(el, 'onMouseUp') || hasAttr(el, 'onTouchEnd') || hasAttr(el, 'onPointerUp');
    if (hasDown && !hasUp) {
      ctx.report({
        el,
        message: `<${el.name}> acts on a down-event only — users cannot cancel by sliding off before release. Move the action to onClick.`,
      });
    }
  },
);

/** Removing the focus outline without a replacement hides keyboard position. */
export const noOutlineNone = defineRule(
  {
    id: 'no-outline-none',
    description: 'Do not remove the focus outline via inline styles without a visible replacement.',
    severity: 'moderate',
    wcag: ['2.4.7'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    const interactive =
      INTERACTIVE_TAGS.has(el.name) ||
      hasAttr(el, 'tabIndex') ||
      hasAttr(el, 'onClick') ||
      INTERACTIVE_ROLES.has(staticString(el, 'role')?.trim() ?? '');
    if (!interactive) return;
    for (const prop of ['outline', 'outlineStyle', 'outlineWidth']) {
      const v = inlineStyleValue(el, prop);
      if (v === 'none' || v === 'hidden' || v === 0 || v === '0') {
        ctx.report({
          el,
          message: `Inline style removes the focus outline (${prop}: ${JSON.stringify(v)}) — keyboard users lose track of where they are unless a visible :focus style replaces it.`,
        });
        return;
      }
    }
  },
);

/** Marquee/blink cannot be paused and violate WCAG 2.2.2. */
export const noDistractingElements = defineRule(
  {
    id: 'no-distracting-elements',
    description: 'Do not use <marquee> or <blink>.',
    severity: 'serious',
    wcag: ['2.2.2'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    if (el.name === 'marquee' || el.name === 'blink') {
      ctx.report({ el, message: `<${el.name}> moves content that cannot be paused, stopped or hidden.` });
    }
  },
);
