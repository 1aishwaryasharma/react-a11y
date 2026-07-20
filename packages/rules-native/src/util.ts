import type { ElementNode, Rule, RuleMeta, RuleContext, RuleVisitor } from '@aishware/react-a11y-core';
import {
  attrProvidesValue,
  findAncestor,
  isStaticTrue,
  readOwnPackageMeta,
  staticString,
} from '@aishware/react-a11y-core';
import ts from 'typescript';
import { ARIA_LABEL_PROPS } from './aria.js';

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
 * True when the element is unresolved/local or imported from a trusted React
 * Native source. Components imported from design systems are intentionally
 * excluded because they may synthesize accessibility props internally.
 */
export function isRNElement(el: ElementNode): boolean {
  return el.isComponent && (el.importSource === null || RN_SOURCES.has(el.importSource));
}

/** True when `el` is a named component from a trusted React Native source. */
export function isRNComponent(el: ElementNode, names: ReadonlySet<string>): boolean {
  return names.has(el.importName ?? el.name) && isRNElement(el);
}

export const TOUCHABLES = new Set([
  'Pressable',
  'TouchableOpacity',
  'TouchableHighlight',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
]);

const SWITCH_COMPONENTS = new Set(['Switch']);

export function isTouchable(el: ElementNode): boolean {
  return isRNComponent(el, TOUCHABLES);
}

export function isSwitch(el: ElementNode): boolean {
  return isRNComponent(el, SWITCH_COMPONENTS);
}

/** Stock React Native controls that are interactive on their own. */
const NATIVE_CONTROLS = new Set(['TextInput', 'Switch', 'Button']);

/** A touchable or a native control — the canonical "interactive element" test. */
export function isNativeInteractive(el: ElementNode): boolean {
  return isTouchable(el) || isRNComponent(el, NATIVE_CONTROLS);
}

/** iOS: accessibilityElementsHidden hides the element and its a11y subtree from VoiceOver. */
export function iosHidesSubtree(el: ElementNode): boolean {
  return isStaticTrue(el, 'accessibilityElementsHidden');
}

/** Android: importantForAccessibility="no-hide-descendants" hides the subtree from TalkBack. */
export function androidHidesSubtree(el: ElementNode): boolean {
  return staticString(el, 'importantForAccessibility') === 'no-hide-descendants';
}

function directlyHiddenFromAT(el: ElementNode): boolean {
  if (isStaticTrue(el, 'aria-hidden') || iosHidesSubtree(el)) return true;
  const important = staticString(el, 'importantForAccessibility');
  return important === 'no' || important === 'no-hide-descendants';
}

function hidesDescendantsFromAT(el: ElementNode): boolean {
  return (
    isStaticTrue(el, 'aria-hidden') ||
    iosHidesSubtree(el) ||
    androidHidesSubtree(el)
  );
}

/** Element is hidden directly or by an ancestor that hides its whole subtree. */
export function isHiddenFromAT(el: ElementNode): boolean {
  return directlyHiddenFromAT(el) || findAncestor(el, hidesDescendantsFromAT) !== null;
}

/** Any of the label-bearing props provides a usable value. */
export function hasNativeLabel(el: ElementNode): boolean {
  return (
    attrProvidesValue(el, 'accessibilityLabel') ||
    attrProvidesValue(el, 'accessibilityLabelledBy') ||
    ARIA_LABEL_PROPS.some((prop) => attrProvidesValue(el, prop))
  );
}

/**
 * Conservative accessible-name check. React Native derives names from
 * descendant Text; dynamic or component children are treated as potentially
 * named to avoid false positives in static analysis.
 */
export function mayHaveNativeAccessibleName(el: ElementNode): boolean {
  return (
    hasNativeLabel(el) ||
    el.hasExpressionChild ||
    el.hasTextChild ||
    el.childElements.length > 0
  );
}

/**
 * Validity of a statically-known accessibilityState property initializer.
 * Unknown expressions are left to runtime analysis.
 */
export function staticAccessibilityStateValueValidity(
  key: string,
  node: ts.Expression,
): 'invalid' | 'unknown' | 'valid' {
  if (
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.TrueKeyword
  ) {
    return 'valid';
  }
  if (ts.isStringLiteralLike(node)) {
    return key === 'checked' && node.text === 'mixed' ? 'valid' : 'invalid';
  }
  if (
    node.kind === ts.SyntaxKind.NullKeyword ||
    ts.isArrayLiteralExpression(node) ||
    ts.isBigIntLiteral(node) ||
    ts.isNumericLiteral(node) ||
    ts.isObjectLiteralExpression(node) ||
    (ts.isPrefixUnaryExpression(node) &&
      (ts.isBigIntLiteral(node.operand) || ts.isNumericLiteral(node.operand))) ||
    ts.isVoidExpression(node) ||
    (ts.isIdentifier(node) && node.text === 'undefined')
  ) {
    return 'invalid';
  }
  return 'unknown';
}
