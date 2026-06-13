import { isStaticTrue, staticString } from '@aish/react-a11y-core';
import {
  androidHidesSubtree,
  defineRule,
  iosHidesSubtree,
  isHiddenFromAT,
  isNativeInteractive,
} from '../util.js';

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
    if (!isNativeInteractive(el) || !isHiddenFromAT(el)) return;
    ctx.report({
      el,
      message: `<${el.name}> is interactive but hidden from assistive technology — screen reader users cannot discover or operate it. Remove the hiding prop or make the element non-interactive.`,
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
    const ios = iosHidesSubtree(el);
    const android = androidHidesSubtree(el);
    if (ios === android) return; // both or neither
    ctx.report({
      el,
      message: ios
        ? 'accessibilityElementsHidden hides this subtree on iOS only. Add importantForAccessibility="no-hide-descendants" (or use aria-hidden) so TalkBack hides it on Android too.'
        : 'importantForAccessibility="no-hide-descendants" hides this subtree on Android only. Add accessibilityElementsHidden (or use aria-hidden) so VoiceOver hides it on iOS too.',
    });
  },
);
