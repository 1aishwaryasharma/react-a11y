import type { Rule } from '@aishware/react-a11y-core';
import { liveRegionAndroidOnly } from './rules/announce.js';
import {
  accessibilityActionsHandled,
  accessibilityLanguageValid,
  imageHasLabel,
  labelNotAllCaps,
  modalHasRequestClose,
  switchHasLabel,
  textInputHasLabel,
  validAccessibilityProps,
  validAccessibilityRole,
} from './rules/components.js';
import { colorContrast } from './rules/contrast.js';
import { noOrientationLock } from './rules/expo-config.js';
import { accessibleGroupingHidesInteractive, labelNeedsAccessible } from './rules/focus.js';
import { animationReduceMotion } from './rules/motion.js';
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
import { noDisableFontScaling, textFixedHeight, textOnPressHasRole } from './rules/text.js';
import {
  noNestedTouchables,
  touchableHasLabel,
  touchableHasRole,
  touchTargetSize,
} from './rules/touchables.js';
import { accessibilityValueValid } from './rules/value.js';

export { ARIA_PROPS, KNOWN_ARIA_PROPS } from './aria.js';
export { RN_ROLES, RN_ROLE_PROP_VALUES } from './rules/components.js';
export { isIconComponent } from './util.js';

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
  textFixedHeight,
  textOnPressHasRole,
  liveRegionAndroidOnly,
  animationReduceMotion,
  accessibilityLanguageValid,
  labelNotAllCaps,
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
  // text, color, motion
  colorContrast,
  noDisableFontScaling,
  textFixedHeight,
  textOnPressHasRole,
  labelNotAllCaps,
  accessibilityLanguageValid,
  // announcements & motion (platform asymmetries)
  liveRegionAndroidOnly,
  animationReduceMotion,
  noOrientationLock,
];
