/**
 * The aria-* props React Native supports (RN 0.71+), as one canonical model.
 * Every rule list that mentions an aria prop is derived from this table — when
 * a React Native release adds a prop, this is the only place to update.
 *
 * `kind` is the value type React Native expects. Unlike the DOM, RN treats
 * these as plain JS values — a string "false" on a boolean prop is truthy.
 * `descriptor` marks props that describe an accessibility element and so only
 * take effect when the element is one (see label-needs-accessible).
 */
interface AriaPropDef {
  kind: 'boolean' | 'tristate' | 'string' | 'number' | 'enum';
  descriptor?: boolean;
}

export const ARIA_PROPS: ReadonlyMap<string, AriaPropDef> = new Map<string, AriaPropDef>([
  ['aria-busy', { kind: 'boolean', descriptor: true }],
  ['aria-checked', { kind: 'tristate', descriptor: true }],
  ['aria-disabled', { kind: 'boolean', descriptor: true }],
  ['aria-expanded', { kind: 'boolean', descriptor: true }],
  ['aria-hidden', { kind: 'boolean' }],
  ['aria-label', { kind: 'string', descriptor: true }],
  ['aria-labelledby', { kind: 'string', descriptor: true }],
  ['aria-live', { kind: 'enum' }],
  ['aria-modal', { kind: 'boolean' }],
  ['aria-selected', { kind: 'boolean', descriptor: true }],
  ['aria-valuemax', { kind: 'number', descriptor: true }],
  ['aria-valuemin', { kind: 'number', descriptor: true }],
  ['aria-valuenow', { kind: 'number', descriptor: true }],
  ['aria-valuetext', { kind: 'string', descriptor: true }],
]);

const entries = [...ARIA_PROPS];

/** Every aria-* prop name React Native recognizes. */
export const KNOWN_ARIA_PROPS = new Set(ARIA_PROPS.keys());

/** Props that expect a boolean (aria-checked also allows "mixed"). */
export const BOOLEAN_ARIA_PROPS = entries
  .filter(([, def]) => def.kind === 'boolean' || def.kind === 'tristate')
  .map(([name]) => name);

/** Props that only take effect on an accessibility element. */
export const ARIA_DESCRIPTOR_PROPS = entries
  .filter(([, def]) => def.descriptor)
  .map(([name]) => name);

/** The aria-* ways to give an element an accessible name. */
export const ARIA_LABEL_PROPS = ['aria-label', 'aria-labelledby'];
