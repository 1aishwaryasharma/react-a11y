import { objectLiteralShape, staticExpression } from '@aishware/react-a11y-core';
import ts from 'typescript';
import { defineRule } from '../util.js';

const VALUE_KEYS = new Set(['max', 'min', 'now', 'text']);
const RANGE_KEYS = ['max', 'min', 'now'];

/** Validate the statically-known shape and values of accessibilityValue. */
export const accessibilityValueValid = defineRule(
  {
    description: 'accessibilityValue must use valid text and numeric range fields.',
    id: 'accessibility-value-valid',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    const attr = el.attrs.get('accessibilityValue');
    if (!attr) return;
    if (attr.kind === 'static') {
      ctx.report({ el, message: 'accessibilityValue must be an object, not a scalar value.' });
      return;
    }
    if (!attr.node) return;
    if (!ts.isObjectLiteralExpression(attr.node)) {
      const literal = staticExpression(attr.node);
      if (literal.kind === 'composite') {
        ctx.report({ el, message: 'accessibilityValue must be an object, not an array.' });
      } else if (literal.kind === 'value') {
        ctx.report({ el, message: 'accessibilityValue must be an object.' });
      }
      return;
    }

    const shape = objectLiteralShape(el, 'accessibilityValue');
    if (!shape?.complete) return;
    const keys = [...shape.properties.keys()];
    const unknown = keys.filter((key) => !VALUE_KEYS.has(key));
    if (unknown.length > 0) {
      ctx.report({
        el,
        message: `accessibilityValue contains unsupported ${unknown.length === 1 ? 'key' : 'keys'}: ${unknown.join(', ')}.`,
      });
      return;
    }

    const text = shape.properties.get('text');
    if (text) {
      const literal = staticExpression(text);
      if (literal.kind === 'composite' || (literal.kind === 'value' && typeof literal.value !== 'string')) {
        ctx.report({ el, message: 'accessibilityValue.text must be a string.' });
        return;
      }
    }

    const missingBounds = keys.includes('now')
      ? ['max', 'min'].filter((key) => !keys.includes(key))
      : [];
    if (missingBounds.length > 0) {
      ctx.report({
        el,
        message: `accessibilityValue.now requires min and max (missing: ${missingBounds.join(', ')}).`,
      });
      return;
    }

    const numericValues = new Map<string, number>();
    for (const key of RANGE_KEYS) {
      const value = shape.properties.get(key);
      if (!value) continue;
      const literal = staticExpression(value);
      if (literal.kind === 'unknown') continue;
      if (literal.kind === 'composite' || typeof literal.value !== 'number') {
        ctx.report({ el, message: `accessibilityValue.${key} must be a number.` });
        return;
      }
      numericValues.set(key, literal.value);
    }

    const max = numericValues.get('max');
    const min = numericValues.get('min');
    const now = numericValues.get('now');
    if (max !== undefined && min !== undefined && min > max) {
      ctx.report({
        el,
        message: `accessibilityValue.min must not exceed max (received ${min} > ${max}).`,
      });
      return;
    }
    if (
      max !== undefined &&
      min !== undefined &&
      now !== undefined &&
      (now < min || now > max)
    ) {
      ctx.report({
        el,
        message: `accessibilityValue must satisfy min ≤ now ≤ max (received ${min} ≤ ${now} ≤ ${max}).`,
      });
    }
  },
);
