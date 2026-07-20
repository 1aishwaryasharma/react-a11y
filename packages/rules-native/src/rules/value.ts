import { objectLiteralShape } from '@aishware/react-a11y-core';
import ts from 'typescript';
import { defineRule } from '../util.js';

const VALUE_KEYS = new Set(['max', 'min', 'now', 'text']);
const RANGE_KEYS = ['max', 'min', 'now'];

function knownLiteralType(node: ts.Expression): 'number' | 'other' | 'string' | undefined {
  if (ts.isNumericLiteral(node)) return 'number';
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken ||
      node.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(node.operand)
  ) {
    return 'number';
  }
  if (ts.isPrefixUnaryExpression(node) && ts.isBigIntLiteral(node.operand)) {
    return 'other';
  }
  if (ts.isStringLiteralLike(node)) return 'string';
  if (
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    ts.isArrayLiteralExpression(node) ||
    ts.isBigIntLiteral(node) ||
    ts.isObjectLiteralExpression(node) ||
    ts.isVoidExpression(node) ||
    (ts.isIdentifier(node) && node.text === 'undefined')
  ) {
    return 'other';
  }
  return undefined;
}

function numericLiteral(node: ts.Expression): number | undefined {
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (
    ts.isPrefixUnaryExpression(node) &&
    (node.operator === ts.SyntaxKind.MinusToken ||
      node.operator === ts.SyntaxKind.PlusToken) &&
    ts.isNumericLiteral(node.operand)
  ) {
    const value = Number(node.operand.text);
    return node.operator === ts.SyntaxKind.MinusToken ? -value : value;
  }
  return undefined;
}

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
      if (ts.isArrayLiteralExpression(attr.node)) {
        ctx.report({ el, message: 'accessibilityValue must be an object, not an array.' });
      } else if (knownLiteralType(attr.node) !== undefined) {
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
    const textType = text ? knownLiteralType(text) : undefined;
    if (textType === 'number' || textType === 'other') {
      ctx.report({ el, message: 'accessibilityValue.text must be a string.' });
      return;
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
      const type = knownLiteralType(value);
      if (type === 'other' || type === 'string') {
        ctx.report({ el, message: `accessibilityValue.${key} must be a number.` });
        return;
      }
      const numeric = numericLiteral(value);
      if (numeric !== undefined) numericValues.set(key, numeric);
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
