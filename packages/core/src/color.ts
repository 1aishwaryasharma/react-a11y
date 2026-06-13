/** Color parsing + WCAG contrast math for statically-known style values. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const NAMED: Record<string, Rgb> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  orange: { r: 255, g: 165, b: 0 },
  purple: { r: 128, g: 0, b: 128 },
  gray: { r: 128, g: 128, b: 128 },
  grey: { r: 128, g: 128, b: 128 },
  silver: { r: 192, g: 192, b: 192 },
  maroon: { r: 128, g: 0, b: 0 },
  navy: { r: 0, g: 0, b: 128 },
  teal: { r: 0, g: 128, b: 128 },
  olive: { r: 128, g: 128, b: 0 },
  lime: { r: 0, g: 255, b: 0 },
  aqua: { r: 0, g: 255, b: 255 },
  cyan: { r: 0, g: 255, b: 255 },
  fuchsia: { r: 255, g: 0, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  brown: { r: 165, g: 42, b: 42 },
  pink: { r: 255, g: 192, b: 203 },
  gold: { r: 255, g: 215, b: 0 },
};

/**
 * Parse a statically-known color. Returns null for anything uncertain:
 * unknown formats, named colors outside the common set, or any alpha < 1
 * (the composited color depends on what's behind it).
 */
export function parseColor(value: unknown): Rgb | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v in NAMED) return NAMED[v];

  const hex = /^#([0-9a-f]{3,8})$/.exec(v)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4) {
      if (hex.length === 4 && hex[3] !== 'f') return null;
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      if (hex.length === 8 && hex.slice(6) !== 'ff') return null;
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    return null;
  }

  const fn = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
  if (fn) {
    if (fn[4] !== undefined && Number(fn[4]) < 1) return null;
    const [r, g, b] = [Number(fn[1]), Number(fn[2]), Number(fn[3])];
    if (r > 255 || g > 255 || b > 255) return null;
    return { r, g, b };
  }
  return null;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(c: Rgb): number {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** WCAG contrast ratio between two colors, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 1.4.3 "large text": ≥24px, or ≥18.66px (14pt) bold.
 * Large text needs 3:1; normal text needs 4.5:1.
 */
export function isLargeText(fontSizePx: number | undefined, bold: boolean): boolean {
  if (fontSizePx === undefined) return false;
  return fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
}
