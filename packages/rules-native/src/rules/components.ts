import { attrProvidesValue, fixRenameAttr, hasAttr, staticString, staticValue } from '@aishware/react-a11y-core';
import { KNOWN_ARIA_PROPS } from '../aria.js';
import { defineRule, hasNativeLabel, isHiddenFromAT, isRNComponent, isSwitch } from '../util.js';

const IMAGE = new Set(['Image']);
const TEXT_INPUT = new Set(['TextInput']);
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
    if (!isSwitch(el)) return;
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

/**
 * Valid values for accessibilityRole, per the React Native docs. A superset of
 * eslint-plugin-react-native-a11y's role list (we add RN's Android-only roles),
 * kept in sync by the parity test in test/upstream-parity.test.ts.
 */
export const RN_ROLES = new Set([
  'none', 'button', 'togglebutton', 'link', 'search', 'image', 'img', 'keyboardkey',
  'text', 'adjustable', 'imagebutton', 'header', 'summary', 'alert',
  'checkbox', 'combobox', 'menu', 'menubar', 'menuitem', 'progressbar',
  'radio', 'radiogroup', 'scrollbar', 'spinbutton', 'switch', 'tab',
  'tabbar', 'tablist', 'timer', 'list', 'grid', 'pager', 'scrollview',
  'horizontalscrollview', 'viewgroup', 'webview', 'drawerlayout',
  'slidingdrawer', 'iconmenu', 'toast', 'toolbar',
]);

/**
 * Valid values for the `role` prop (the recommended, ARIA-style spelling since
 * RN 0.71). Deliberately a different vocabulary from accessibilityRole — e.g.
 * `heading` not `header`, `img` not `image` — and `role` wins when both are set.
 * Both sets mirror the published RN docs verbatim (RN_ROLES is additionally
 * pinned by the upstream parity test), so they stay explicit rather than
 * derived; only the renames below relate the two.
 */
export const RN_ROLE_PROP_VALUES = new Set([
  'alert', 'button', 'checkbox', 'combobox', 'grid', 'heading', 'img', 'link',
  'list', 'listitem', 'menu', 'menubar', 'menuitem', 'none', 'presentation',
  'progressbar', 'radio', 'radiogroup', 'scrollbar', 'searchbox', 'slider',
  'spinbutton', 'summary', 'switch', 'tab', 'tablist', 'timer', 'toolbar',
]);

/** Role names that differ between the two vocabularies. */
const ROLE_RENAMES: ReadonlyArray<[accessibilityRole: string, role: string]> = [
  ['header', 'heading'],
  ['image', 'img'],
  ['search', 'searchbox'],
  ['adjustable', 'slider'],
];

const ROLE_VOCABULARY = {
  accessibilityRole: {
    valid: RN_ROLES,
    otherProp: 'role' as const,
    rename: new Map(ROLE_RENAMES.map(([a, r]) => [r, a])),
  },
  role: {
    valid: RN_ROLE_PROP_VALUES,
    otherProp: 'accessibilityRole' as const,
    rename: new Map(ROLE_RENAMES),
  },
};

/** Diagnostic for an invalid role value on either prop, or undefined if valid. */
function describeInvalidRole(prop: keyof typeof ROLE_VOCABULARY, value: string): string | undefined {
  const { valid, otherProp, rename } = ROLE_VOCABULARY[prop];
  if (value === '' || valid.has(value)) return undefined;
  const renamed = rename.get(value);
  if (renamed) {
    return `${prop}="${value}" is not valid — ${prop} spells it "${renamed}". Use ${prop}="${renamed}" (or ${otherProp}="${value}").`;
  }
  if (ROLE_VOCABULARY[otherProp].valid.has(value)) {
    return `${prop}="${value}" is only valid for ${otherProp} — use ${otherProp}="${value}" instead.`;
  }
  return `${prop}="${value}" is not a valid React Native role — it will be silently ignored on device.`;
}

