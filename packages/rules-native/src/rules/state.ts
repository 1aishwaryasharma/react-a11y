import { objectLiteralShape, staticExpression, staticString } from '@aishware/react-a11y-core';
import { ARIA_PROPS } from '../aria.js';
import {
  defineRule,
  staticAccessibilityStateValueValidity,
} from '../util.js';

const STATE_KEYS = new Set(['disabled', 'selected', 'checked', 'busy', 'expanded']);

/** Unknown keys in accessibilityState are silently dropped. */
export const accessibilityStateValid = defineRule(
  {
    description: 'accessibilityState must use the keys React Native supports.',
    id: 'accessibility-state-valid',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    const attr = el.attrs.get('accessibilityState');
    if (!attr) return;
    const shape = objectLiteralShape(el, 'accessibilityState');
    if (!shape) {
      // Statically known but not an object literal — a scalar or an array.
      const known =
        attr.kind === 'static' ||
        (attr.node !== undefined && staticExpression(attr.node).kind !== 'unknown');
      if (known) {
        ctx.report({
          el,
          message: 'accessibilityState must be an object.',
        });
      }
      return;
    }
    if (!shape.complete) return;
    for (const [key, value] of shape.properties) {
      if (!STATE_KEYS.has(key)) {
        ctx.report({
          el,
          message: `accessibilityState key "${key}" is not supported (allowed: ${[...STATE_KEYS].join(', ')}) — it is silently ignored on device.`,
        });
        continue;
      }
      if (staticAccessibilityStateValueValidity(key, value) === 'invalid') {
        ctx.report({
          el,
          message:
            key === 'checked'
              ? 'accessibilityState.checked must be a boolean or "mixed".'
              : `accessibilityState.${key} must be a boolean.`,
        });
      }
    }
  },
);

/**
 * Unlike the DOM, React Native treats aria-* state props as plain JS values —
 * the string "false" is truthy, so aria-checked="false" reads as CHECKED to a
 * screen reader. A habit carried over from web markup, where string booleans
 * are the norm.
 */
export const ariaStateValid = defineRule(
  {
    id: 'aria-state-valid',
    description: 'Boolean aria-* state props must be booleans — strings are truthy in React Native.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    for (const [prop, def] of ARIA_PROPS) {
      if (def.kind !== 'boolean' && def.kind !== 'tristate') continue;
      const value = staticString(el, prop);
      if (value === undefined) continue;
      const tristate = def.kind === 'tristate';
      if (tristate && value === 'mixed') continue;
      const state = prop.slice('aria-'.length);
      const message =
        value === 'false'
          ? `${prop}="false" is a string, and strings are truthy in React Native — screen readers read this as ${state}. Use ${prop}={false}.`
          : `${prop}="${value}" is a string — React Native expects a boolean${tristate ? ' (or "mixed")' : ''}. Use ${prop}={${value === 'true' ? 'true' : '…'}}.`;
      ctx.report({
        el,
        message,
        ...(value === 'true' ? { severity: 'moderate' as const } : {}),
      });
    }
  },
);

const LIVE_REGION_VALUES = new Set(['none', 'polite', 'assertive']);
const ARIA_LIVE_VALUES = new Set(['off', 'polite', 'assertive']);

/** Status updates only reach screen readers when the live region value is valid. */
export const liveRegionValid = defineRule(
  {
    id: 'live-region-valid',
    description: 'accessibilityLiveRegion / aria-live must use a supported value.',
    severity: 'serious',
    wcag: ['4.1.3'],
  },
  (el, ctx) => {
    const native = staticString(el, 'accessibilityLiveRegion');
    if (native !== undefined && !LIVE_REGION_VALUES.has(native.trim())) {
      ctx.report({
        el,
        message: `accessibilityLiveRegion="${native}" is not valid (allowed: none, polite, assertive) — status changes won't be announced.`,
      });
    }
    const aria = staticString(el, 'aria-live');
    if (aria !== undefined && !ARIA_LIVE_VALUES.has(aria.trim())) {
      ctx.report({
        el,
        message: `aria-live="${aria}" is not valid (allowed: off, polite, assertive) — status changes won't be announced.`,
      });
    }
  },
);
