import type { ElementNode, Rule, RuleMeta, RuleContext, RuleVisitor } from '@react-a11y/core';
import { attrProvidesValue, isStaticTrue, readOwnPackageMeta, staticString } from '@react-a11y/core';

const homepage = readOwnPackageMeta(import.meta.url).homepage;
const HELP_BASE = homepage ? `${homepage}/blob/main/docs/rules/native.md#` : undefined;

export function helpUrlFor(ruleId: string): string | undefined {
  return HELP_BASE ? `${HELP_BASE}${ruleId}` : undefined;
}

export function defineRule(
  meta: Omit<RuleMeta, 'platforms' | 'helpUrl'>,
  element: (el: ElementNode, ctx: RuleContext) => void,
): Rule {
  return {
    meta: { ...meta, platforms: ['native'], ...(HELP_BASE ? { helpUrl: `${HELP_BASE}${meta.id}` } : {}) },
    create(ctx): RuleVisitor {
      return { element: (el) => element(el, ctx) };
    },
  };
}

/** Module specifiers we trust to export the stock RN components. */
const RN_SOURCES = new Set(['react-native', 'react-native-web', 'react-native-gesture-handler']);

/**
 * True when `el` is the named React Native component. If the identifier was
 * imported from an unrelated module (a custom wrapper that may handle a11y
 * itself), the element is not matched — keeps false positives down.
 */
export function isRNComponent(el: ElementNode, names: ReadonlySet<string>): boolean {
  if (!el.isComponent || !names.has(el.name)) return false;
  return el.importSource === null || RN_SOURCES.has(el.importSource);
}

export const TOUCHABLES = new Set([
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
]);

export function isTouchable(el: ElementNode): boolean {
  return isRNComponent(el, TOUCHABLES);
}

/** Element is explicitly hidden from assistive technology. */
export function isHiddenFromAT(el: ElementNode): boolean {
  if (isStaticTrue(el, 'aria-hidden') || isStaticTrue(el, 'accessibilityElementsHidden')) return true;
  const important = staticString(el, 'importantForAccessibility');
  if (important === 'no' || important === 'no-hide-descendants') return true;
  const role = staticString(el, 'accessibilityRole') ?? staticString(el, 'role');
  return role === 'none' || role === 'presentation';
}

/** Any of the label-bearing props provides a usable value. */
export function hasNativeLabel(el: ElementNode): boolean {
  return (
    attrProvidesValue(el, 'accessibilityLabel') ||
    attrProvidesValue(el, 'aria-label') ||
    attrProvidesValue(el, 'accessibilityLabelledBy') ||
    attrProvidesValue(el, 'aria-labelledby')
  );
}
