import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { A11yConfig, TailwindConfig } from './types.js';
import { DEFAULT_TAILWIND_OPTIONS, type TailwindOptions, type TailwindPreset } from './tailwind.js';

/**
 * Facts about the project that rules need but a single file cannot tell:
 * which packages are installed (React Native version gates, Tailwind
 * bindings) and how to resolve Tailwind classes.
 */
export interface ProjectInfo {
  /** Every dependency section of package.json merged, name → version range. */
  dependencies: Record<string, string>;
  /** Present when a Tailwind binding is installed or configured; absent disables class resolution. */
  tailwind?: TailwindOptions;
}

/** First numeric component of a semver range (`^0.84.1` → 0, `~4.1` → 4). */
export function majorVersion(range: string | undefined): number | undefined {
  const m = /(\d+)/.exec(range ?? '');
  return m ? Number(m[1]) : undefined;
}

/** `[major, minor]` of a semver range, or undefined when it has no numbers. */
export function versionParts(range: string | undefined): [number, number] | undefined {
  const m = /(\d+)\.(\d+)/.exec(range ?? '');
  return m ? [Number(m[1]), Number(m[2])] : undefined;
}

function readDependencies(root: string): Record<string, string> {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return { ...pkg.peerDependencies, ...pkg.devDependencies, ...pkg.dependencies };
  } catch {
    return {};
  }
}

/** Packages whose presence means `className` (or `tw`) carries Tailwind utilities. */
const TAILWIND_BINDINGS = [
  'tailwindcss', 'nativewind', 'uniwind', 'twrnc', 'react-native-css',
  '@tailwindcss/postcss', '@tailwindcss/vite', 'tailwind-rn',
];

/** Flatten `{ brand: { 500: '#…', DEFAULT: '#…' } }` into `brand-500`, `brand`. */
function flattenColors(node: ts.ObjectLiteralExpression, prefix: string, into: Record<string, string>): void {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)
      ? prop.name.text
      : undefined;
    if (name === undefined) continue;
    const key = name === 'DEFAULT' ? prefix : prefix ? `${prefix}-${name}` : name;
    if (ts.isStringLiteralLike(prop.initializer)) {
      if (!prop.initializer.text.includes('<alpha-value>')) into[key] = prop.initializer.text;
    } else if (ts.isObjectLiteralExpression(prop.initializer)) {
      flattenColors(prop.initializer, key, into);
    }
  }
}

/**
 * Best-effort static read of `theme.colors` / `theme.extend.colors` from a
 * `tailwind.config.*` file. The config is never executed — only literal
 * object trees are understood, which covers the common case.
 */
export function readTailwindConfigColors(root: string): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const name of ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts']) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    let sf: ts.SourceFile;
    try {
      sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    } catch {
      continue;
    }
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'colors'
        && ts.isObjectLiteralExpression(node.initializer)) {
        flattenColors(node.initializer, '', colors);
      }
      node.forEachChild(visit);
    };
    visit(sf);
    break;
  }
  return colors;
}

/**
 * Tailwind v4 is configured in CSS: `@theme { --color-brand-500: #… }`.
 * Scans CSS files up to two directories deep for those declarations.
 */
export function readCssThemeColors(root: string): Record<string, string> {
  const colors: Record<string, string> = {};
  const walk = (dir: string, depth: number): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < 2) walk(full, depth + 1);
      } else if (entry.name.endsWith('.css')) {
        let css: string;
        try {
          css = fs.readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (!css.includes('@theme')) continue;
        for (const m of css.matchAll(/--color-([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
          const value = m[2].trim();
          if (!value.startsWith('var(')) colors[m[1]] = value;
        }
      }
    }
  };
  walk(root, 0);
  return colors;
}

function detectTailwind(deps: Record<string, string>, config: TailwindConfig | undefined, root: string): TailwindOptions | undefined {
  const installed = TAILWIND_BINDINGS.some((name) => name in deps);
  if (!installed && !config) return undefined;
  const tailwindMajor = majorVersion(deps['tailwindcss']);
  const nativewindMajor = majorVersion(deps['nativewind']);
  let preset: TailwindPreset = DEFAULT_TAILWIND_OPTIONS.preset;
  if (tailwindMajor !== undefined) preset = tailwindMajor >= 4 ? 'v4' : 'v3';
  else if (nativewindMajor !== undefined) preset = nativewindMajor >= 5 ? 'v4' : 'v3';
  else if ('twrnc' in deps || 'tailwind-rn' in deps) preset = 'v3';
  // NativeWind v4 scales rem to 14px by default; browsers and the other bindings use 16.
  const rem = nativewindMajor !== undefined && nativewindMajor <= 4 ? 14 : DEFAULT_TAILWIND_OPTIONS.rem;
  const colors = { ...readTailwindConfigColors(root), ...readCssThemeColors(root), ...config?.colors };
  return {
    preset: config?.preset ?? preset,
    rem: config?.rem ?? rem,
    ...(Object.keys(colors).length > 0 ? { colors } : {}),
  };
}

/** Read project facts once per scan; cheap enough to call per editor lint. */
export function readProjectInfo(root: string, config: A11yConfig = {}): ProjectInfo {
  const dependencies = readDependencies(root);
  const tailwind = config.tailwind === false
    ? undefined
    : detectTailwind(dependencies, config.tailwind, root);
  return { dependencies, ...(tailwind ? { tailwind } : {}) };
}
