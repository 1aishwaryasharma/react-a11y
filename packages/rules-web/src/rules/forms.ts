import {
  attrProvidesValue,
  findAncestor,
  hasAttr,
  isAriaHidden,
  staticString,
} from '@react-a11y/core';
import { defineRule, isDomTag } from '../util.js';

const UNLABELED_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image']);

/**
 * Form controls need a programmatic label. An id is given the benefit of the
 * doubt (a <label htmlFor> may live elsewhere); wrapping <label> counts.
 */
export const formControlHasLabel = defineRule(
  {
    id: 'form-control-has-label',
    description: 'Form controls must have a programmatically associated label.',
    severity: 'serious',
    wcag: ['1.3.1', '3.3.2', '4.1.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'input', 'select', 'textarea')) return;
    if (el.name === 'input') {
      const type = staticString(el, 'type')?.trim().toLowerCase();
      if (type && UNLABELED_INPUT_TYPES.has(type)) return;
    }
    if (el.hasSpread || isAriaHidden(el)) return;
    if (
      attrProvidesValue(el, 'aria-label') ||
      attrProvidesValue(el, 'aria-labelledby') ||
      attrProvidesValue(el, 'title') ||
      hasAttr(el, 'id') // may be referenced by <label htmlFor> elsewhere
    ) {
      return;
    }
    if (findAncestor(el, (a) => !a.isComponent && a.name === 'label')) return;
    const hint = hasAttr(el, 'placeholder')
      ? ' A placeholder is not a label — it disappears on input and is not reliably announced.'
      : '';
    ctx.report({
      el,
      message: `<${el.name}> has no associated label. Add a <label htmlFor>, wrap it in a <label>, or use aria-label.${hint}`,
    });
  },
);

const JS_HREF = /^\s*(javascript:|#?\s*$)/i;

/** Anchors must navigate; click-only anchors should be buttons. */
export const anchorIsValid = defineRule(
  {
    id: 'anchor-is-valid',
    description: 'Anchors must have a valid href; use <button> for click-only actions.',
    severity: 'serious',
    wcag: ['2.1.1', '4.1.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'a') || el.hasSpread) return;
    const href = el.attrs.get('href');
    if (!href) {
      if (hasAttr(el, 'onClick')) {
        ctx.report({ el, message: '<a> with onClick but no href is not keyboard focusable. Use a <button> instead.' });
      }
      return;
    }
    if (href.kind === 'static' && typeof href.value === 'string' && JS_HREF.test(href.value)) {
      ctx.report({
        el,
        message: `href="${href.value}" is not a real destination. Use a <button> for actions, or a routable URL.`,
      });
    }
  },
);
