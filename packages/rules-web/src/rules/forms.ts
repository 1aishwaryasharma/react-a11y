import { attrProvidesValue, hasAttr, staticString } from '@aish/react-a11y-core';
import { defineRule, isDomTag } from '../util.js';

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

/**
 * WCAG 3.3.1: a control marked invalid must point at a text description of
 * the error, or screen reader users only hear "invalid" with no explanation.
 */
export const errorIdentification = defineRule(
  {
    id: 'error-identification',
    description: 'Controls with aria-invalid must reference an error description.',
    severity: 'moderate',
    wcag: ['3.3.1'],
    partial: true,
  },
  (el, ctx) => {
    if (!isDomTag(el, 'input', 'select', 'textarea') || el.hasSpread) return;
    const invalid = el.attrs.get('aria-invalid');
    if (!invalid || (invalid.kind === 'static' && (invalid.value === false || invalid.value === 'false'))) return;
    if (hasAttr(el, 'aria-describedby') || hasAttr(el, 'aria-errormessage')) return;
    ctx.report({
      el,
      message: `<${el.name}> is marked aria-invalid but has no aria-describedby/aria-errormessage — screen reader users hear "invalid" with no explanation of what is wrong.`,
    });
  },
);

const IDENTITY_FIELD = /(name|email|phone|tel|address|city|country|zip|postal|company|organi[sz]ation)/i;

/**
 * WCAG 3.3.7 (new in 2.2): users must not re-enter information the site
 * already has. autoComplete="off" on identity fields blocks the browser
 * from re-filling data the user already provided.
 */
export const noAutocompleteOff = defineRule(
  {
    id: 'no-autocomplete-off',
    description: 'Do not disable autofill on fields asking for user information.',
    severity: 'moderate',
    wcag: ['3.3.7', '1.3.5'],
    partial: true,
  },
  (el, ctx) => {
    if (!isDomTag(el, 'input')) return;
    if (staticString(el, 'autoComplete')?.trim().toLowerCase() !== 'off') return;
    const type = staticString(el, 'type')?.trim().toLowerCase();
    if (type === 'password') return; // covered by accessible-authentication
    const fieldHint = `${staticString(el, 'name') ?? ''} ${staticString(el, 'id') ?? ''} ${type ?? ''}`;
    if (type === 'email' || type === 'tel' || IDENTITY_FIELD.test(fieldHint)) {
      ctx.report({
        el,
        message: 'autoComplete="off" on a personal-data field forces users to retype information they already entered (WCAG 3.3.7) and defeats 1.3.5. Use a proper autofill token instead.',
      });
    }
  },
);
