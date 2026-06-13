import {
  colorContrastFinding,
  inlineStyleNumber,
  targetSizeTier,
  INTERACTIVE_TAGS,
  INTERACTIVE_ROLES,
  hasAttr,
  staticString,
} from '@react-a11y/core';
import { defineRule } from '../util.js';

/**
 * WCAG 1.4.3 contrast for inline styles where both colors are literal.
 * Below 3:1 fails even for large text → serious. Between 3:1 and 4.5:1 is
 * only flagged when the font size is also known to be small, so unknown-size
 * text that might be large never false-positives.
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
    const finding = colorContrastFinding(el);
    if (finding) ctx.report({ el, ...finding });
  },
);

/**
 * WCAG 2.5.8 (AA, new in 2.2): pointer targets need 24×24 CSS px minimum.
 * Only statically-sized inline styles are checked.
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
    const width = inlineStyleNumber(el, 'width');
    const height = inlineStyleNumber(el, 'height');
    if (width === undefined || height === undefined) return;
    const tier = targetSizeTier(width, height);
    if (tier === 'below-min') {
      ctx.report({
        el,
        message: `${width}×${height}px target is below the 24×24px WCAG 2.5.8 (AA) minimum — hard to hit for users with motor impairments.`,
      });
    } else if (tier === 'below-recommended') {
      ctx.report({
        el,
        message: `${width}×${height}px target is below the recommended 44×44px (WCAG 2.5.5 AAA).`,
        severity: 'minor',
      });
    }
  },
);
