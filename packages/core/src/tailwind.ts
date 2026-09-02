/**
 * Static resolution of Tailwind-style utility classes into the handful of
 * style properties the accessibility rules care about. One resolver backs
 * every Tailwind binding — Tailwind CSS on the web, NativeWind, Uniwind and
 * twrnc on React Native — because they all share the utility vocabulary and
 * differ only in the rem base and the palette version.
 *
 * The resolver is deliberately conservative: anything it cannot decide (a
 * theme color it does not know, a percentage width, a translucent color) is
 * recorded as `null` — "set, but unknown" — so a later rule never treats an
 * overridden value as absent.
 */
import { PALETTE_SHADES, PALETTE_V3, PALETTE_V4 } from './tailwind-palette.js';

export type TailwindPreset = 'v3' | 'v4';

export interface TailwindOptions {
  /** Which default palette to resolve `bg-red-500` & co. against. */
  preset: TailwindPreset;
  /** Pixels per rem for rem-based utilities (web 16; NativeWind v4 uses 14). */
  rem: number;
  /**
   * Extra theme colors, keyed the way they appear in a class: `brand` or
   * `brand-500`. Values are anything `parseColor` understands.
   */
  colors?: Record<string, string>;
  /**
   * Color keys the project's theme defines with a value we could not read
   * (an import, a call, a CSS variable). Resolving these against the default
   * palette would produce a confidently wrong hex, so they resolve to `null`.
   */
  unresolvedColors?: string[];
  /**
   * True when the project replaces `theme.colors` wholesale rather than
   * extending it, so a name we do not know is not a default-palette color.
   */
  replacesPalette?: boolean;
}

/** `null` means the utility set the property to a value we cannot resolve. */
export interface TailwindStyle {
  width?: number | null;
  height?: number | null;
  minWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  color?: string | null;
  backgroundColor?: string | null;
  fontSize?: number | null;
  fontWeight?: number | null;
  opacity?: number | null;
  display?: 'none' | 'flex';
  /** `sr-only` — clipped to a pixel for screen readers; not a pointer target. */
  srOnly?: boolean;
  /** Out-of-flow positioning; an `absolute` sibling can paint over a background. */
  position?: 'absolute' | 'fixed' | 'relative' | 'static' | 'sticky';
  /** `inset-0` (or `inset-x-0` + `inset-y-0`) — stretched to fill its container. */
  insetX?: boolean;
  insetY?: boolean;
  /** `outline-none` / `outline-hidden` (web focus ring removal). */
  outlineNone?: boolean;
}

export const DEFAULT_TAILWIND_OPTIONS: TailwindOptions = { preset: 'v4', rem: 16 };

const TEXT_SIZES: Record<string, number> = {
  xs: 0.75, sm: 0.875, base: 1, lg: 1.125, xl: 1.25, '2xl': 1.5, '3xl': 1.875,
  '4xl': 2.25, '5xl': 3, '6xl': 3.75, '7xl': 4.5, '8xl': 6, '9xl': 8,
};

const FONT_WEIGHTS: Record<string, number> = {
  thin: 100, extralight: 200, light: 300, normal: 400, medium: 500,
  semibold: 600, bold: 700, extrabold: 800, black: 900,
};

const DISPLAY_FLEX = new Set(['flex', 'block', 'inline', 'inline-block', 'inline-flex', 'grid', 'contents']);

const POSITIONS = new Set(['absolute', 'fixed', 'relative', 'static', 'sticky'] as const);

/** Split `variant:variant:utility`, ignoring colons inside `[...]`/`(...)`. */
export function splitVariantsPublic(token: string): { variants: string[]; utility: string } {
  return splitVariants(token);
}

function splitVariants(token: string): { variants: string[]; utility: string } {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of token) {
    if (ch === '[' || ch === '(') depth++;
    else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ':' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  const utility = parts.pop() ?? '';
  return { variants: parts, utility };
}

/** Arbitrary value inside `[...]`, with Tailwind's `_` → space convention. */
function arbitrary(value: string): string | undefined {
  if (value.length < 3 || !value.startsWith('[') || !value.endsWith(']')) return undefined;
  return value.slice(1, -1).replace(/_/g, ' ');
}

/** Resolve a length utility value to pixels; `null` when set but unknowable. */
export function resolveLength(value: string, options: TailwindOptions): number | null {
  if (value === 'px') return 1;
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * 0.25 * options.rem;
  const arb = arbitrary(value);
  if (arb !== undefined) {
    const m = /^(-?\d+(?:\.\d+)?)(px|rem|)$/.exec(arb.trim());
    if (!m) return null;
    const n = Number(m[1]);
    return m[2] === 'rem' ? n * options.rem : n;
  }
  // full, screen, auto, fit, min, max, fractions, dvh, custom theme keys …
  return null;
}

