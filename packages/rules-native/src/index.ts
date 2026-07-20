import type { Rule } from '@aishware/react-a11y-core';
import {
  accessibilityActionsHandled,
  imageHasLabel,
  modalHasRequestClose,
  switchHasLabel,
  textInputHasLabel,
  validAccessibilityProps,
  validAccessibilityRole,
} from './rules/components.js';
import { colorContrast } from './rules/contrast.js';
import { noOrientationLock } from './rules/expo-config.js';
import { accessibleGroupingHidesInteractive, labelNeedsAccessible } from './rules/focus.js';
import {
  hiddenCrossPlatform,
  noHiddenInteractive,
  validImportantForAccessibility,
} from './rules/platform.js';
import { accessibilityHintHasLabel, roleHasRequiredState } from './rules/semantics.js';
import {
  accessibilityStateValid,
  ariaStateValid,
  liveRegionValid,
} from './rules/state.js';
import { noDisableFontScaling } from './rules/text.js';
import {
  noNestedTouchables,
  touchableHasLabel,
  touchableHasRole,
  touchTargetSize,
} from './rules/touchables.js';
import { accessibilityValueValid } from './rules/value.js';

export { ARIA_PROPS, KNOWN_ARIA_PROPS } from './aria.js';
export { RN_ROLES, RN_ROLE_PROP_VALUES } from './rules/components.js';

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
  accessibilityValueValid,
  accessibilityHintHasLabel,
  ariaStateValid,
  liveRegionValid,
  roleHasRequiredState,
  noHiddenInteractive,
  accessibilityActionsHandled,
  validImportantForAccessibility,
  hiddenCrossPlatform,
  accessibleGroupingHidesInteractive,
  labelNeedsAccessible,
  colorContrast,
  noDisableFontScaling,
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
  accessibilityValueValid,
  accessibilityHintHasLabel,
  ariaStateValid,
  liveRegionValid,
  roleHasRequiredState,
  noHiddenInteractive,
  accessibilityActionsHandled,
  validImportantForAccessibility,
  hiddenCrossPlatform,
  // focus & reading order
  accessibleGroupingHidesInteractive,
  labelNeedsAccessible,
  colorContrast,
  noDisableFontScaling,
  noOrientationLock,
];
