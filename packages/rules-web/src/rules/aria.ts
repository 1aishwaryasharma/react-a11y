import {
  ABSTRACT_ROLES,
  ARIA_ATTRS,
  ROLES,
  ROLE_REQUIRED_ATTRS,
  hasAttr,
  isAriaHidden,
  staticString,
  staticValue,
} from '@react-a11y/core';
import type { ElementNode } from '@react-a11y/core';
import { defineRule, isDomTag } from '../util.js';

const DEPRECATED_ARIA = new Set(['aria-dropeffect', 'aria-grabbed']);

/** All aria-* attributes must exist in ARIA 1.2 and use correct (lowercase) casing. */
export const ariaAttrsValid = defineRule(
  {
    id: 'aria-attrs-valid',
    description: 'aria-* attributes must be valid ARIA 1.2 attributes.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    for (const name of el.attrs.keys()) {
      if (!/^aria-/i.test(name)) continue;
      const lower = name.toLowerCase();
      if (!ARIA_ATTRS.has(lower)) {
        ctx.report({ el, message: `"${name}" is not a valid ARIA attribute. Check the spelling against ARIA 1.2.` });
      } else if (name !== lower) {
        ctx.report({ el, message: `ARIA attributes are lowercase: use "${lower}" instead of "${name}".` });
      } else if (DEPRECATED_ARIA.has(lower)) {
        ctx.report({ el, message: `"${lower}" is deprecated in ARIA 1.2 and should be removed.`, severity: 'minor' });
      }
    }
  },
);

/** role values must be real, non-abstract ARIA roles. */
export const roleValid = defineRule(
  {
    id: 'aria-role-valid',
    description: 'role attributes must use valid, non-abstract ARIA roles.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    const role = staticString(el, 'role');
    if (role === undefined) return;
    for (const token of role.trim().split(/\s+/).filter(Boolean)) {
      if (ABSTRACT_ROLES.has(token)) {
        ctx.report({ el, message: `"${token}" is an abstract ARIA role and must not be used in content.` });
      } else if (!ROLES.has(token)) {
        ctx.report({ el, message: `"${token}" is not a valid ARIA role.` });
      }
    }
  },
);

/** Roles such as checkbox/slider have required ARIA states the author must set. */
export const ariaRequiredAttrs = defineRule(
  {
    id: 'aria-required-attrs',
    description: 'Elements with ARIA roles must have the states/properties that role requires.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (el.hasSpread) return;
    const role = staticString(el, 'role')?.trim();
    if (!role) return;
    const required = ROLE_REQUIRED_ATTRS[role];
    if (!required) return;
    const missing = required.filter((attr) => !hasAttr(el, attr));
    if (missing.length > 0) {
      ctx.report({ el, message: `role="${role}" requires ${missing.join(' and ')} to be set.` });
    }
  },
);

const ALWAYS_FOCUSABLE = new Set(['button', 'select', 'textarea', 'summary', 'iframe', 'embed']);

function isFocusable(el: ElementNode): boolean {
  if (staticValue(el, 'disabled') === true) return false;
  const tabIndex = staticValue(el, 'tabIndex');
  if (typeof tabIndex === 'number') return tabIndex >= 0;
  if (typeof tabIndex === 'string' && tabIndex.trim() !== '') return Number(tabIndex) >= 0;
  if (el.isComponent) return false;
  if (ALWAYS_FOCUSABLE.has(el.name)) return true;
  if ((el.name === 'a' || el.name === 'area') && hasAttr(el, 'href')) return true;
  if (el.name === 'input') return staticString(el, 'type') !== 'hidden';
  if ((el.name === 'audio' || el.name === 'video') && hasAttr(el, 'controls')) return true;
  return false;
}

/** aria-hidden="true" on focusable elements creates invisible tab stops. */
export const ariaHiddenFocusable = defineRule(
  {
    id: 'aria-hidden-focusable',
    description: 'aria-hidden="true" must not be used on focusable elements.',
    severity: 'serious',
    wcag: ['4.1.2', '1.3.1'],
  },
  (el, ctx) => {
    if (!isAriaHidden(el)) return;
    if (!isFocusable(el)) return;
    ctx.report({
      el,
      message: `<${el.name}> is focusable but aria-hidden — keyboard users land on an element screen readers cannot announce. Add tabIndex={-1} or remove aria-hidden.`,
    });
  },
);

