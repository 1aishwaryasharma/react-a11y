import { hasAttr, isStaticTrue, objectLiteralKeys, staticString } from '@react-a11y/core';
import { defineRule, isHiddenFromAT, isRNComponent, isTouchable } from '../util.js';

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

const TEXT_INPUT = new Set(['TextInput']);

/**
 * A touchable or input hidden from assistive technology is still tappable —
 * sighted users get a control that screen reader users cannot even discover.
 */
export const noHiddenInteractive = defineRule(
  {
    id: 'no-hidden-interactive',
    description: 'Interactive elements must not be hidden from assistive technology.',
    severity: 'serious',
    wcag: ['4.1.2', '1.3.1'],
  },
  (el, ctx) => {
    if (!isTouchable(el) && !isRNComponent(el, TEXT_INPUT)) return;
    if (!isHiddenFromAT(el)) return;
    ctx.report({
      el,
      message: `<${el.name}> is interactive but hidden from assistive technology — screen reader users cannot discover or operate it. Remove the hiding prop or make the element non-interactive.`,
    });
  },
);

/**
 * accessibilityActions declares custom actions; onAccessibilityAction handles
 * them. One without the other is a silent no-op (actions never reachable, or a
 * handler that receives nothing).
 */
export const accessibilityActionsHandled = defineRule(
  {
    id: 'accessibility-actions-handled',
    description: 'accessibilityActions and onAccessibilityAction must be used together.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (el.hasSpread) return;
    const hasActions = hasAttr(el, 'accessibilityActions');
    const hasHandler = hasAttr(el, 'onAccessibilityAction');
    if (hasActions === hasHandler) return; // both or neither
    ctx.report({
      el,
      message: hasActions
        ? 'accessibilityActions is set but onAccessibilityAction is missing — the declared actions are never handled.'
        : 'onAccessibilityAction is set but accessibilityActions is missing — there are no actions for the handler to receive.',
    });
  },
);

const IMPORTANT_FOR_ACCESSIBILITY_VALUES = new Set(['auto', 'yes', 'no', 'no-hide-descendants']);

/** importantForAccessibility (Android) only accepts four values; others are ignored. */
export const validImportantForAccessibility = defineRule(
  {
    id: 'valid-important-for-accessibility',
    description: 'importantForAccessibility must be a value React Native recognizes.',
    severity: 'moderate',
    wcag: ['4.1.2', '1.3.1'],
  },
  (el, ctx) => {
    const v = staticString(el, 'importantForAccessibility');
    if (v === undefined || IMPORTANT_FOR_ACCESSIBILITY_VALUES.has(v.trim())) return;
    ctx.report({
      el,
      message: `importantForAccessibility="${v}" is not valid (allowed: auto, yes, no, no-hide-descendants) — it is silently ignored on Android.`,
    });
  },
);

/**
 * accessibilityElementsHidden hides a subtree on iOS only; importantForAccessibility
 * ="no-hide-descendants" does it on Android only. Using one without the other (and
 * without the unified aria-hidden) leaves the content exposed on the other platform.
 */
export const hiddenCrossPlatform = defineRule(
  {
    id: 'hidden-cross-platform',
    description: 'Hiding a subtree from assistive tech must cover both iOS and Android.',
    severity: 'moderate',
    wcag: ['1.3.1', '4.1.2'],
  },
  (el, ctx) => {
    if (el.hasSpread || isStaticTrue(el, 'aria-hidden')) return; // aria-hidden covers both
    const iosHidden = isStaticTrue(el, 'accessibilityElementsHidden');
    const androidHidden = staticString(el, 'importantForAccessibility')?.trim() === 'no-hide-descendants';
    if (iosHidden && !androidHidden) {
      ctx.report({
        el,
        message: 'accessibilityElementsHidden hides this subtree on iOS only. Add importantForAccessibility="no-hide-descendants" (or use aria-hidden) so TalkBack hides it on Android too.',
      });
    } else if (androidHidden && !iosHidden) {
      ctx.report({
        el,
        message: 'importantForAccessibility="no-hide-descendants" hides this subtree on Android only. Add accessibilityElementsHidden (or use aria-hidden) so VoiceOver hides it on iOS too.',
      });
    }
  },
);
