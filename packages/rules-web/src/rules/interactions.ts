import {
  INTERACTIVE_ROLES,
  INTERACTIVE_TAGS,
  hasAttr,
  inlineStyleValue,
  staticString,
} from '@react-a11y/core';
import { defineRule } from '../util.js';

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
