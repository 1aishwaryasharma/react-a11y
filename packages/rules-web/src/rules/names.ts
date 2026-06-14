import {
  INTERACTIVE_ROLES,
  deepStaticText,
  hasAccessibleName,
  hasAttr,
  isAriaHidden,
  staticString,
  staticValue,
} from '@aishware/react-a11y-core';
import { defineRule, isDomTag } from '../util.js';

/** Buttons (and role="button" elements) must have an accessible name. */
export const buttonHasName = defineRule(
  {
    id: 'button-has-accessible-name',
    description: 'Buttons must have an accessible name.',
    severity: 'critical',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    const isButtonTag = isDomTag(el, 'button');
    const hasButtonRole = !el.isComponent && staticString(el, 'role')?.trim() === 'button';
    if (!isButtonTag && !hasButtonRole) return;
    if (isAriaHidden(el)) return;
    if (hasAccessibleName(el)) return;
    ctx.report({
      el,
      message: `<${el.name}${hasButtonRole && !isButtonTag ? ' role="button"' : ''}> has no accessible name. Icon-only buttons need aria-label.`,
    });
  },
);

const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

/**
 * WCAG 2.5.3: the visible label must be contained in the accessible name,
 * or voice-control users saying the visible text cannot activate the control.
 * Only fires when both the aria-label and the entire visible text are static.
 */
export const labelInName = defineRule(
  {
    id: 'label-in-name',
    description: 'aria-label must contain the visible text of the control.',
    severity: 'moderate',
    wcag: ['2.5.3'],
  },
  (el, ctx) => {
    const ariaLabel = staticString(el, 'aria-label');
    if (!ariaLabel?.trim()) return;
    const interactive =
      isDomTag(el, 'button', 'a', 'summary') ||
      INTERACTIVE_ROLES.has(staticString(el, 'role')?.trim() ?? '');
    if (!interactive) return;
    const visible = deepStaticText(el);
    if (!visible) return; // dynamic or empty — can't compare
    const label = normalize(ariaLabel);
    const text = normalize(visible);
    if (text && !label.includes(text)) {
      ctx.report({
        el,
        message: `aria-label="${ariaLabel}" does not contain the visible text "${visible}" — voice-control users saying what they see cannot activate it.`,
      });
    }
  },
);

/**
 * Auto-playing audio talks over screen readers. Muted media is fine;
 * media with controls is downgraded since users can stop it.
 */
export const mediaNoAutoplay = defineRule(
  {
    id: 'media-no-autoplay',
    description: 'Media must not autoplay with sound.',
    severity: 'serious',
    wcag: ['1.4.2'],
  },
  (el, ctx) => {
    if (!isDomTag(el, 'video', 'audio')) return;
    if (!hasAttr(el, 'autoPlay') || staticValue(el, 'autoPlay') === false) return;
    if (staticValue(el, 'muted') === true) return;
    if (hasAttr(el, 'controls')) {
      ctx.report({
        el,
        message: `<${el.name}> autoplays with sound. Users can stop it via controls, but prefer starting paused.`,
        severity: 'moderate',
      });
      return;
    }
    ctx.report({
      el,
      message: `<${el.name}> autoplays with sound and has no controls — it talks over screen readers with no way to stop it. Add muted, or remove autoPlay.`,
    });
  },
);