export const validAccessibilityRole = defineRule(
  {
    id: 'valid-accessibility-role',
    description: 'accessibilityRole / role must be a value React Native recognizes.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    for (const prop of ['accessibilityRole', 'role'] as const) {
      const value = staticString(el, prop)?.trim();
      if (value === undefined) continue;
      const message = describeInvalidRole(prop, value);
      if (message) ctx.report({ el, message });
    }
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

/**
 * Common aria-* misspellings we can confidently rename. Unknown aria-* props
 * that don't match anything are left alone — react-native-web forwards extra
 * aria attributes, so flagging them would false-positive there.
 */
const ARIA_ALIASES = new Map([
  ['aria-labeledby', 'aria-labelledby'],
  ['aria-role', 'role'],
]);

/** Misspelled accessibility props fail silently at runtime — catch them statically. */
export const validAccessibilityProps = defineRule(
  {
    id: 'valid-accessibility-props',
    description: 'accessibility* and aria-* props must be ones React Native actually supports.',
    severity: 'serious',
    wcag: ['4.1.2'],
    fixable: true,
  },
  (el, ctx) => {
    for (const name of el.attrs.keys()) {
      const lower = name.toLowerCase();
      if (name.startsWith('accessibility')) {
        if (KNOWN_A11Y_PROPS.has(name)) continue;
        const match = [...KNOWN_A11Y_PROPS].find((k) => k.toLowerCase() === lower);
        const collides = match !== undefined && el.attrs.has(match);
        ctx.report({
          el,
          message: match
            ? collides
              ? `"${name}" is miscapitalized — React Native expects "${match}", which this element already sets. The prop is silently ignored as written; remove it.`
              : `"${name}" is miscapitalized — React Native expects "${match}". The prop is silently ignored as written.`
            : `"${name}" is not a React Native accessibility prop and is silently ignored.`,
          ...(match ? { fix: fixRenameAttr(el, name, match) } : {}),
        });
      } else if (lower.startsWith('aria-') && !KNOWN_ARIA_PROPS.has(name)) {
        const target = KNOWN_ARIA_PROPS.has(lower) ? lower : ARIA_ALIASES.get(lower);
        if (!target) continue; // unknown aria-* prop — may be intentional (react-native-web)
        ctx.report({
          el,
          message: el.attrs.has(target)
            ? `"${name}" is not a React Native prop and this element already sets "${target}". As written it is silently ignored; remove it.`
            : `"${name}" is not a React Native prop — did you mean "${target}"? As written it is silently ignored.`,
          fix: fixRenameAttr(el, name, target),
        });
      }
    }
  },
);

/**
 * accessibilityActions declares custom actions; onAccessibilityAction handles
 * them. One without the other is a silent no-op (actions never reachable, or a
 * handler that receives nothing).
 */
export const accessibilityActionsHandled = defineRule(
  {
    id: 'accessibility-actions-handled',
    description: 'accessibilityActions and onAccessibilityAction must be used together.',
    severity: 'serious',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    if (el.hasSpread) return;
    const hasActions = hasAttr(el, 'accessibilityActions');
    const hasHandler = hasAttr(el, 'onAccessibilityAction');
    if (hasActions === hasHandler) return; // both or neither
    ctx.report({
      el,
      message: hasActions
        ? 'accessibilityActions is set but onAccessibilityAction is missing — the declared actions are never handled.'
        : 'onAccessibilityAction is set but accessibilityActions is missing — there are no actions for the handler to receive.',
    });
  },
);

/** BCP 47 shape: 2–3 letter language, optional 2–8 character subtags. */
const BCP47 = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/**
 * `accessibilityLanguage` (iOS) tells VoiceOver which voice to read the label,
 * value and hint with. It must be a BCP 47 tag such as "fr" or "pt-BR";
 * anything else is ignored and the text is read with the wrong pronunciation.
 */
export const accessibilityLanguageValid = defineRule(
  {
    id: 'accessibility-language-valid',
    description: 'accessibilityLanguage must be a BCP 47 language tag.',
    severity: 'moderate',
    wcag: ['3.1.2'],
  },
  (el, ctx) => {
    const value = staticString(el, 'accessibilityLanguage');
    if (value === undefined) return;
    if (BCP47.test(value.trim())) return;
    ctx.report({
      el,
      message: `accessibilityLanguage="${value}" is not a BCP 47 language tag (e.g. "en", "pt-BR"). VoiceOver ignores it and reads the label with the default voice.`,
    });
  },
);

const LABEL_PROPS = ['accessibilityLabel', 'aria-label', 'accessibilityHint'];

/**
 * VoiceOver treats all-caps strings as abbreviations and may spell them out
 * letter by letter ("SAVE" → "S-A-V-E"). Visible text can be uppercased with
 * textTransform instead; the accessible label should be sentence case.
 */
export const labelNotAllCaps = defineRule(
  {
    id: 'label-not-all-caps',
    description: 'Accessibility labels should not be written in all caps — screen readers may spell them out.',
    severity: 'minor',
    wcag: ['4.1.2'],
  },
  (el, ctx) => {
    for (const prop of LABEL_PROPS) {
      const value = staticString(el, prop);
      if (value === undefined) continue;
      const letters = value.replace(/[^\p{L}]/gu, '');
      if (letters.length < 4 || letters !== letters.toUpperCase() || letters === letters.toLowerCase()) continue;
      if (!/[AEIOUaeiou]/.test(letters)) continue; // consonant-only acronyms (HTML, PDF) are meant to be spelled
      ctx.report({
        el,
        message: `${prop}="${value}" is all caps — VoiceOver may read it as an abbreviation and spell it out. Use sentence case (uppercase the visible text with textTransform instead).`,
      });
    }
  },
);
