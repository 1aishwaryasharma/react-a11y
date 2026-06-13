import type { A11yConfig, ProjectPass, Rule } from '@aish/react-a11y-core';
import { buttonHasName, labelInName, mediaNoAutoplay } from './rules/names.js';
import { pointerCancellation, noOutlineNone } from './rules/interactions.js';
import {
  inputButtonHasName,
  accessibleAuthentication,
  errorIdentification,
  noAutocompleteOff,
} from './rules/forms.js';
import { metaViewportZoomable, noMetaRefresh, titleHasContent } from './rules/document.js';
import {
  headingOrder,
  listStructure,
  tableHasHeader,
  fieldsetHasLegend,
  ariaRequiredContext,
  meaningfulOrder,
  noDuplicateMain,
} from './rules/structure.js';
import { colorContrast, targetSize } from './rules/contrast.js';
import { createLabelForPass, formControlHasLabel } from './project/labels.js';

export { createLabelForPass, formControlHasLabel } from './project/labels.js';

/**
 * The project-wide passes the web pack runs (currently the cross-file label
 * resolution behind `form-control-has-label`). Single source of truth so the
 * CLI, VS Code, and any future consumer wire the same passes — the registered
 * `formControlHasLabel` rule is a no-op without this.
 */
export function webProjectPasses(config: A11yConfig): ProjectPass[] {
  return [createLabelForPass(config.rules)];
}

export {
  buttonHasName,
  labelInName,
  mediaNoAutoplay,
  pointerCancellation,
  noOutlineNone,
  inputButtonHasName,
  accessibleAuthentication,
  errorIdentification,
  noAutocompleteOff,
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
  colorContrast,
  targetSize,
};

/**
 * The web rule pack — the WCAG 2.2 criteria, document structure, focus
 * visibility and project-aware checks that eslint-plugin-jsx-a11y does NOT
 * cover. Pair this with eslint-plugin-jsx-a11y, which owns the standard web
 * a11y rules (alt text, ARIA validity, role/element semantics, …).
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
  // cross-file label resolution (project-wide; implemented as a pass)
  formControlHasLabel,
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
 * WCAG 2.2 A/AA success criteria that eslint-plugin-jsx-a11y covers. react-a11y
 * defers these to jsx-a11y (run it in your ESLint config), so the conformance
 * report can attribute them rather than counting them as gaps.
 */
export const JSX_A11Y_COVERED_WCAG: string[] = [
  '1.1.1', '1.2.2', '1.3.1', '1.3.5', '2.1.1', '2.2.2', '2.4.3', '2.4.4',
  '2.4.6', '3.1.1', '3.1.2', '3.2.1', '3.3.2', '4.1.2',
];
