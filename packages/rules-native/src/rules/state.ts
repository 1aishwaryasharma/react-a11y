import { objectLiteralKeys, staticString } from '@aish/react-a11y-core';
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
