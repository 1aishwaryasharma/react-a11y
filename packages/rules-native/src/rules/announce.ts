import { hasAttr, staticString } from '@aishware/react-a11y-core';
import { defineRule } from '../util.js';

const SILENT_VALUES = new Set(['none', 'off']);

/**
 * `accessibilityLiveRegion` / `aria-live` only work on Android. On iOS the
 * prop silently does nothing, so status messages, validation errors and
 * toasts that rely on it are never announced by VoiceOver. The file needs a
 * matching `AccessibilityInfo.announceForAccessibility` call for iOS.
 */
export const liveRegionAndroidOnly = defineRule(
  {
    description: 'Live regions are Android-only; announce the change for iOS too.',
    id: 'live-region-android-only',
    severity: 'moderate',
    wcag: ['4.1.3'],
    partial: true,
  },
  (el, ctx) => {
    if (el.hasSpread) return;
    const prop = ['accessibilityLiveRegion', 'aria-live'].find((name) => hasAttr(el, name));
    if (!prop) return;
    const value = staticString(el, prop)?.trim();
    if (value !== undefined && SILENT_VALUES.has(value)) return;
    if (ctx.sourceFile.text.includes('announceForAccessibility')) return;
    ctx.report({
      el,
      message: `${prop} only works on Android — VoiceOver on iOS ignores it, so this status change is never announced there. Also call AccessibilityInfo.announceForAccessibility(message) when the content changes.`,
    });
  },
);