function paletteHex(name: string, shade: string, preset: TailwindPreset): string | undefined {
  const palette = preset === 'v3' ? PALETTE_V3 : PALETTE_V4;
  const family = palette[name];
  if (!family) return undefined;
  const index = (PALETTE_SHADES as readonly number[]).indexOf(Number(shade));
  return index === -1 ? undefined : `#${family[index]}`;
}

/**
 * Resolve a color utility value (`white`, `gray-400`, `[#fff]`, `brand-500`)
 * to a color string `parseColor` understands. `'transparent'` is returned
 * verbatim; `null` means set-but-unknown (opacity modifiers, CSS variables,
 * `current`, theme colors we were not told about).
 */
export function resolveColor(value: string, options: TailwindOptions): string | null {
  // `bg-white/50` — an opacity modifier makes the composited color depend on
  // what is behind it. A `/100` modifier is a no-op.
  const slash = value.lastIndexOf('/');
  if (slash > 0 && !value.startsWith('[')) {
    const modifier = value.slice(slash + 1);
    if (modifier !== '100') return null;
    value = value.slice(0, slash);
  }
  // The project's own theme wins over every built-in name: a theme is allowed
  // to redefine `white`, and silently resolving it to #ffffff would be wrong.
  const custom = options.colors?.[value];
  if (custom !== undefined) return custom;
  const dash = value.lastIndexOf('-');
  const family = dash > 0 ? value.slice(0, dash) : value;
  if (options.unresolvedColors?.includes(value) || options.unresolvedColors?.includes(family)) return null;
  if (value === 'white') return '#ffffff';
  if (value === 'black') return '#000000';
  if (value === 'transparent') return 'transparent';
  if (value === 'current' || value === 'inherit') return null;
  const arb = arbitrary(value);
  if (arb !== undefined) {
    if (/^(#[0-9a-fA-F]{3,8}|rgba?\(.*\)|oklch\(.*\)|[a-zA-Z]+)$/.test(arb.trim())) return arb.trim();
    return null; // var(--x), hsl(), url() …
  }
  // A project that replaced the palette has no default-palette colors left.
  if (options.replacesPalette) return null;
  if (dash > 0) {
    const hex = paletteHex(family, value.slice(dash + 1), options.preset);
    if (hex) return hex;
  }
  return null;
}

/** Whether a `text-*` value denotes a font size rather than a color. */
function textSize(value: string, options: TailwindOptions): number | null | undefined {
  const base = value.split('/')[0]; // text-sm/6 (size with line-height)
  if (base in TEXT_SIZES) return TEXT_SIZES[base] * options.rem;
  const arb = arbitrary(value);
  if (arb !== undefined) {
    const m = /^(\d+(?:\.\d+)?)(px|rem)$/.exec(arb.trim());
    if (m) return m[2] === 'rem' ? Number(m[1]) * options.rem : Number(m[1]);
    if (/^length:/.test(arb)) return null;
  }
  return undefined;
}

const TEXT_NON_COLOR = new Set([
  'left', 'center', 'right', 'justify', 'start', 'end', 'wrap', 'nowrap',
  'balance', 'pretty', 'ellipsis', 'clip',
]);

/**
 * `text-*` utilities that set something other than the colour. Treating
 * `text-shadow-md` or `text-opacity-50` as an unresolvable colour would blank
 * out the element's real colour and silence contrast for its whole subtree.
 */
const TEXT_NON_COLOR_PREFIX = /^(shadow-|opacity-|decoration-|underline|overline|line-through|indent-|wrap-)/;

/** `bg-*` utilities that are not colours (position, size, gradients, blend modes). */
const BG_NON_COLOR = /^(cover|contain|auto|none|fixed|local|scroll|repeat|no-repeat|clip-|origin-|gradient|linear|radial|conic|top|bottom|left|right|center|blend-|opacity-|size-|position-|image-|attachment-)/;

/** Apply one (variant-stripped) utility to a style object. Unknown utilities are ignored. */
export function applyUtility(style: TailwindStyle, utility: string, options: TailwindOptions): void {
  // `!w-6` (v3) / `w-6!` (v4) important markers, `-mt-2` negatives.
  let u = utility;
  if (u.startsWith('!')) u = u.slice(1);
  if (u.endsWith('!')) u = u.slice(0, -1);
  if (u.startsWith('-')) return; // negative utilities are margins/insets — irrelevant here

  if (u === 'hidden') { style.display = 'none'; return; }
  if (u === 'sr-only') { style.srOnly = true; return; }
  if (u === 'inset-0') { style.insetX = true; style.insetY = true; return; }
  if (u === 'inset-x-0') { style.insetX = true; return; }
  if (u === 'inset-y-0') { style.insetY = true; return; }
  if (u === 'not-sr-only') { style.srOnly = false; return; }
  if (POSITIONS.has(u as 'absolute')) { style.position = u as TailwindStyle['position']; return; }
  if (DISPLAY_FLEX.has(u)) { style.display = 'flex'; return; }
  if (u === 'outline-none' || u === 'outline-hidden') { style.outlineNone = true; return; }

  const dash = u.indexOf('-');
  if (dash === -1) return;
  const prefix = u.slice(0, dash);
  const rest = u.slice(dash + 1);

  switch (prefix) {
    case 'size': {
      const n = resolveLength(rest, options);
      style.width = n;
      style.height = n;
      return;
    }
    case 'w': style.width = resolveLength(rest, options); return;
    case 'h': style.height = resolveLength(rest, options); return;
    case 'min':
      if (rest.startsWith('w-')) style.minWidth = resolveLength(rest.slice(2), options);
      else if (rest.startsWith('h-')) style.minHeight = resolveLength(rest.slice(2), options);
      return;
    case 'max':
      if (rest.startsWith('h-')) style.maxHeight = resolveLength(rest.slice(2), options);
      return;
    case 'bg': {
      // bg-cover, bg-gradient-to-r, bg-none, bg-clip-* are not colors.
      if (BG_NON_COLOR.test(rest)) return;
      style.backgroundColor = resolveColor(rest, options);
      return;
    }
    case 'text': {
      if (TEXT_NON_COLOR.has(rest) || TEXT_NON_COLOR_PREFIX.test(rest)) return;
      const size = textSize(rest, options);
      if (size !== undefined) { style.fontSize = size; return; }
      style.color = resolveColor(rest, options);
      return;
    }
    case 'font': {
      if (rest in FONT_WEIGHTS) { style.fontWeight = FONT_WEIGHTS[rest]; return; }
      const arb = arbitrary(rest);
      if (arb !== undefined && /^\d{3}$/.test(arb)) style.fontWeight = Number(arb);
      return;
    }
    case 'opacity': {
      if (/^\d+$/.test(rest)) { style.opacity = Number(rest) / 100; return; }
      const arb = arbitrary(rest);
      if (arb !== undefined) {
        const n = Number(arb.replace('%', ''));
        style.opacity = Number.isFinite(n) ? (arb.includes('%') ? n / 100 : n) : null;
      }
      return;
    }
    default:
      return;
  }
}

/**
 * Resolve a whole class string. Utilities without a variant go into the `''`
 * layer; `dark:bg-gray-900` goes into the `dark` layer, `sm:hover:…` into
 * `sm:hover`. Later utilities override earlier ones within a layer.
 */
export function resolveClassString(
  classes: string,
  options: TailwindOptions = DEFAULT_TAILWIND_OPTIONS,
): Map<string, TailwindStyle> {
  const layers = new Map<string, TailwindStyle>();
  for (const token of classes.split(/\s+/)) {
    if (!token) continue;
    const { variants, utility } = splitVariants(token);
    const key = variants.join(':');
    let style = layers.get(key);
    if (!style) {
      style = {};
      layers.set(key, style);
    }
    applyUtility(style, utility, options);
  }
  return layers;
}

/** Variants under which text is exempt from contrast requirements. */
const CONTRAST_EXEMPT_VARIANTS = new Set(['disabled', 'placeholder', 'aria-disabled', 'file', 'marker', 'selection']);

/** True when a layer key (e.g. `dark:disabled`) contains a contrast-exempt variant. */
export function isContrastExemptLayer(key: string): boolean {
  return key.split(/[:|]/).some((v) => CONTRAST_EXEMPT_VARIANTS.has(v));
}

/**
 * A focus variant in a layer key. Covers the plain `focus:` family and the
 * relational forms a focus ring is commonly written with — `group-focus:`,
 * `peer-focus-visible:`, `has-focus-visible:` — since any of them means a
 * visible focus style exists.
 */
const FOCUS_VARIANT = /^(group-|peer-|has-|in-)?focus(-visible|-within)?$/;

export function isFocusLayer(key: string): boolean {
  return key.split(/[:|]/).some((v) => FOCUS_VARIANT.test(v));
}
