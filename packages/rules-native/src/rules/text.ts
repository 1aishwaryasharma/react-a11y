import { hasAttr, resolvedStyleNumber, staticValue } from '@aishware/react-a11y-core';
import { defineRule, isHiddenFromAT, isRNComponent, reactNativeVersion } from '../util.js';

const SCALABLE_TEXT = new Set(['Text', 'TextInput']);
const TEXT = new Set(['Text']);

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

/**
 * A fixed height on a Text element clips the glyphs as soon as the user
 * enlarges system text (WCAG 1.4.4 requires 200% without loss of content).
 * Heights are read from inline literals and Tailwind classes (`h-6`).
 */
export const textFixedHeight = defineRule(
  {
    description: 'Text must not have a fixed height — enlarged system text gets clipped.',
    id: 'text-fixed-height',
    severity: 'moderate',
    wcag: ['1.4.4'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, SCALABLE_TEXT) || el.hasSpread) return;
    const height = resolvedStyleNumber(el, 'height', ctx.project);
    const maxHeight = resolvedStyleNumber(el, 'maxHeight', ctx.project);
    const fixed = height ?? maxHeight;
    if (fixed === undefined) return;
    const prop = height !== undefined ? 'height' : 'maxHeight';
    ctx.report({
      el,
      message: `<${el.name}> has a fixed ${prop} of ${fixed}, so text is clipped when the user enlarges system text (WCAG 1.4.4 requires 200% without loss). Use minHeight or let the container grow.`,
    });
  },
);

/**
 * A pressable <Text> is announced as plain text unless it has a role, so
 * screen reader users never learn it is actionable. React Native 0.84
 * assigns role="link" to Text with onPress automatically; older versions
 * need it spelled out.
 */
export const textOnPressHasRole = defineRule(
  {
    description: 'Text with onPress must declare a role so it is announced as a link or button.',
    id: 'text-onpress-has-role',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, TEXT) || el.hasSpread || isHiddenFromAT(el)) return;
    if (!hasAttr(el, 'onPress') && !hasAttr(el, 'onLongPress')) return;
    if (hasAttr(el, 'accessibilityRole') || hasAttr(el, 'role')) return;
    const version = reactNativeVersion(ctx);
    if (version && (version[0] > 0 || version[1] >= 84)) return; // RN 0.84+ defaults to "link"
    ctx.report({
      el,
      message: '<Text onPress> is announced as plain text — screen reader users are not told it is actionable. Add accessibilityRole="link" (or "button"). React Native 0.84+ applies "link" automatically.',
    });
  },
);
