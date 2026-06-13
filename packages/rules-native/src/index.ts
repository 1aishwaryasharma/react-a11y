import type { Rule } from '@react-a11y/core';
import {
  touchableHasLabel,
  touchableHasRole,
  noNestedTouchables,
  touchTargetSize,
} from './rules/touchables.js';
import {
  imageHasLabel,
  textInputHasLabel,
  switchHasLabel,
  modalHasRequestClose,
  validAccessibilityRole,
  validAccessibilityProps,
} from './rules/components.js';

export { RN_ROLES } from './rules/components.js';
import {
  accessibilityStateValid,
  liveRegionValid,
  noHiddenInteractive,
  accessibilityActionsHandled,
  validImportantForAccessibility,
  hiddenCrossPlatform,
} from './rules/state.js';
import {
  accessibleGroupingHidesInteractive,
  labelNeedsAccessible,
} from './rules/focus.js';
import { colorContrast } from './rules/contrast.js';
import { noOrientationLock } from './rules/expo-config.js';

export {
  touchableHasLabel,
  touchableHasRole,
  noNestedTouchables,
  touchTargetSize,
  imageHasLabel,
  textInputHasLabel,
  switchHasLabel,
  modalHasRequestClose,
  validAccessibilityRole,
  validAccessibilityProps,
  accessibilityStateValid,
  liveRegionValid,
  noHiddenInteractive,
  accessibilityActionsHandled,
  validImportantForAccessibility,
  hiddenCrossPlatform,
  accessibleGroupingHidesInteractive,
  labelNeedsAccessible,
  colorContrast,
  noOrientationLock,
};

/** The recommended React Native / Expo preset. */
export const nativeRules: Rule[] = [
  touchableHasLabel,
  touchableHasRole,
  noNestedTouchables,
  touchTargetSize,
  imageHasLabel,
  textInputHasLabel,
  switchHasLabel,
  modalHasRequestClose,
  validAccessibilityRole,
  validAccessibilityProps,
  accessibilityStateValid,
  liveRegionValid,
  noHiddenInteractive,
  accessibilityActionsHandled,
  validImportantForAccessibility,
  hiddenCrossPlatform,
  // focus & reading order
  accessibleGroupingHidesInteractive,
  labelNeedsAccessible,
  colorContrast,
  noOrientationLock,
];
