import { attrProvidesValue, hasAttr, isStaticTrue, staticValue, walkDescendants } from '@aish/react-a11y-core';
import type { ElementNode } from '@aish/react-a11y-core';
import { defineRule, isHiddenFromAT, isNativeInteractive, isRNComponent } from '../util.js';

/** Containers whose `accessible` prop groups (or fails to group) their subtree. */
const GROUPING_CONTAINERS = new Set(['View', 'SafeAreaView']);

const TAPPABLE = new Set(['Text', 'View', 'Image', 'Pressable']);

/**
 * A descendant the screen reader would otherwise focus on its own: a native
 * interactive control, an element explicitly marked accessible, or a tappable
 * RN element with onPress.
 */
function isInteractiveDescendant(el: ElementNode): boolean {
  if (isNativeInteractive(el)) return true;
  if (isStaticTrue(el, 'accessible')) return true;
  if (isRNComponent(el, TAPPABLE) && hasAttr(el, 'onPress')) return true;
  return false;
}

/**
 * WCAG 2.4.3 / 1.3.2. `accessible={true}` collapses a view and ALL its children
 * into a single focus stop and concatenates their labels — React Native's docs
 * note a component "cannot be both an accessibility element and an accessibility
 * container". When the grouped subtree contains interactive controls, those
 * controls become unreachable and the reading order silently changes.
 */
export const accessibleGroupingHidesInteractive = defineRule(
  {
    id: 'accessible-grouping-hides-interactive',
    description: 'accessible={true} containers must not wrap interactive children.',
    severity: 'serious',
    wcag: ['2.4.3', '4.1.2'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, GROUPING_CONTAINERS) || el.hasSpread) return;
    if (!isStaticTrue(el, 'accessible')) return;
    let found: ElementNode | undefined;
    walkDescendants(el, (child) => {
      if (!found && isInteractiveDescendant(child)) found = child;
    });
    if (!found) return;
    ctx.report({
      el,
      message: `<${el.name} accessible> groups its whole subtree into one focus stop, so the <${found.name}> inside is no longer separately focusable and the reading order changes. Remove accessible from the container, or move the grouping off the interactive content.`,
    });
  },
);

/** Descriptor props that only take effect on an accessibility element. */
const DESCRIPTOR_PROPS = ['accessibilityLabel', 'accessibilityHint', 'accessibilityValue', 'accessibilityState'];

/**
 * WCAG 1.3.2 / 4.1.2. accessibilityLabel/Hint/Value/State describe an
 * accessibility element, but a plain View is not one unless `accessible={true}`
 * is set. Without it the descriptor is dropped and the screen reader reads each
 * child in source order instead of the intended grouped label — a common cause
 * of wrong or overly verbose reading order.
 */
export const labelNeedsAccessible = defineRule(
  {
    id: 'label-needs-accessible',
    description: 'Views with accessibility descriptors must set accessible={true}.',
    severity: 'moderate',
    wcag: ['1.3.2', '4.1.2'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, GROUPING_CONTAINERS) || el.hasSpread) return;
    if (isStaticTrue(el, 'accessible') || staticValue(el, 'accessible') === false) return;
    if (hasAttr(el, 'accessible')) return; // dynamic accessible — benefit of the doubt
    if (isHiddenFromAT(el) || hasAttr(el, 'onPress')) return;
    const prop = DESCRIPTOR_PROPS.find((p) => attrProvidesValue(el, p) || hasAttr(el, p));
    if (!prop) return;
    ctx.report({
      el,
      message: `<${el.name}> sets ${prop} but is not accessible={true}, so the screen reader ignores the descriptor and reads each child separately (a frequent source of wrong reading order). Add accessible={true} to make it a single focus stop.`,
    });
  },
);
