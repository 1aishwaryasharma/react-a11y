import {
  attrProvidesValue,
  hasAttr,
  objectLiteralShape,
  staticString,
  type ElementNode,
} from '@aishware/react-a11y-core';
import {
  defineRule,
  isHiddenFromAT,
  isRNElement,
  isSwitch,
  mayHaveNativeAccessibleName,
  staticAccessibilityStateValueValidity,
} from '../util.js';

/**
 * A hint supplements an accessible name; it cannot identify an element by
 * itself. Child content is accepted because React Native derives names from
 * descendant Text nodes.
 */
export const accessibilityHintHasLabel = defineRule(
  {
    description: 'accessibilityHint must supplement an accessible name.',
    id: 'accessibility-hint-has-label',
    severity: 'serious',
    wcag: ['3.3.2', '4.1.2'],
  },
  (el, ctx) => {
    if (
      !isRNElement(el) ||
      !attrProvidesValue(el, 'accessibilityHint') ||
      el.hasSpread ||
      isHiddenFromAT(el)
    ) {
      return;
    }
    if (mayHaveNativeAccessibleName(el)) return;
    ctx.report({
      el,
      message: 'accessibilityHint describes an outcome but the element has no accessible name. Add accessibilityLabel or text content.',
    });
  },
);

const CHECKED_ROLES = new Set(['checkbox', 'radio', 'switch', 'togglebutton']);

function attrMayProvideState(el: ElementNode, key: string, name: string): boolean {
  const attr = el.attrs.get(name);
  if (!attr) return false;
  if (attr.kind === 'static') {
    return (
      typeof attr.value === 'boolean' ||
      (key === 'checked' && attr.value === 'mixed')
    );
  }
  return (
    !attr.node ||
    staticAccessibilityStateValueValidity(key, attr.node) !== 'invalid'
  );
}

function hasState(el: ElementNode, key: string, ariaProp: string): boolean {
  if (attrMayProvideState(el, key, ariaProp)) return true;
  const state = el.attrs.get('accessibilityState');
  if (!state) return false;
  const shape = objectLiteralShape(el, 'accessibilityState');
  if (shape) {
    if (!shape.complete) return true;
    const initializer = shape.properties.get(key);
    if (!initializer) return false;
    return staticAccessibilityStateValueValidity(key, initializer) !== 'invalid';
  }
  // A present dynamic expression or object spread may provide the state.
  return state.kind === 'expression';
}

function staticEffectiveRole(el: ElementNode): string | undefined {
  if (hasAttr(el, 'role')) {
    // `role` takes precedence over accessibilityRole. A dynamic value makes
    // the effective role unknowable, so falling back would create false positives.
    return staticString(el, 'role')?.trim().toLowerCase();
  }
  return staticString(el, 'accessibilityRole')?.trim().toLowerCase();
}

/**
 * Custom toggles need explicit checked/selected state. Stock Switch exposes its
 * value natively, so it is intentionally excluded.
 */
export const roleHasRequiredState = defineRule(
  {
    description: 'Toggle and tab roles must expose their current accessibility state.',
    id: 'role-has-required-state',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (!isRNElement(el) || el.hasSpread || isHiddenFromAT(el) || isSwitch(el)) return;
    const role = staticEffectiveRole(el);
    if (!role) return;

    if (CHECKED_ROLES.has(role) && !hasState(el, 'checked', 'aria-checked')) {
      ctx.report({
        el,
        message: `${role} role has no checked state. Add accessibilityState={{ checked: … }} or aria-checked.`,
      });
    } else if (role === 'tab' && !hasState(el, 'selected', 'aria-selected')) {
      ctx.report({
        el,
        message: 'tab role has no selected state. Add accessibilityState={{ selected: … }} or aria-selected.',
      });
    }
  },
);