const IMPLICIT_ROLES: Record<string, string> = {
  button: 'button',
  img: 'img',
  nav: 'navigation',
  main: 'main',
  aside: 'complementary',
  header: 'banner',
  footer: 'contentinfo',
  ul: 'list',
  ol: 'list',
  li: 'listitem',
  table: 'table',
  article: 'article',
  dialog: 'dialog',
  hr: 'separator',
  output: 'status',
  progress: 'progressbar',
  textarea: 'textbox',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
};

/** Explicit roles that duplicate the implicit role are noise. */
export const noRedundantRoles = defineRule(
  {
    id: 'no-redundant-roles',
    description: 'Elements should not declare a role identical to their implicit role.',
    severity: 'minor',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    const role = staticString(el, 'role')?.trim();
    if (!role) return;
    const implicit = el.name === 'a' && hasAttr(el, 'href') ? 'link' : IMPLICIT_ROLES[el.name];
    if (implicit === role) {
      ctx.report({ el, message: `role="${role}" is redundant — <${el.name}> already has that implicit role.` });
    }
  },
);

/** Enumerated ARIA attributes and their allowed tokens (ARIA 1.2). */
const ARIA_ENUM_VALUES: Record<string, Set<string>> = {
  'aria-atomic': new Set(['true', 'false']),
  'aria-autocomplete': new Set(['inline', 'list', 'both', 'none']),
  'aria-busy': new Set(['true', 'false']),
  'aria-checked': new Set(['true', 'false', 'mixed']),
  'aria-current': new Set(['page', 'step', 'location', 'date', 'time', 'true', 'false']),
  'aria-disabled': new Set(['true', 'false']),
  'aria-expanded': new Set(['true', 'false']),
  'aria-haspopup': new Set(['false', 'true', 'menu', 'listbox', 'tree', 'grid', 'dialog']),
  'aria-hidden': new Set(['true', 'false']),
  'aria-invalid': new Set(['true', 'false', 'grammar', 'spelling']),
  'aria-live': new Set(['off', 'polite', 'assertive']),
  'aria-modal': new Set(['true', 'false']),
  'aria-multiline': new Set(['true', 'false']),
  'aria-multiselectable': new Set(['true', 'false']),
  'aria-orientation': new Set(['horizontal', 'vertical', 'undefined']),
  'aria-pressed': new Set(['true', 'false', 'mixed']),
  'aria-readonly': new Set(['true', 'false']),
  'aria-required': new Set(['true', 'false']),
  'aria-selected': new Set(['true', 'false']),
  'aria-sort': new Set(['ascending', 'descending', 'none', 'other']),
};

const ARIA_NUMERIC = new Set([
  'aria-level', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
  'aria-colcount', 'aria-colindex', 'aria-colspan', 'aria-rowcount',
  'aria-rowindex', 'aria-rowspan', 'aria-posinset', 'aria-setsize',
]);

/** ARIA attributes with invalid values are ignored or misread by screen readers. */
export const ariaAttrValueValid = defineRule(
  {
    id: 'aria-attr-value-valid',
    description: 'ARIA attribute values must be valid for the attribute type.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    for (const [name, attr] of el.attrs) {
      if (attr.kind !== 'static') continue;
      const enums = ARIA_ENUM_VALUES[name];
      if (enums) {
        const v = typeof attr.value === 'boolean' ? String(attr.value) : attr.value;
        if (typeof v !== 'string' || !enums.has(v.trim().toLowerCase())) {
          ctx.report({
            el,
            message: `${name}=${JSON.stringify(attr.value)} is not valid — allowed: ${[...enums].join(', ')}.`,
          });
        }
      } else if (ARIA_NUMERIC.has(name)) {
        const v = attr.value;
        const ok = typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)));
        if (!ok) {
          ctx.report({ el, message: `${name}=${JSON.stringify(v)} must be a number.` });
        }
      }
    }
  },
);

/** scope is only valid on <th>. */
export const scopeOnTh = defineRule(
  {
    id: 'scope-attr-valid',
    description: 'The scope attribute is only valid on <th> elements.',
    severity: 'minor',
    wcag: ['1.3.1'],
  },
  (el, ctx) => {
    if (el.isComponent || !hasAttr(el, 'scope') || el.name === 'th') return;
    ctx.report({ el, message: `scope has no effect on <${el.name}> — it is only valid on <th>.` });
  },
);
