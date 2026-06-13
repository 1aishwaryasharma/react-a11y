import { inlineStyleContrast } from '@react-a11y/core';
import { defineRule } from '../util.js';

const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

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
