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

/** HTML autofill tokens (WHATWG) — what 1.3.5 requires for identifying input purpose. */
const AUTOCOMPLETE_TOKENS = new Set([
  'on', 'off', 'name', 'honorific-prefix', 'given-name', 'additional-name',
  'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password',
  'current-password', 'one-time-code', 'organization-title', 'organization',
  'street-address', 'address-line1', 'address-line2', 'address-line3',
  'address-level4', 'address-level3', 'address-level2', 'address-level1',
  'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name',
  'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp',
  'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency',
  'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month',
  'bday-year', 'sex', 'url', 'photo', 'tel', 'tel-country-code',
  'tel-national', 'tel-area-code', 'tel-local', 'tel-local-prefix',
  'tel-local-suffix', 'tel-extension', 'email', 'impp', 'webauthn',
  'home', 'work', 'mobile', 'fax', 'pager', 'shipping', 'billing',
]);

/** autoComplete values must be real autofill tokens or browsers ignore them. */
export const autocompleteValid = defineRule(
  {
    id: 'autocomplete-valid',
    description: 'autoComplete must use valid HTML autofill tokens.',
    severity: 'moderate',
    wcag: ['1.3.5'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'input', 'select', 'textarea')) return;
    const value = staticString(el, 'autoComplete');
    if (value === undefined) return;
    for (const token of value.trim().toLowerCase().split(/\s+/).filter(Boolean)) {
      if (AUTOCOMPLETE_TOKENS.has(token) || token.startsWith('section-')) continue;
      ctx.report({
        el,
        message: `autoComplete token "${token}" is not a valid autofill token — browsers and assistive tech ignore it, so the input purpose stays unidentified.`,
      });
    }
  },
);

/** input type="button"/"image" have no default label. */
export const inputButtonHasName = defineRule(
  {
    id: 'input-button-has-name',
    description: '<input type="button"> needs a value; <input type="image"> needs alt.',
    severity: 'serious',
    wcag: ['4.1.2', '1.1.1'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'input') || el.hasSpread) return;
    const type = staticString(el, 'type')?.trim().toLowerCase();
    if (type === 'button') {
      if (attrProvidesValue(el, 'value') || attrProvidesValue(el, 'aria-label') || attrProvidesValue(el, 'aria-labelledby')) return;
      ctx.report({ el, message: '<input type="button"> has no value or aria-label — it is announced as an unnamed button.' });
    } else if (type === 'image') {
      if (attrProvidesValue(el, 'alt') || attrProvidesValue(el, 'aria-label') || attrProvidesValue(el, 'aria-labelledby')) return;
      ctx.report({ el, message: '<input type="image"> has no alt text — the button\'s purpose is invisible to screen readers.' });
    }
  },
);

/**
 * WCAG 3.3.8 (new in 2.2): authentication must not rely on transcription.
 * Blocking password managers or paste forces users to retype credentials.
 */
export const accessibleAuthentication = defineRule(
  {
    id: 'accessible-authentication',
    description: 'Password fields must not block password managers or paste.',
    severity: 'serious',
    wcag: ['3.3.8'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'input')) return;
    if (staticString(el, 'type')?.trim().toLowerCase() !== 'password') return;
    if (staticString(el, 'autoComplete')?.trim().toLowerCase() === 'off') {
      ctx.report({
        el,
        message: 'autoComplete="off" on a password field blocks password managers, forcing users with cognitive or motor disabilities to transcribe. Use "current-password" or "new-password".',
      });
    }
    if (hasAttr(el, 'onPaste')) {
      ctx.report({
        el,
        message: 'onPaste on a password field — if it prevents pasting, users cannot use password managers (WCAG 3.3.8). Verify paste is not blocked.',
        severity: 'moderate',
      });
    }
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
