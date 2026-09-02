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

  const fn = /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(v);
  if (fn) {
    if (fn[4] !== undefined && !isOpaque(fn[4])) return null;
    const [r, g, b] = [Number(fn[1]), Number(fn[2]), Number(fn[3])];
    if (r > 255 || g > 255 || b > 255) return null;
    return { r, g, b };
  }

  const hsl = /^hsla?\(\s*(-?[\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/.exec(v);
  if (hsl) {
    if (hsl[4] !== undefined && !isOpaque(hsl[4])) return null;
    return hslToRgb(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100);
  }

  const oklch = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+(-?[\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?)\s*)?\)$/.exec(v);
  if (oklch) {
    if (oklch[4] !== undefined && !isOpaque(oklch[4])) return null;
    const l = oklch[1].endsWith('%') ? Number(oklch[1].slice(0, -1)) / 100 : Number(oklch[1]);
    const c = oklch[2].endsWith('%') ? (Number(oklch[2].slice(0, -1)) / 100) * 0.4 : Number(oklch[2]);
    return oklchToRgb(l, c, Number(oklch[3]));
  }
  return null;
}

/** An alpha component that leaves the color fully opaque. */
function isOpaque(alpha: string): boolean {
  const n = alpha.endsWith('%') ? Number(alpha.slice(0, -1)) / 100 : Number(alpha);
  return Number.isFinite(n) && n >= 1;
}

/** Clamp a 0–1 channel to 8-bit. */
function to8Bit(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] :
    hue < 120 ? [x, c, 0] :
    hue < 180 ? [0, c, x] :
    hue < 240 ? [0, x, c] :
    hue < 300 ? [x, 0, c] : [c, 0, x];
  return { r: to8Bit(r + m), g: to8Bit(g + m), b: to8Bit(b + m) };
}

/** sRGB transfer function (linear-light → gamma-encoded). */
function gammaEncode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * `oklch(L C H)` → sRGB, via OKLab and linear sRGB. Tailwind v4 and shadcn
 * write their palettes in OKLCH, so without this every modern theme color
 * resolves to "unknown" and its contrast goes unchecked. Verified against the
 * v4 palette table: `oklch(0.623 0.214 259.815)` → #2b7fff (blue-500).
 */
function oklchToRgb(lightness: number, chroma: number, hue: number): Rgb {
  const rad = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(rad);
  const b = chroma * Math.sin(rad);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  return {
    r: to8Bit(gammaEncode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: to8Bit(gammaEncode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: to8Bit(gammaEncode(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)),
  };
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
