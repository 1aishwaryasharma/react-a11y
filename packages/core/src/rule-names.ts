import type { A11yConfig } from './types.js';

/**
 * Rules of the ESLint plugins react-a11y supplements. A config that sets one
 * of these is almost certainly meant for ESLint, and silently accepting it
 * leaves the user believing they changed something.
 */
const FOREIGN_RULES: ReadonlyMap<string, string> = new Map([
  ...[
    'accessible-emoji', 'alt-text', 'anchor-ambiguous-text', 'anchor-has-content', 'anchor-is-valid',
    'aria-activedescendant-has-tabindex', 'aria-props', 'aria-proptypes', 'aria-role',
    'aria-unsupported-elements', 'autocomplete-valid', 'click-events-have-key-events',
    'control-has-associated-label', 'heading-has-content', 'html-has-lang', 'iframe-has-title',
    'img-redundant-alt', 'interactive-supports-focus', 'label-has-associated-control', 'label-has-for',
    'lang', 'media-has-caption', 'mouse-events-have-key-events', 'no-access-key',
    'no-aria-hidden-on-focusable', 'no-autofocus', 'no-distracting-elements',
    'no-interactive-element-to-noninteractive-role', 'no-noninteractive-element-interactions',
    'no-noninteractive-element-to-interactive-role', 'no-noninteractive-tabindex', 'no-onchange',
    'no-redundant-roles', 'no-static-element-interactions', 'prefer-tag-over-role',
    'role-has-required-aria-props', 'role-supports-aria-props', 'scope', 'tabindex-no-positive',
  ].map((id): [string, string] => [id, 'eslint-plugin-jsx-a11y']),
  ...[
    'has-accessibility-hint', 'has-accessibility-props', 'has-valid-accessibility-actions',
    'has-valid-accessibility-component-type', 'has-valid-accessibility-descriptors',
    'has-valid-accessibility-ignores-invert-colors', 'has-valid-accessibility-live-region',
    'has-valid-accessibility-role', 'has-valid-accessibility-state', 'has-valid-accessibility-states',
    'has-valid-accessibility-traits', 'has-valid-accessibility-value',
    'has-valid-important-for-accessibility', 'no-nested-touchables',
  ].map((id): [string, string] => [id, 'eslint-plugin-react-native-a11y']),
]);

/** ESLint's prefixed spelling of a plugin rule: `jsx-a11y/alt-text`. */
const PLUGIN_PREFIXES: ReadonlyMap<string, string> = new Map([
  ['jsx-a11y/', 'eslint-plugin-jsx-a11y'],
  ['react-native-a11y/', 'eslint-plugin-react-native-a11y'],
]);

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * One warning per `rules` key that names no react-a11y rule: a rule of the
 * ESLint plugin it belongs to, a likely typo, or simply unknown. Setting such
 * a key used to be accepted and silently do nothing.
 */
export function ruleNameWarnings(config: A11yConfig, knownRuleIds: Iterable<string>): string[] {
  const known = new Set(knownRuleIds);
  const warnings: string[] = [];
  for (const id of Object.keys(config.rules ?? {})) {
    if (known.has(id)) continue;
    const prefix = [...PLUGIN_PREFIXES.keys()].find((p) => id.startsWith(p));
    const plugin = prefix ? PLUGIN_PREFIXES.get(prefix) : FOREIGN_RULES.get(id);
    if (plugin) {
      warnings.push(`"${id}" is an ${plugin} rule, not a react-a11y one — configure it in your ESLint config.`);
      continue;
    }
    const nearest = [...known]
      .map((candidate) => ({ candidate, distance: editDistance(id, candidate) }))
      .sort((a, b) => a.distance - b.distance)[0];
    warnings.push(nearest && nearest.distance <= Math.max(2, Math.floor(id.length / 5))
      ? `unknown rule "${id}" — did you mean "${nearest.candidate}"?`
      : `unknown rule "${id}" — run --list-rules to see the rule ids.`);
  }
  return warnings;
}
