import {
  findAncestor,
  hasAttr,
  resolvedStyleNumber,
  targetSizeTier,
  type ElementNode,
} from '@aishware/react-a11y-core';
import {
  defineRule,
  isHiddenFromAT,
  isNativeInteractive,
  isRNComponent,
  isTouchable,
  mayHaveNativeAccessibleName,
} from '../util.js';

/**
 * Touchables with no label and no naming content are announced as nothing at
 * all. RN aggregates Text descendants into the accessible name, so text-like
 * content is given the benefit of the doubt — but an unlabeled <Image> or
 * icon-library glyph is silent, which is the classic "icon button reads as
 * nothing" bug.
 */
export const touchableHasLabel = defineRule(
  {
    id: 'touchable-has-label',
    description: 'Touchables must have an accessible name (accessibilityLabel or text children).',
    severity: 'critical',
    wcag: ['1.1.1', '4.1.2'],
  },
  (el, ctx) => {
    if (!isTouchable(el)) return;
    if (el.hasSpread || isHiddenFromAT(el)) return;
    if (mayHaveNativeAccessibleName(el)) return;
    const iconOnly = el.childElements.length > 0;
    ctx.report({
      el,
      message: iconOnly
        ? `<${el.name}> wraps only an unlabeled image/icon — screen readers announce it as an unlabeled button (or read the asset name). Add accessibilityLabel.`
        : `<${el.name}> has no accessible name — screen readers announce it as an unlabeled button. Add accessibilityLabel or text children.`,
    });
  },
);

/** Without accessibilityRole, screen readers don't announce touchables as buttons. */
export const touchableHasRole = defineRule(
  {
    id: 'touchable-has-role',
    description: 'Touchables must declare an accessibilityRole so screen readers announce them as actionable.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (!isTouchable(el)) return;
    if (el.hasSpread || isHiddenFromAT(el)) return;
    if (hasAttr(el, 'accessibilityRole') || hasAttr(el, 'role')) return;
    ctx.report({
      el,
      message: `<${el.name}> has no accessibilityRole — VoiceOver/TalkBack won't announce it as a button. Add accessibilityRole="button".`,
    });
  },
);

const TEXT = new Set(['Text']);

/** An element that is itself a focusable control: touchable, native control, or pressable Text. */
function isNestedControl(el: ElementNode): boolean {
  return isNativeInteractive(el) || (isRNComponent(el, TEXT) && (hasAttr(el, 'onPress') || hasAttr(el, 'onLongPress')));
}

/**
 * Nested controls confuse screen readers: the outer touchable becomes one
 * accessibility element, so the inner button, Switch, TextInput or pressable
 * Text is swallowed and only one action is reachable. (Cards that need both a
 * card action and inner buttons need accessibilityActions or a library such
 * as react-native-a11y-order.)
 */
export const noNestedTouchables = defineRule(
  {
    id: 'no-nested-touchables',
    description: 'Interactive controls must not be nested inside touchables.',
    severity: 'serious',
    wcag: ['4.1.2', '2.1.1'],
  },
  (el, ctx) => {
    if (!isNestedControl(el)) return;
    const ancestor = findAncestor(el, isTouchable);
    if (!ancestor) return;
    ctx.report({
      el,
      message: isTouchable(el)
        ? `<${el.name}> is nested inside <${ancestor.name}>. Screen readers expose only one of them — restructure so touch targets are siblings.`
        : `<${el.name}> is an interactive control nested inside <${ancestor.name}>. The outer touchable becomes a single accessibility element, so screen reader users cannot reach the inner control. Move it out, or expose it via accessibilityActions.`,
    });
  },
);

/**
 * WCAG 2.5.8 (AA, new in 2.2) requires 24px minimum targets; Apple/Google
 * guidelines and WCAG 2.5.5 (AAA) recommend 44pt. Sizes come from inline
 * literals or Tailwind classes (NativeWind/Uniwind `h-6 w-6`, `size-8`,
 * twrnc `tw\`h-6\``); hitSlop counts as mitigation. `minWidth`/`minHeight`
 * raise a smaller explicit size.
 */
export const touchTargetSize = defineRule(
  {
    id: 'touch-target-size',
    description: 'Touch targets should be at least 44×44pt (24px is the WCAG 2.5.8 floor).',
    severity: 'moderate',
    wcag: ['2.5.8', '2.5.5'],
  },
  (el, ctx) => {
    if (!isTouchable(el)) return;
    if (hasAttr(el, 'hitSlop')) return;
    const project = ctx.project;
    const dim = (prop: 'width' | 'height', min: 'minWidth' | 'minHeight'): number | undefined => {
      const value = resolvedStyleNumber(el, prop, project);
      const floor = resolvedStyleNumber(el, min, project);
      if (value === undefined) return undefined;
      return floor !== undefined ? Math.max(value, floor) : value;
    };
    const width = dim('width', 'minWidth');
    const height = dim('height', 'minHeight');
    if (width === undefined && height === undefined) return;
    const tier = targetSizeTier(width ?? Infinity, height ?? Infinity);
    if (!tier) return;
    const size = width !== undefined && height !== undefined
      ? `${width}×${height}`
      : width !== undefined ? `${width}-wide` : `${height}-tall`;
    if (tier === 'below-min') {
      ctx.report({
        el,
        message: `${size} target is below the WCAG 2.5.8 (AA) minimum of 24px. Aim for 44×44pt, or add hitSlop.`,
        severity: 'serious',
      });
    } else {
      ctx.report({
        el,
        message: `${size} target is below the recommended 44×44pt (WCAG 2.5.5, Apple HIG, Material). Consider enlarging or adding hitSlop.`,
      });
    }
  },
);
