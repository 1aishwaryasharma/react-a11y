import {
  inlineStyleNumber,
  isAriaHidden,
  isPresentational,
  staticString,
  staticValue,
  walkDescendants,
  type ElementNode,
} from '@aishware/react-a11y-core';
import { defineRule, isDomTag } from '../util.js';
import type { Rule, RuleContext } from '@aishware/react-a11y-core';

function headingLevel(el: ElementNode): number | undefined {
  const m = /^h([1-6])$/.exec(el.name);
  if (m && !el.isComponent) return Number(m[1]);
  if (staticString(el, 'role')?.trim() === 'heading') {
    const level = staticValue(el, 'aria-level');
    if (typeof level === 'number') return level;
  }
  return undefined;
}

/**
 * Skipped heading levels (h2 → h4) break screen reader outline navigation.
 * Files are fragments, so only *relative* skips within a file are flagged —
 * a component that starts at h3 is fine.
 */
export const headingOrder: Rule = {
  meta: {
    id: 'heading-order',
    description: 'Heading levels must not skip (e.g. h2 followed by h4).',
    severity: 'moderate',
    platforms: ['web'],
    wcag: ['1.3.1', '2.4.6'],
  },
  create(ctx: RuleContext) {
    let last: number | undefined;
    return {
      element(el: ElementNode) {
        const level = headingLevel(el);
        if (level === undefined) return;
        if (last !== undefined && level > last + 1) {
          ctx.report({
            el,
            message: `Heading level skips from h${last} to h${level}. Screen reader users navigating by heading lose the document structure.`,
          });
        }
        last = level;
      },
    };
  },
};

const LIST_CONTAINERS = new Set(['ul', 'ol', 'menu']);
const LIST_IGNORED_CHILDREN = new Set(['li', 'script', 'template']);

/** <ul>/<ol> may only contain <li>; stray wrappers break list semantics. */
export const listStructure = defineRule(
  {
    id: 'list-structure',
    description: 'Lists must contain only <li> children, and <li> must sit in a list.',
    severity: 'moderate',
    wcag: ['1.3.1'],
  },
  (el, ctx) => {
    if (el.isComponent) return;
    if (LIST_CONTAINERS.has(el.name) && !isPresentational(el)) {
      for (const child of el.childElements) {
        if (child.isComponent || child.hasSpread) continue; // may render <li>
        if (!LIST_IGNORED_CHILDREN.has(child.name) && !isPresentational(child)) {
          ctx.report({
            el: child,
            message: `<${child.name}> is a direct child of <${el.name}> — screen readers expect only <li> there and may misreport list size.`,
          });
        }
      }
    }
    if (el.name === 'li' && el.parent && !el.parent.isComponent && !LIST_CONTAINERS.has(el.parent.name)) {
      ctx.report({ el, message: `<li> is inside <${el.parent.name}> — list items must be direct children of <ul>, <ol> or <menu>.` });
    }
  },
);

/** Data tables need header cells for screen reader row/column context. */
export const tableHasHeader = defineRule(
  {
    id: 'table-has-header',
    description: 'Data tables must have header cells (<th> or role="columnheader"/"rowheader").',
    severity: 'moderate',
    wcag: ['1.3.1'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'table')) return;
    if (isPresentational(el) || isAriaHidden(el) || el.hasSpread) return;
    let hasHeader = false;
    let hasData = false;
    let unknowable = false;
    walkDescendants(el, (child) => {
      if (child.isComponent || child.hasSpread || child.hasExpressionChild) unknowable = true;
      if (child.name === 'th') hasHeader = true;
      const role = staticString(child, 'role')?.trim();
      if (role === 'columnheader' || role === 'rowheader') hasHeader = true;
      if (child.name === 'td') hasData = true;
    });
    if (el.hasExpressionChild) unknowable = true;
    if (hasHeader || unknowable || !hasData) return;
    ctx.report({
      el,
      message: '<table> has data cells but no header cells — screen readers cannot announce row/column context. Add <th scope="col"> / <th scope="row">.',
    });
  },
);

