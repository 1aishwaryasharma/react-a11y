import { attrProvidesValue, fixRenameAttr, hasAttr, staticString, staticValue } from '@react-a11y/core';
import { defineRule, hasNativeLabel, isHiddenFromAT, isRNComponent } from '../util.js';

const IMAGE = new Set(['Image']);
const TEXT_INPUT = new Set(['TextInput']);
const SWITCH = new Set(['Switch']);
const MODAL = new Set(['Modal']);

/**
 * RN Images are skipped by screen readers unless made accessible, so this is
 * a prompt to make intent explicit: label informative images, mark decorative
 * ones with accessible={false} or alt="".
 */
export const imageHasLabel = defineRule(
  {
    id: 'image-has-label',
    description: 'Images need alt/accessibilityLabel, or an explicit decorative marker.',
    severity: 'moderate',
    wcag: ['1.1.1'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, IMAGE)) return;
    if (el.hasSpread || isHiddenFromAT(el)) return;
    if (staticValue(el, 'accessible') === false) return; // explicitly decorative
    if (attrProvidesValue(el, 'alt') || hasNativeLabel(el)) return;
    const alt = el.attrs.get('alt');
    if (alt?.kind === 'static' && alt.value === '') return; // alt="" marks decorative
    ctx.report({
      el,
      message: '<Image> has no alternative text. Add alt/accessibilityLabel if informative, or accessible={false} / alt="" if decorative.',
    });
  },
);

/** Placeholder text disappears on input and is not a label. */
export const textInputHasLabel = defineRule(
  {
    id: 'textinput-has-label',
    description: 'TextInput must have an accessibility label.',
    severity: 'serious',
    wcag: ['3.3.2', '4.1.2'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, TEXT_INPUT)) return;
    if (el.hasSpread || isHiddenFromAT(el)) return;
    if (hasNativeLabel(el)) return;
    const hint = hasAttr(el, 'placeholder')
      ? ' A placeholder is not a label — it disappears once the user types.'
      : '';
    ctx.report({ el, message: `<TextInput> has no accessibilityLabel.${hint}` });
  },
);

/** A Switch with no label is announced as just "switch, off". */
export const switchHasLabel = defineRule(
  {
    id: 'switch-has-label',
    description: 'Switch must have an accessibility label.',
    severity: 'serious',
    wcag: ['4.1.2', '3.3.2'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, SWITCH)) return;
    if (el.hasSpread || isHiddenFromAT(el)) return;
    if (hasNativeLabel(el)) return;
    ctx.report({
      el,
      message: '<Switch> has no accessibilityLabel — screen readers announce only "switch, off/on" with no indication of what it controls.',
    });
  },
);

/**
 * Without onRequestClose, the Android back button (and TV remote back) does
 * nothing — the modal becomes a trap for hardware-navigation users.
 */
export const modalHasRequestClose = defineRule(
  {
    id: 'modal-has-request-close',
    description: 'Modal must handle onRequestClose so hardware back can dismiss it.',
    severity: 'serious',
    wcag: ['2.1.2'],
  },
  (el, ctx) => {
    if (!isRNComponent(el, MODAL)) return;
    if (el.hasSpread || hasAttr(el, 'onRequestClose')) return;
    ctx.report({
      el,
      message: '<Modal> has no onRequestClose — Android back button users are trapped inside it.',
    });
  },
);

/** Valid values for accessibilityRole, per the React Native docs. */
const RN_ROLES = new Set([
  'none', 'button', 'togglebutton', 'link', 'search', 'image', 'keyboardkey',
  'text', 'adjustable', 'imagebutton', 'header', 'summary', 'alert',
  'checkbox', 'combobox', 'menu', 'menubar', 'menuitem', 'progressbar',
  'radio', 'radiogroup', 'scrollbar', 'spinbutton', 'switch', 'tab',
  'tabbar', 'tablist', 'timer', 'list', 'grid', 'pager', 'scrollview',
  'horizontalscrollview', 'viewgroup', 'webview', 'drawerlayout',
  'slidingdrawer', 'iconmenu', 'toast', 'toolbar',
]);

export const validAccessibilityRole = defineRule(
  {
    id: 'valid-accessibility-role',
    description: 'accessibilityRole must be a value React Native recognizes.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    const role = staticString(el, 'accessibilityRole')?.trim();
    if (role === undefined || role === '' || RN_ROLES.has(role)) return;
    ctx.report({
      el,
      message: `accessibilityRole="${role}" is not a valid React Native role — it will be silently ignored on device.`,
    });
  },
);

/** Every accessibility prop React Native supports; anything else is a typo. */
const KNOWN_A11Y_PROPS = new Set([
  'accessibilityLabel', 'accessibilityHint', 'accessibilityRole',
  'accessibilityState', 'accessibilityValue', 'accessibilityActions',
  'accessibilityElementsHidden', 'accessibilityViewIsModal',
  'accessibilityLiveRegion', 'accessibilityLanguage',
  'accessibilityLabelledBy', 'accessibilityIgnoresInvertColors',
  'accessibilityRespondsToUserInteraction',
  'accessibilityShowsLargeContentViewer', 'accessibilityLargeContentTitle',
]);

/** Misspelled accessibility props fail silently at runtime — catch them statically. */
export const validAccessibilityProps = defineRule(
  {
    id: 'valid-accessibility-props',
    description: 'accessibility* props must be ones React Native actually supports.',
    severity: 'serious',
    wcag: ['4.1.2'],
    fixable: true,
  },
  (el, ctx) => {
    for (const name of el.attrs.keys()) {
      if (!name.startsWith('accessibility')) continue;
      if (KNOWN_A11Y_PROPS.has(name)) continue;
      const lower = name.toLowerCase();
      const match = [...KNOWN_A11Y_PROPS].find((k) => k.toLowerCase() === lower);
      ctx.report({
        el,
        message: match
          ? `"${name}" is miscapitalized — React Native expects "${match}". The prop is silently ignored as written.`
          : `"${name}" is not a React Native accessibility prop and is silently ignored.`,
        ...(match ? { fix: fixRenameAttr(el, name, match) } : {}),
      });
    }
  },
);
