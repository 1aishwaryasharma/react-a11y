import { staticValue } from '@aishware/react-a11y-core';
import { defineRule, isRNComponent } from '../util.js';

const SCALABLE_TEXT = new Set(['Text', 'TextInput']);

/**
 * Text scaling is enabled by default. Explicitly disabling or effectively
 * capping it at 100% prevents users' system text-size preference from working.
 */
export const noDisableFontScaling = defineRule(
  {
    description: 'Text must respect the system font-size accessibility setting.',
    id: 'no-disable-font-scaling',
    severity: 'serious',
    wcag: ['1.4.4'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, SCALABLE_TEXT) || el.hasSpread) return;
    if (staticValue(el, 'allowFontScaling') === false) {
      ctx.report({
        el,
        message: `<${el.name}> disables system font scaling with allowFontScaling={false}. Remove the prop or set it to true.`,
      });
      return;
    }

    const maximum = staticValue(el, 'maxFontSizeMultiplier');
    if (typeof maximum === 'number' && maximum > 0 && maximum <= 1) {
      ctx.report({
        el,
        message: `<${el.name}> caps text at ${maximum}×, preventing enlarged system text. Remove maxFontSizeMultiplier or use a value greater than 1.`,
      });
    }
  },
);
