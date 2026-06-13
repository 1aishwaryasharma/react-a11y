import { inlineStyleContrast, inlineStyleNumber, INTERACTIVE_TAGS, hasAttr, staticString } from '@react-a11y/core';
import { INTERACTIVE_ROLES } from '@react-a11y/core';
import { defineRule } from '../util.js';

const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

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
    const info = inlineStyleContrast(el);
    if (!info) return;
    if (info.ratio >= 4.5) return;
    if (info.ratio >= 3 && (info.large || !info.fontSizeKnown)) return;
    if (info.ratio >= info.required && info.fontSizeKnown) return;
    const requirement = info.large ? '3:1 (large text)' : '4.5:1';
    ctx.report({
      el,
      message: `Contrast between ${info.fg} and ${info.bg} is ${fmt(info.ratio)}:1 — below the ${requirement} required by WCAG 1.4.3.`,
      severity: info.ratio < 3 ? 'serious' : 'moderate',
    });
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
    const min = Math.min(width, height);
    if (min < 24) {
      ctx.report({
        el,
        message: `${width}×${height}px target is below the 24×24px WCAG 2.5.8 (AA) minimum — hard to hit for users with motor impairments.`,
      });
    } else if (min < 44) {
      ctx.report({
        el,
        message: `${width}×${height}px target is below the recommended 44×44px (WCAG 2.5.5 AAA).`,
        severity: 'minor',
      });
    }
  },
);