/** Grouped controls (especially radio groups) need a <legend>. */
export const fieldsetHasLegend = defineRule(
  {
    id: 'fieldset-has-legend',
    description: '<fieldset> must contain a <legend> naming the group.',
    severity: 'moderate',
    wcag: ['1.3.1', '3.3.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'fieldset')) return;
    if (el.hasSpread || el.hasExpressionChild) return;
    const hasLegend = el.childElements.some((c) => c.name === 'legend' || c.isComponent);
    if (hasLegend) return;
    ctx.report({ el, message: '<fieldset> has no <legend> — screen readers announce the controls without their group name.' });
  },
);

/**
 * <main> must be unique: it is the screen reader's "skip to content" target,
 * and duplicates make landmark navigation ambiguous.
 */
export const noDuplicateMain: Rule = {
  meta: {
    id: 'no-duplicate-main',
    description: 'A page must have only one <main> landmark.',
    severity: 'moderate',
    platforms: ['web'],
    wcag: ['1.3.1', '2.4.1'],
    partial: true,
  },
  create(ctx: RuleContext) {
    let seen = false;
    return {
      element(el: ElementNode) {
        const isMain = (!el.isComponent && el.name === 'main') || staticString(el, 'role')?.trim() === 'main';
        if (!isMain) return;
        if (seen) {
          ctx.report({ el, message: 'Multiple <main> landmarks — screen reader users cannot tell which one is the page content.' });
        }
        seen = true;
      },
    };
  },
};

/**
 * WCAG 1.3.2: CSS `order` makes visual order diverge from DOM order, which
 * is what screen readers and the tab sequence follow.
 */
export const meaningfulOrder = defineRule(
  {
    id: 'meaningful-order',
    description: 'Avoid CSS order — it desynchronizes visual order from reading/tab order.',
    severity: 'minor',
    wcag: ['1.3.2', '2.4.3'],
    partial: true,
  },
  (el, ctx) => {
    if (el.isComponent) return;
    const order = inlineStyleNumber(el, 'order');
    if (order !== undefined && order !== 0) {
      ctx.report({
        el,
        message: `Inline style order: ${order} reorders content visually while screen readers and Tab follow DOM order — verify the reading sequence still makes sense.`,
      });
    }
  },
);

/** Roles that are only valid inside a specific parent role (ARIA 1.2). */
const REQUIRED_CONTEXT: Record<string, string[]> = {
  menuitem: ['menu', 'menubar'],
  menuitemcheckbox: ['menu', 'menubar'],
  menuitemradio: ['menu', 'menubar'],
  tab: ['tablist'],
  option: ['listbox'],
  treeitem: ['tree', 'treeitem', 'group'],
  listitem: ['list'],
  row: ['table', 'grid', 'treegrid', 'rowgroup'],
  gridcell: ['row'],
  rowheader: ['row'],
  columnheader: ['row'],
  cell: ['row'],
};

/** Implicit roles of DOM containers, for matching required context. */
const IMPLICIT_CONTEXT_ROLES: Record<string, string> = {
  ul: 'list', ol: 'list', menu: 'list',
  table: 'table', tr: 'row', tbody: 'rowgroup', thead: 'rowgroup', tfoot: 'rowgroup',
};

/**
 * Flags roles placed outside their required parent — but only when the full
 * ancestor chain in the file is plain DOM, so composition through components
 * never false-positives.
 */
export const ariaRequiredContext = defineRule(
  {
    id: 'aria-required-context',
    description: 'ARIA roles that require a parent role must be inside it.',
    severity: 'moderate',
    wcag: ['1.3.1', '4.1.2'],
  },
  (el, ctx) => {
    const role = staticString(el, 'role')?.trim();
    if (!role) return;
    const required = REQUIRED_CONTEXT[role];
    if (!required) return;
    if (!el.parent) return; // file root — context supplied by the consumer
    for (let a = el.parent; a; a = a.parent!) {
      if (a.isComponent || a.hasSpread) return; // context may come from the component
      const ancestorRole = staticString(a, 'role')?.trim() ?? IMPLICIT_CONTEXT_ROLES[a.name];
      if (ancestorRole && required.includes(ancestorRole)) return;
      if (!a.parent) break;
    }
    ctx.report({
      el,
      message: `role="${role}" must be inside ${required.map((r) => `role="${r}"`).join(' or ')} — without it, screen readers cannot relate it to its group.`,
    });
  },
);
