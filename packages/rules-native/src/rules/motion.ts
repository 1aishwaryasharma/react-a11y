import type { Rule, RuleContext } from '@aishware/react-a11y-core';
import { staticExpression, staticValue, type ElementNode } from '@aishware/react-a11y-core';
import ts from 'typescript';
import { helpUrlFor } from '../util.js';

/** Any of these in a file means the author is already consulting the Reduce Motion setting. */
const REDUCE_MOTION_SIGNALS = [
  'isReduceMotionEnabled', 'reduceMotionEnabled', 'useReducedMotion', 'ReduceMotion.System',
  'ReducedMotionConfig', 'prefers-reduced-motion', 'reduceMotion',
];

function isInfiniteRepeat(arg: ts.Expression | undefined): boolean {
  if (!arg) return false;
  const literal = staticExpression(arg);
  if (literal.kind === 'value') return literal.value === -1 || literal.value === 0 || literal.value === Infinity;
  return ts.isIdentifier(arg) && arg.text === 'Infinity';
}

function finiteIterations(options: ts.Expression | undefined): boolean {
  if (!options || !ts.isObjectLiteralExpression(options)) return false;
  for (const prop of options.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name) || prop.name.text !== 'iterations') continue;
    const literal = staticExpression(prop.initializer);
    return literal.kind === 'value' && typeof literal.value === 'number' && literal.value > 0;
  }
  return false;
}

function checkLoops(sf: ts.SourceFile, ctx: RuleContext): void {
  const hasSignal = REDUCE_MOTION_SIGNALS.some((signal) => sf.text.includes(signal));
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      // Animated.loop(anim, { iterations }) — React Native's core Animated API
      // has no reduce-motion awareness of its own.
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'loop'
        && ts.isIdentifier(callee.expression) && callee.expression.text === 'Animated'
        && !hasSignal && !finiteIterations(node.arguments[1])) {
        ctx.report({
          node,
          message: 'Animated.loop runs indefinitely and ignores the Reduce Motion setting. Check AccessibilityInfo.isReduceMotionEnabled() (or useReducedMotion from Reanimated) and skip or shorten the animation when it is on.',
        });
      }
      // withRepeat(anim, -1, reverse, callback, ReduceMotion.Never) —
      // Reanimated honours Reduce Motion by default; opting out on an
      // infinite loop reintroduces the problem.
      if (ts.isIdentifier(callee) && callee.text === 'withRepeat' && isInfiniteRepeat(node.arguments[1])
        && node.getText(sf).includes('ReduceMotion.Never')) {
        ctx.report({
          node,
          message: 'withRepeat loops forever with ReduceMotion.Never, so the animation keeps moving for users who enabled Reduce Motion. Use ReduceMotion.System (the default).',
        });
      }
    }
    node.forEachChild(visit);
  };
  visit(sf);
}

/** Reanimated's `<ReducedMotionConfig mode={ReduceMotion.Never}>` overrides the OS setting app-wide. */
function checkGlobalOptOut(el: ElementNode, ctx: RuleContext): void {
  if (el.name !== 'ReducedMotionConfig') return;
  const mode = el.attrs.get('mode');
  const isNever = mode?.kind === 'expression' && /ReduceMotion\.Never\b/.test(mode.text);
  if (!isNever && staticValue(el, 'mode') !== 'never') return;
  ctx.report({
    el,
    message: "<ReducedMotionConfig mode={ReduceMotion.Never}> disables Reduce Motion for every Reanimated animation in the app, overriding the user's system setting.",
    severity: 'serious',
  });
}

const ID = 'animation-reduce-motion';

/**
 * WCAG 2.2.2 (A) requires that moving content lasting more than five seconds
 * can be paused; WCAG 2.3.3 (AAA) and both platforms' Reduce Motion settings
 * ask that non-essential motion be dropped on request. Infinite loops that
 * never consult the setting fail both.
 */
export const animationReduceMotion: Rule = {
  meta: {
    id: ID,
    description: 'Looping animations must respect the Reduce Motion accessibility setting.',
    severity: 'moderate',
    wcag: ['2.2.2', '2.3.3'],
    platforms: ['native'],
    partial: true,
    ...(helpUrlFor(ID) ? { helpUrl: helpUrlFor(ID) } : {}),
  },
  create(ctx) {
    return {
      sourceFile: (sf) => checkLoops(sf, ctx),
      element: (el) => checkGlobalOptOut(el, ctx),
    };
  },
};
