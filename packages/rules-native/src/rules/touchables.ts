import { findAncestor, hasAttr, inlineStyleNumber, targetSizeTier } from '@aishware/react-a11y-core';
import { defineRule, isHiddenFromAT, isTouchable, mayHaveNativeAccessibleName } from '../util.js';

/**
 * Touchables with no label and no children are announced as nothing at all.
 * RN aggregates Text descendants into the accessible name, so any child
 * content is given the benefit of the doubt.
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
    ctx.report({
      el,
      message: `<${el.name}> has no accessible name — screen readers announce it as an unlabeled button. Add accessibilityLabel or text children.`,
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

/** Nested touchables confuse screen readers: only one target is announced. */
export const noNestedTouchables = defineRule(
  {
    id: 'no-nested-touchables',
    description: 'Touchables must not be nested inside other touchables.',
    severity: 'serious',
    wcag: ['4.1.2', '2.1.1'],
  },
  (el, ctx) => {
    if (!isTouchable(el)) return;
    const ancestor = findAncestor(el, isTouchable);
    if (!ancestor) return;
    ctx.report({
      el,
      message: `<${el.name}> is nested inside <${ancestor.name}>. Screen readers expose only one of them — restructure so touch targets are siblings.`,
    });
  },
);

/**
 * WCAG 2.5.8 (AA, new in 2.2) requires 24px minimum targets; Apple/Google
 * guidelines and WCAG 2.5.5 (AAA) recommend 44pt. Only statically-sized
 * inline styles are checked; hitSlop counts as mitigation.
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
    const width = inlineStyleNumber(el, 'width');
    const height = inlineStyleNumber(el, 'height');
    if (width === undefined || height === undefined) return;
    const tier = targetSizeTier(width, height);
    if (tier === 'below-min') {
      ctx.report({
        el,
        message: `${width}×${height} target is below the WCAG 2.5.8 (AA) minimum of 24px. Aim for 44×44pt, or add hitSlop.`,
        severity: 'serious',
      });
    } else if (tier === 'below-recommended') {
      ctx.report({
        el,
        message: `${width}×${height} target is below the recommended 44×44pt (WCAG 2.5.5, Apple HIG, Material). Consider enlarging or adding hitSlop.`,
      });
    }
  },
);
