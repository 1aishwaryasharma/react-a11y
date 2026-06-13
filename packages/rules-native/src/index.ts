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
  validAccessibilityRole,
  validAccessibilityProps,
} from './rules/components.js';

export {
  touchableHasLabel,
  touchableHasRole,
  noNestedTouchables,
  touchTargetSize,
  imageHasLabel,
  textInputHasLabel,
  validAccessibilityRole,
  validAccessibilityProps,
};

/** The recommended React Native / Expo preset. */
export const nativeRules: Rule[] = [
  touchableHasLabel,
  touchableHasRole,
  noNestedTouchables,
  touchTargetSize,
  imageHasLabel,
  textInputHasLabel,
  validAccessibilityRole,
  validAccessibilityProps,
];
