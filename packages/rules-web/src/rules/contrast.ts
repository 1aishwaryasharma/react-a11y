import {
  contrastFindings,
  targetSizeFindings,
  INTERACTIVE_TAGS,
  INTERACTIVE_ROLES,
  hasAttr,
  findAncestor,
  isVisuallyHidden,
  staticString,
  walkDescendants,
  type ElementNode,
} from '@aishware/react-a11y-core';
import { defineRule } from '../util.js';

/**
 * Elements whose `{expression}` child is text often enough to check its
 * colour. A bare `<div>{icon}</div>` is excluded: its expression child is
 * usually an element, and colouring the container says nothing about text.
 */
const TEXT_BEARING = new Set([
  'p', 'span', 'a', 'button', 'label', 'li', 'td', 'th', 'dt', 'dd',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i', 'small',
  'blockquote', 'cite', 'code', 'pre', 'figcaption', 'caption', 'legend',
  'summary', 'option', 'time', 'mark', 'abbr', 'q', 'sub', 'sup',
]);

/** Controls whose activation area includes an associated <label>. */
const LABEL_ACTIVATED = new Set(['checkbox', 'radio']);

/** The outermost element in this element's JSX tree. */
function treeRoot(el: ElementNode): ElementNode {
  let root = el;
  while (root.parent) root = root.parent;
  return root;
}

/** A `<label htmlFor={id}>` anywhere in the same tree clicks through to the control. */
function hasAssociatedLabel(el: ElementNode, id: string): boolean {
  let found = false;
  walkDescendants(treeRoot(el), (node) => {
    if (node.name === 'label' && staticString(node, 'htmlFor')?.trim() === id) found = true;
  });
  return found;
}

/**
 * True when the element is a checkbox/radio whose activation area is larger
 * than its own box — WCAG 2.5.8 measures the whole area, and a checkbox is
 * conventionally activated by its label (wrapping or `htmlFor`) or by a
 * clickable row, all of which are far past 24px.
 */
function activationAreaIsLarger(el: ElementNode): boolean {
  const type = staticString(el, 'type')?.trim().toLowerCase();
  if (el.name !== 'input' || !type || !LABEL_ACTIVATED.has(type)) return false;
  if (findAncestor(el, (a) => a.name === 'label' || hasAttr(a, 'onClick'))) return true;
  const id = staticString(el, 'id')?.trim();
  return id !== undefined && id.length > 0 && hasAssociatedLabel(el, id);
}

/**
 * WCAG 1.4.3 contrast for statically-known colors: inline literals and
 * Tailwind classes (`text-gray-400 bg-white`, `dark:` variants, conditional
 * class sets from cn()/clsx()). The background may come from the element or
 * from the nearest ancestor with a known background. Below 3:1 fails even
 * for large text → serious. Between 3:1 and 4.5:1 is only flagged when the
 * font size is also known to be small, so unknown-size text that might be
 * large never false-positives.
 */
export const colorContrast = defineRule(
  {
    id: 'color-contrast',
    description: 'Text color must meet WCAG contrast against its background (4.5:1, or 3:1 for large text).',
    severity: 'serious',
    wcag: ['1.4.3'],
    partial: true,
  },
  (el, ctx) => {
    // `{label}` is text too — the native pack has always checked it, and
    // skipping it here exempted every interpolated string on the web.
    if (el.isComponent || isVisuallyHidden(el, ctx.project)) return;
    if (!el.hasTextChild && !(el.hasExpressionChild && TEXT_BEARING.has(el.name))) return;
    for (const finding of contrastFindings(el, ctx.project)) {
      ctx.report({ el, message: finding.message, severity: finding.severity });
    }
  },
);

/**
 * WCAG 2.5.8 (AA, new in 2.2): pointer targets need 24×24 CSS px minimum.
 * Sizes come from inline literals or Tailwind classes (`h-5 w-5`, `size-6`).
 */
export const targetSize = defineRule(
  {
    id: 'target-size',
    description: 'Interactive targets should be at least 24×24px (44×44 recommended).',
    severity: 'serious',
    wcag: ['2.5.8', '2.5.5'],
    partial: true,
  },
  (el, ctx) => {
    if (el.isComponent) return;
    const interactive =
      ((el.name === 'a' || el.name === 'area') && hasAttr(el, 'href')) ||
      el.name === 'button' ||
      el.name === 'input' ||
      INTERACTIVE_ROLES.has(staticString(el, 'role')?.trim() ?? '') ||
      (INTERACTIVE_TAGS.has(el.name) && hasAttr(el, 'onClick'));
    if (!interactive) return;
    // A visually-hidden validation input is not a 1px pointer target.
    if (isVisuallyHidden(el, ctx.project)) return;
    if (activationAreaIsLarger(el)) return;
    for (const finding of targetSizeFindings(el, ctx.project)) {
      const via = finding.origin
        ? ` in the \`${finding.origin.label}\` variant`
        : finding.layer ? ' under a conditional class set' : '';
      const size = finding.size.includes('×') ? `${finding.size}px` : `${finding.size.replace('-', 'px-')}`;
      if (finding.tier === 'below-min') {
        ctx.report({
          ...finding.anchor,
          message: `${size} target${via} is below the 24×24px WCAG 2.5.8 (AA) minimum — hard to hit for users with motor impairments.`,
        });
      } else {
        ctx.report({
          ...finding.anchor,
          message: `${size} target${via} is below the recommended 44×44px (WCAG 2.5.5 AAA).`,
          severity: 'minor',
        });
      }
    }
  },
);
