import type { WcagRef } from './types.js';

const U = 'https://www.w3.org/WAI/WCAG22/Understanding/';

/**
 * Every WCAG 2.2 Level A and AA success criterion (plus AAA criteria the
 * rule packs reference). 2.2 is the current W3C Recommendation; criteria
 * carry the version they first appeared in so reports can say "new in 2.2".
 */
export const WCAG: Record<string, WcagRef> = {
  '1.1.1': { sc: '1.1.1', name: 'Non-text Content', level: 'A', version: '2.0', url: `${U}non-text-content` },
  '1.2.1': { sc: '1.2.1', name: 'Audio-only and Video-only (Prerecorded)', level: 'A', version: '2.0', url: `${U}audio-only-and-video-only-prerecorded` },
  '1.2.2': { sc: '1.2.2', name: 'Captions (Prerecorded)', level: 'A', version: '2.0', url: `${U}captions-prerecorded` },
  '1.2.3': { sc: '1.2.3', name: 'Audio Description or Media Alternative (Prerecorded)', level: 'A', version: '2.0', url: `${U}audio-description-or-media-alternative-prerecorded` },
  '1.2.4': { sc: '1.2.4', name: 'Captions (Live)', level: 'AA', version: '2.0', url: `${U}captions-live` },
  '1.2.5': { sc: '1.2.5', name: 'Audio Description (Prerecorded)', level: 'AA', version: '2.0', url: `${U}audio-description-prerecorded` },
  '1.3.1': { sc: '1.3.1', name: 'Info and Relationships', level: 'A', version: '2.0', url: `${U}info-and-relationships` },
  '1.3.2': { sc: '1.3.2', name: 'Meaningful Sequence', level: 'A', version: '2.0', url: `${U}meaningful-sequence` },
  '1.3.3': { sc: '1.3.3', name: 'Sensory Characteristics', level: 'A', version: '2.0', url: `${U}sensory-characteristics` },
  '1.3.4': { sc: '1.3.4', name: 'Orientation', level: 'AA', version: '2.1', url: `${U}orientation` },
  '1.3.5': { sc: '1.3.5', name: 'Identify Input Purpose', level: 'AA', version: '2.1', url: `${U}identify-input-purpose` },
  '1.4.1': { sc: '1.4.1', name: 'Use of Color', level: 'A', version: '2.0', url: `${U}use-of-color` },
  '1.4.2': { sc: '1.4.2', name: 'Audio Control', level: 'A', version: '2.0', url: `${U}audio-control` },
  '1.4.3': { sc: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', version: '2.0', url: `${U}contrast-minimum` },
  '1.4.4': { sc: '1.4.4', name: 'Resize Text', level: 'AA', version: '2.0', url: `${U}resize-text` },
  '1.4.5': { sc: '1.4.5', name: 'Images of Text', level: 'AA', version: '2.0', url: `${U}images-of-text` },
  '1.4.10': { sc: '1.4.10', name: 'Reflow', level: 'AA', version: '2.1', url: `${U}reflow` },
  '1.4.11': { sc: '1.4.11', name: 'Non-text Contrast', level: 'AA', version: '2.1', url: `${U}non-text-contrast` },
  '1.4.12': { sc: '1.4.12', name: 'Text Spacing', level: 'AA', version: '2.1', url: `${U}text-spacing` },
  '1.4.13': { sc: '1.4.13', name: 'Content on Hover or Focus', level: 'AA', version: '2.1', url: `${U}content-on-hover-or-focus` },
  '2.1.1': { sc: '2.1.1', name: 'Keyboard', level: 'A', version: '2.0', url: `${U}keyboard` },
  '2.1.2': { sc: '2.1.2', name: 'No Keyboard Trap', level: 'A', version: '2.0', url: `${U}no-keyboard-trap` },
  '2.1.4': { sc: '2.1.4', name: 'Character Key Shortcuts', level: 'A', version: '2.1', url: `${U}character-key-shortcuts` },
  '2.2.1': { sc: '2.2.1', name: 'Timing Adjustable', level: 'A', version: '2.0', url: `${U}timing-adjustable` },
  '2.2.2': { sc: '2.2.2', name: 'Pause, Stop, Hide', level: 'A', version: '2.0', url: `${U}pause-stop-hide` },
  '2.3.3': { sc: '2.3.3', name: 'Animation from Interactions', level: 'AAA', version: '2.1', url: `${U}animation-from-interactions` },
  '2.3.1': { sc: '2.3.1', name: 'Three Flashes or Below Threshold', level: 'A', version: '2.0', url: `${U}three-flashes-or-below-threshold` },
  '2.4.1': { sc: '2.4.1', name: 'Bypass Blocks', level: 'A', version: '2.0', url: `${U}bypass-blocks` },
  '2.4.2': { sc: '2.4.2', name: 'Page Titled', level: 'A', version: '2.0', url: `${U}page-titled` },
  '2.4.3': { sc: '2.4.3', name: 'Focus Order', level: 'A', version: '2.0', url: `${U}focus-order` },
  '2.4.4': { sc: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', version: '2.0', url: `${U}link-purpose-in-context` },
  '2.4.5': { sc: '2.4.5', name: 'Multiple Ways', level: 'AA', version: '2.0', url: `${U}multiple-ways` },
  '2.4.6': { sc: '2.4.6', name: 'Headings and Labels', level: 'AA', version: '2.0', url: `${U}headings-and-labels` },
  '2.4.7': { sc: '2.4.7', name: 'Focus Visible', level: 'AA', version: '2.0', url: `${U}focus-visible` },
  '2.4.11': { sc: '2.4.11', name: 'Focus Not Obscured (Minimum)', level: 'AA', version: '2.2', url: `${U}focus-not-obscured-minimum` },
  '2.5.1': { sc: '2.5.1', name: 'Pointer Gestures', level: 'A', version: '2.1', url: `${U}pointer-gestures` },
  '2.5.2': { sc: '2.5.2', name: 'Pointer Cancellation', level: 'A', version: '2.1', url: `${U}pointer-cancellation` },
  '2.5.3': { sc: '2.5.3', name: 'Label in Name', level: 'A', version: '2.1', url: `${U}label-in-name` },
  '2.5.4': { sc: '2.5.4', name: 'Motion Actuation', level: 'A', version: '2.1', url: `${U}motion-actuation` },
  '2.5.5': { sc: '2.5.5', name: 'Target Size (Enhanced)', level: 'AAA', version: '2.1', url: `${U}target-size-enhanced` },
  '2.5.7': { sc: '2.5.7', name: 'Dragging Movements', level: 'AA', version: '2.2', url: `${U}dragging-movements` },
  '2.5.8': { sc: '2.5.8', name: 'Target Size (Minimum)', level: 'AA', version: '2.2', url: `${U}target-size-minimum` },
  '3.1.1': { sc: '3.1.1', name: 'Language of Page', level: 'A', version: '2.0', url: `${U}language-of-page` },
  '3.1.2': { sc: '3.1.2', name: 'Language of Parts', level: 'AA', version: '2.0', url: `${U}language-of-parts` },
  '3.2.1': { sc: '3.2.1', name: 'On Focus', level: 'A', version: '2.0', url: `${U}on-focus` },
  '3.2.2': { sc: '3.2.2', name: 'On Input', level: 'A', version: '2.0', url: `${U}on-input` },
  '3.2.3': { sc: '3.2.3', name: 'Consistent Navigation', level: 'AA', version: '2.0', url: `${U}consistent-navigation` },
  '3.2.4': { sc: '3.2.4', name: 'Consistent Identification', level: 'AA', version: '2.0', url: `${U}consistent-identification` },
  '3.2.6': { sc: '3.2.6', name: 'Consistent Help', level: 'A', version: '2.2', url: `${U}consistent-help` },
  '3.3.1': { sc: '3.3.1', name: 'Error Identification', level: 'A', version: '2.0', url: `${U}error-identification` },
  '3.3.2': { sc: '3.3.2', name: 'Labels or Instructions', level: 'A', version: '2.0', url: `${U}labels-or-instructions` },
  '3.3.3': { sc: '3.3.3', name: 'Error Suggestion', level: 'AA', version: '2.0', url: `${U}error-suggestion` },
  '3.3.4': { sc: '3.3.4', name: 'Error Prevention (Legal, Financial, Data)', level: 'AA', version: '2.0', url: `${U}error-prevention-legal-financial-data` },
  '3.3.7': { sc: '3.3.7', name: 'Redundant Entry', level: 'A', version: '2.2', url: `${U}redundant-entry` },
  '3.3.8': { sc: '3.3.8', name: 'Accessible Authentication (Minimum)', level: 'AA', version: '2.2', url: `${U}accessible-authentication-minimum` },
  '4.1.2': { sc: '4.1.2', name: 'Name, Role, Value', level: 'A', version: '2.0', url: `${U}name-role-value` },
  '4.1.3': { sc: '4.1.3', name: 'Status Messages', level: 'AA', version: '2.1', url: `${U}status-messages` },
};

/** All 55 Level A + AA criteria of WCAG 2.2, in document order. */
export const WCAG22_A_AA: string[] = Object.values(WCAG)
  .filter((ref) => ref.level !== 'AAA')
  .map((ref) => ref.sc);

/**
 * Success criterion counts for WCAG 2.2 (the current Recommendation):
 * 31 Level A + 24 Level AA + 31 Level AAA = 86 total (4.1.1 was removed).
 * Used by coverage reporting.
 */
export const WCAG22_TOTALS = { A: 31, AA: 24, AAA: 31, total: 86 } as const;

export function resolveWcag(scs: string[]): WcagRef[] {
  return scs.map((sc) => {
    const ref = WCAG[sc];
    if (!ref) throw new Error(`Unknown WCAG success criterion: ${sc}`);
    return ref;
  });
}

/**
 * One-line verification guidance for A+AA criteria that cannot be decided
 * from source code alone. Surfaced by `react-a11y --coverage` so every
 * criterion is either machine-checked or has an explicit manual check.
 */
export const MANUAL_CHECKS: Record<string, string> = {
  '1.2.1': 'Audio-only content has a transcript; video-only content has a transcript or audio track.',
  '1.2.3': 'Prerecorded video has an audio description or a full text alternative.',
  '1.2.4': 'Live video streams provide captions.',
  '1.2.5': 'Prerecorded video has an audio description track.',
  '1.3.3': 'Instructions never rely on shape, color, size or position alone ("click the round button on the right").',
  '1.3.4': 'The app works in both portrait and landscape; orientation is not locked without an essential reason.',
  '1.4.1': 'Color is never the only way information is conveyed (e.g. error fields also get text/icons, links are underlined).',
  '1.4.5': 'Text is real text, not baked into images (logos excepted).',
  '1.4.10': 'At 320px wide / 400% zoom, content reflows without two-dimensional scrolling.',
  '1.4.11': 'UI component boundaries and graphical objects have 3:1 contrast against adjacent colors.',
  '1.4.12': 'Nothing breaks when users override line height (1.5×), paragraph (2×), letter (0.12×) and word (0.16×) spacing.',
  '1.4.13': 'Tooltips/popovers shown on hover or focus are dismissable (Esc), hoverable, and persistent.',
  '2.1.4': 'Single-character keyboard shortcuts can be turned off, remapped, or only fire on focus.',
  '2.3.1': 'Nothing flashes more than three times per second.',
  '2.4.1': 'A skip link or landmark structure lets keyboard users bypass repeated blocks.',
  '2.4.5': 'There are at least two ways to find each page (nav, search, sitemap…).',
  '2.4.11': 'Focused elements are never fully hidden behind sticky headers/footers or overlays.',
  '2.5.1': 'Multipoint/path-based gestures (pinch, swipe) have single-pointer alternatives.',
  '2.5.4': 'Motion-based input (shake, tilt) has a UI alternative and can be disabled.',
  '2.5.7': 'Drag-and-drop interactions have a click/tap alternative.',
  '3.2.2': 'Changing a form control never auto-submits or navigates without warning.',
  '3.2.3': 'Navigation appears in the same relative order on every page/screen.',
  '3.2.4': 'Components with the same function are labeled consistently across the product.',
  '3.2.6': 'Help (contact, FAQ, chat) appears in the same place on every page that offers it.',
  '3.3.1': 'Validation errors are described in text and identify the field in error.',
  '3.3.3': 'Validation errors suggest how to fix the input when possible.',
  '3.3.4': 'Legal/financial submissions are reversible, checked, or confirmable before commit.',
  '3.3.7': 'Information already entered in a flow is auto-populated or selectable, never retyped.',
};
