import { colorContrastFinding } from '@aish/react-a11y-core';
import { defineRule } from '../util.js';

/**
 * WCAG 1.4.3 contrast for inline styles where both colors are literal,
 * e.g. <Text style={{ color: '#999', backgroundColor: '#fff' }}>.
 * StyleSheet references and dynamic styles are skipped.
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
    if (!el.hasTextChild) return;
    const finding = colorContrastFinding(el);
    if (finding) ctx.report({ el, ...finding });
  },
);
