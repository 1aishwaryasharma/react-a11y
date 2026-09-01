import {
  contrastFindings,
  resolvedStyleNumber,
  targetSizeTier,
  INTERACTIVE_TAGS,
  INTERACTIVE_ROLES,
  hasAttr,
  staticString,
} from '@aishware/react-a11y-core';
import { defineRule } from '../util.js';

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
    if (el.isComponent || !el.hasTextChild) return;
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
      ? `${width}×${height}px`
      : width !== undefined ? `${width}px-wide` : `${height}px-tall`;
    if (tier === 'below-min') {
      ctx.report({
        el,
        message: `${size} target is below the 24×24px WCAG 2.5.8 (AA) minimum — hard to hit for users with motor impairments.`,
      });
    } else {
      ctx.report({
        el,
        message: `${size} target is below the recommended 44×44px (WCAG 2.5.5 AAA).`,
        severity: 'minor',
      });
    }
  },
);
