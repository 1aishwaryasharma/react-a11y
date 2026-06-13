import type { Rule } from '@react-a11y/core';
import {
  imgAlt,
  anchorHasContent,
  anchorAmbiguousText,
  buttonHasName,
  headingHasContent,
  iframeHasTitle,
  htmlHasLang,
  labelInName,
  mediaHasCaptions,
  mediaNoAutoplay,
} from './rules/names.js';
import {
  ariaAttrsValid,
  ariaAttrValueValid,
  roleValid,
  ariaRequiredAttrs,
  ariaHiddenFocusable,
  roleSupportsAriaProps,
  ariaUnsupportedElements,
  ariaActivedescendantHasTabindex,
  noRedundantRoles,
  scopeOnTh,
} from './rules/aria.js';
import {
  noStaticElementInteractions,
  clickEventsHaveKeyEvents,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
  noOutlineNone,
  pointerCancellation,
} from './rules/interactions.js';
import {
  interactiveSupportsFocus,
  noNoninteractiveElementInteractions,
  noInteractiveElementToNoninteractiveRole,
  noNoninteractiveElementToInteractiveRole,
  noNoninteractiveTabindex,
  preferTagOverRole,
} from './rules/roles.js';
import {
  formControlHasLabel,
  anchorIsValid,
  autocompleteValid,
  inputButtonHasName,
  accessibleAuthentication,
  errorIdentification,
  noAutocompleteOff,
} from './rules/forms.js';
import { colorContrast, targetSize } from './rules/contrast.js';
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
  meaningfulOrder,
  noDuplicateMain,
} from './rules/structure.js';

export { createLabelForPass } from './project/labels.js';

export {
  imgAlt,
  anchorHasContent,
  anchorAmbiguousText,
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
  roleSupportsAriaProps,
  ariaUnsupportedElements,
  ariaActivedescendantHasTabindex,
  noRedundantRoles,
  scopeOnTh,
  noStaticElementInteractions,
  clickEventsHaveKeyEvents,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
  noOutlineNone,
  interactiveSupportsFocus,
  noNoninteractiveElementInteractions,
  noInteractiveElementToNoninteractiveRole,
  noNoninteractiveElementToInteractiveRole,
  noNoninteractiveTabindex,
  preferTagOverRole,
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
  meaningfulOrder,
  noDuplicateMain,
  labelInName,
  pointerCancellation,
  errorIdentification,
  noAutocompleteOff,
  colorContrast,
  targetSize,
};

/**
 * The default web preset — the WCAG 2.2 criteria, document structure, focus
 * visibility and project-aware checks that eslint-plugin-jsx-a11y does NOT
 * cover. Pair this with eslint-plugin-jsx-a11y, which owns the rest (see
 * `webRulesJsxA11yOverlap`).
 */
export const webRules: Rule[] = [
  // names jsx-a11y lacks
  buttonHasName,
  inputButtonHasName,
  // document
  titleHasContent,
  metaViewportZoomable,
  noMetaRefresh,
  // media
  mediaNoAutoplay,
  // aria (required-context has no jsx-a11y equivalent)
  ariaRequiredContext,
  // structure
  headingOrder,
  listStructure,
  tableHasHeader,
  fieldsetHasLegend,
  noDuplicateMain,
  // focus visibility
  noOutlineNone,
  // forms (WCAG 2.2)
  accessibleAuthentication,
  errorIdentification,
  noAutocompleteOff,
  // pointer, contrast, target size, reading order, label-in-name (WCAG 2.1/2.2)
  labelInName,
  pointerCancellation,
  colorContrast,
  targetSize,
  meaningfulOrder,
];

/**
 * Rules that duplicate eslint-plugin-jsx-a11y, the canonical implementation.
 * OFF by default — enable (via `webRulesAll` / CLI `--full`) only if you are
 * not already running jsx-a11y, to avoid double-reporting.
 */
export const webRulesJsxA11yOverlap: Rule[] = [
  // names & alternatives
  imgAlt,
  anchorHasContent,
  anchorAmbiguousText,
  anchorIsValid,
  headingHasContent,
  iframeHasTitle,
  // document
  htmlHasLang,
  langValid,
  // media
  mediaHasCaptions,
  // aria
  ariaAttrsValid,
  ariaAttrValueValid,
  roleValid,
  ariaRequiredAttrs,
  ariaHiddenFocusable,
  roleSupportsAriaProps,
  ariaUnsupportedElements,
  ariaActivedescendantHasTabindex,
  noRedundantRoles,
  scopeOnTh,
  // roles & semantics
  interactiveSupportsFocus,
  noNoninteractiveElementInteractions,
  noInteractiveElementToNoninteractiveRole,
  noNoninteractiveElementToInteractiveRole,
  noNoninteractiveTabindex,
  preferTagOverRole,
  // interactions & focus
  noStaticElementInteractions,
  clickEventsHaveKeyEvents,
  mouseEventsHaveKeyEvents,
  noPositiveTabindex,
  noAutofocus,
  noAccessKey,
  noDistractingElements,
  // forms
  formControlHasLabel,
  autocompleteValid,
];

/**
 * Every web rule, including the jsx-a11y overlap. Use this for a standalone
 * scan when jsx-a11y is not part of the project.
 */
export const webRulesAll: Rule[] = [...webRules, ...webRulesJsxA11yOverlap];
