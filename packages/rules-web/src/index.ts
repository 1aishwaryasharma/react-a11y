import type { Rule } from '@react-a11y/core';
import {
  imgAlt,
  anchorHasContent,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  htmlHasLang,
  mediaHasCaptions,
  mediaNoAutoplay,
} from './rules/names.js';
import {
  ariaAttrsValid,
  ariaAttrValueValid,
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
  noOutlineNone,
} from './rules/interactions.js';
import {
  formControlHasLabel,
  anchorIsValid,
  autocompleteValid,
  inputButtonHasName,
  accessibleAuthentication,
} from './rules/forms.js';
import {
  langValid,
  metaViewportZoomable,
  noMetaRefresh,
  titleHasContent,
} from './rules/document.js';
import {
  headingOrder,
  listStructure,
  tableHasHeader,
  fieldsetHasLegend,
  ariaRequiredContext,
} from './rules/structure.js';

export {
  imgAlt,
  anchorHasContent,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  htmlHasLang,
  mediaHasCaptions,
  mediaNoAutoplay,
  ariaAttrsValid,
  ariaAttrValueValid,
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
  noOutlineNone,
  formControlHasLabel,
  anchorIsValid,
  autocompleteValid,
  inputButtonHasName,
  accessibleAuthentication,
  langValid,
  metaViewportZoomable,
  noMetaRefresh,
  titleHasContent,
  headingOrder,
  listStructure,
  tableHasHeader,
  fieldsetHasLegend,
  ariaRequiredContext,
};

/** The recommended web preset: every rule, mapped to WCAG 2.2. */
export const webRules: Rule[] = [
  // names & alternatives
  imgAlt,
  anchorHasContent,
  anchorIsValid,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  inputButtonHasName,
  // document
  htmlHasLang,
  langValid,
  titleHasContent,
  metaViewportZoomable,
  noMetaRefresh,
  // media
  mediaHasCaptions,
  mediaNoAutoplay,
  // aria
  ariaAttrsValid,
  ariaAttrValueValid,
  roleValid,
  ariaRequiredAttrs,
  ariaRequiredContext,
  ariaHiddenFocusable,
  noRedundantRoles,
  scopeOnTh,
  // structure
  headingOrder,
  listStructure,
  tableHasHeader,
  fieldsetHasLegend,
  // interactions & focus
  noStaticElementInteractions,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
  noOutlineNone,
  // forms
  formControlHasLabel,
  autocompleteValid,
  accessibleAuthentication,
];
