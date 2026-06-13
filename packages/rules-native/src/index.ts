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
import {
  accessibilityStateValid,
  liveRegionValid,
  noHiddenInteractive,
} from './rules/state.js';
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
  colorContrast,
  noOrientationLock,
];
