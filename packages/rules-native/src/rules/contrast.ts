import { contrastFindings } from '@aishware/react-a11y-core';
import { defineRule, isRNComponent } from '../util.js';

const TEXT = new Set(['Text', 'TextInput']);

/**
 * WCAG 1.4.3 contrast for statically-known colors: inline literals and
 * Tailwind classes (`text-gray-400`, `bg-white`, `dark:` variants,
 * conditional class sets). The background may come from the Text itself or
 * from the nearest enclosing View with a known background, since React
 * Native paints the parent's background behind the text. StyleSheet
 * references and dynamic styles are skipped.
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
    if (!isRNComponent(el, TEXT) || (!el.hasTextChild && !el.hasExpressionChild)) return;
    for (const finding of contrastFindings(el, ctx.project)) {
      ctx.report({ el, message: finding.message, severity: finding.severity });
    }
  },
);
