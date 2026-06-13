import {
  attrProvidesValue,
  findAncestor,
  isAriaHidden,
  resolveWcag,
  staticString,
  type Diagnostic,
  type ElementNode,
  type ProjectPass,
  type RuleSetting,
  type Severity,
  type SourceLocation,
} from '@react-a11y/core';
import { defineRule } from '../util.js';

const RULE_ID = 'form-control-has-label';

/**
 * Registration entry for the cross-file label check. The actual work is the
 * project pass below (`createLabelForPass`); this exists so the rule appears in
 * `--list-rules` / `--coverage` and so `"form-control-has-label": "off"` is a
 * visible, documented config key. The per-element visitor is intentionally
 * empty — the analysis is project-wide, not per-file.
 */
export const formControlHasLabel = defineRule(
  {
    id: RULE_ID,
    description: 'Form controls must have a programmatically associated label (resolved across files).',
    severity: 'serious',
    wcag: ['1.3.1', '3.3.2', '4.1.2'],
    partial: true,
  },
  () => {},
);
const UNLABELED_INPUT_TYPES = new Set(['hidden', 'submit', 'reset', 'button', 'image']);

interface Candidate {
  filename: string;
  loc: SourceLocation;
  id: string;
  elName: string;
}

function isControl(el: ElementNode): boolean {
  if (el.isComponent || !['input', 'select', 'textarea'].includes(el.name)) return false;
  if (el.name === 'input') {
    const type = staticString(el, 'type')?.trim().toLowerCase();
    if (type && UNLABELED_INPUT_TYPES.has(type)) return false;
  }
  return true;
}

/**
 * Cross-file resolution of <label htmlFor> ↔ id. The per-file rule gives an
 * id the benefit of the doubt; this pass closes the loop once the whole
 * project has been seen: an id no <label htmlFor> ever references is an
 * unlabeled control. Any *dynamic* htmlFor in the project disables the pass —
 * it could reference anything.
 */
export function createLabelForPass(ruleSettings: Record<string, RuleSetting> = {}): ProjectPass {
  const setting = ruleSettings[RULE_ID];
  const htmlForIds = new Set<string>();
  let sawDynamicHtmlFor = false;
  const candidates: Candidate[] = [];

  return {
    collect(model, filename) {
      if (setting === 'off') return;
      for (const el of model.elements) {
        // Count htmlFor on DOM <label> and on components (design-system
        // <Label htmlFor> wrappers forward it to a real label).
        const attr = el.attrs.get('htmlFor') ?? (!el.isComponent && el.name === 'label' ? el.attrs.get('for') : undefined);
        if (attr) {
          if (attr.kind === 'static' && typeof attr.value === 'string') htmlForIds.add(attr.value);
          else sawDynamicHtmlFor = true;
        }
        if (!isControl(el) || el.hasSpread || isAriaHidden(el)) continue;
        if (
          attrProvidesValue(el, 'aria-label') ||
          attrProvidesValue(el, 'aria-labelledby') ||
          attrProvidesValue(el, 'title')
        ) continue;
        if (findAncestor(el, (a) => !a.isComponent && a.name === 'label')) continue;
        const id = staticString(el, 'id');
        if (id === undefined) continue; // no-id case is reported by the per-file rule
        candidates.push({ filename, loc: el.loc, id, elName: el.name });
      }
    },
    finalize(): Diagnostic[] {
      if (setting === 'off' || sawDynamicHtmlFor) return [];
      const severity: Severity = setting ?? 'serious';
      const wcag = resolveWcag(['1.3.1', '3.3.2', '4.1.2']);
      return candidates
        .filter((c) => !htmlForIds.has(c.id))
        .map((c) => ({
          ruleId: RULE_ID,
          message: `<${c.elName} id="${c.id}"> is not referenced by any <label htmlFor="${c.id}"> in the project — the control has no label after all.`,
          severity,
          file: c.filename,
          line: c.loc.line,
          column: c.loc.column,
          endLine: c.loc.endLine,
          endColumn: c.loc.endColumn,
          wcag,
        }));
    },
  };
}
