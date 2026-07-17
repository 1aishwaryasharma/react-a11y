import { objectLiteralKeys, staticString } from '@aishware/react-a11y-core';
import { ARIA_PROPS, BOOLEAN_ARIA_PROPS } from '../aria.js';
import { defineRule } from '../util.js';

const STATE_KEYS = new Set(['disabled', 'selected', 'checked', 'busy', 'expanded']);
const VALUE_KEYS = new Set(['min', 'max', 'now', 'text']);

/** Unknown keys in accessibilityState/accessibilityValue are silently dropped. */
export const accessibilityStateValid = defineRule(
  {
    id: 'accessibility-state-valid',
    description: 'accessibilityState/accessibilityValue must use the keys React Native supports.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    for (const [attrName, allowed] of [
      ['accessibilityState', STATE_KEYS],
      ['accessibilityValue', VALUE_KEYS],
    ] as const) {
      const keys = objectLiteralKeys(el, attrName);
      if (!keys) continue;
      for (const key of keys) {
        if (!allowed.has(key)) {
          ctx.report({
            el,
            message: `${attrName} key "${key}" is not supported (allowed: ${[...allowed].join(', ')}) — it is silently ignored on device.`,
          });
        }
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
    for (const prop of BOOLEAN_ARIA_PROPS) {
      const value = staticString(el, prop);
      if (value === undefined) continue;
      if (ARIA_PROPS.get(prop)!.kind === 'tristate' && value === 'mixed') continue;
      const state = prop.slice('aria-'.length);
      ctx.report({
        el,
        message:
          value === 'false'
            ? `${prop}="false" is a string, and strings are truthy in React Native — screen readers read this as ${state}. Use ${prop}={false}.`
            : `${prop}="${value}" is a string — React Native expects a boolean${ARIA_PROPS.get(prop)!.kind === 'tristate' ? ` (or "mixed")` : ''}. Use ${prop}={${value === 'true' ? 'true' : '…'}}.`,
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
