import type { Rule } from '@react-a11y/core';
import {
  imgAlt,
  anchorHasContent,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  htmlHasLang,
  mediaHasCaptions,
} from './rules/names.js';
import {
  ariaAttrsValid,
  roleValid,
  ariaRequiredAttrs,
  ariaHiddenFocusable,
  noRedundantRoles,
  scopeOnTh,
} from './rules/aria.js';
import {
  noStaticElementInteractions,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
} from './rules/interactions.js';
import { formControlHasLabel, anchorIsValid } from './rules/forms.js';

export {
  imgAlt,
  anchorHasContent,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  htmlHasLang,
  mediaHasCaptions,
  ariaAttrsValid,
  roleValid,
  ariaRequiredAttrs,
  ariaHiddenFocusable,
  noRedundantRoles,
  scopeOnTh,
  noStaticElementInteractions,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
  formControlHasLabel,
  anchorIsValid,
};

/** The recommended web preset: every rule, mapped to WCAG 2.2. */
export const webRules: Rule[] = [
  imgAlt,
  anchorHasContent,
  anchorIsValid,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  htmlHasLang,
  mediaHasCaptions,
  ariaAttrsValid,
  roleValid,
  ariaRequiredAttrs,
  ariaHiddenFocusable,
  noRedundantRoles,
  scopeOnTh,
  noStaticElementInteractions,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
  formControlHasLabel,
];
