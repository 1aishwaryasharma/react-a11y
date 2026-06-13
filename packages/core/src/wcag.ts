import type { WcagRef } from './types.js';

const U = 'https://www.w3.org/WAI/WCAG22/Understanding/';

/**
 * WCAG 2.2 success criteria referenced by the rule packs.
 * 2.2 is the current W3C Recommendation; criteria carry the version
 * they first appeared in so reports can say e.g. "new in 2.2".
 */
export const WCAG: Record<string, WcagRef> = {
  '1.1.1': { sc: '1.1.1', name: 'Non-text Content', level: 'A', version: '2.0', url: `${U}non-text-content` },
  '1.2.2': { sc: '1.2.2', name: 'Captions (Prerecorded)', level: 'A', version: '2.0', url: `${U}captions-prerecorded` },
  '1.3.1': { sc: '1.3.1', name: 'Info and Relationships', level: 'A', version: '2.0', url: `${U}info-and-relationships` },
  '2.1.1': { sc: '2.1.1', name: 'Keyboard', level: 'A', version: '2.0', url: `${U}keyboard` },
  '2.2.2': { sc: '2.2.2', name: 'Pause, Stop, Hide', level: 'A', version: '2.0', url: `${U}pause-stop-hide` },
  '2.4.1': { sc: '2.4.1', name: 'Bypass Blocks', level: 'A', version: '2.0', url: `${U}bypass-blocks` },
  '2.4.3': { sc: '2.4.3', name: 'Focus Order', level: 'A', version: '2.0', url: `${U}focus-order` },
  '2.4.4': { sc: '2.4.4', name: 'Link Purpose (In Context)', level: 'A', version: '2.0', url: `${U}link-purpose-in-context` },
  '2.4.6': { sc: '2.4.6', name: 'Headings and Labels', level: 'AA', version: '2.0', url: `${U}headings-and-labels` },
  '2.5.5': { sc: '2.5.5', name: 'Target Size (Enhanced)', level: 'AAA', version: '2.1', url: `${U}target-size-enhanced` },
  '2.5.8': { sc: '2.5.8', name: 'Target Size (Minimum)', level: 'AA', version: '2.2', url: `${U}target-size-minimum` },
  '3.1.1': { sc: '3.1.1', name: 'Language of Page', level: 'A', version: '2.0', url: `${U}language-of-page` },
  '3.2.1': { sc: '3.2.1', name: 'On Focus', level: 'A', version: '2.0', url: `${U}on-focus` },
  '3.3.2': { sc: '3.3.2', name: 'Labels or Instructions', level: 'A', version: '2.0', url: `${U}labels-or-instructions` },
  '4.1.2': { sc: '4.1.2', name: 'Name, Role, Value', level: 'A', version: '2.0', url: `${U}name-role-value` },
};

export function resolveWcag(scs: string[]): WcagRef[] {
  return scs.map((sc) => {
    const ref = WCAG[sc];
    if (!ref) throw new Error(`Unknown WCAG success criterion: ${sc}`);
    return ref;
  });
}
