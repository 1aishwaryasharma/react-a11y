import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { A11yConfig, Platform, TailwindConfig } from './types.js';
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
  /** Directory of the package.json these facts came from, when one was found. */
  packageDir?: string;
  /** Whether this package is React Native or web, from its own dependencies. */
  platform: Platform;
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

interface Manifest {
  dir: string;
  pkg: Record<string, unknown>;
}

/**
 * Reading a project's Tailwind config means parsing files and, for a v4
 * `@theme` block, walking several directories of CSS. A scan resolves facts
 * per source file, so without memoising per directory a large monorepo would
 * redo that walk thousands of times.
 */
const THEME_CACHE = new Map<string, TailwindTheme>();
const CSS_THEME_CACHE = new Map<string, Record<string, string>>();
const CSS_ROOT_VARS_CACHE = new Map<string, Map<string, string | null>>();
const BUNDLER_REM_CACHE = new Map<string, number | undefined>();
const MANIFEST_CACHE = new Map<string, Manifest | undefined>();

/** Drop the config caches; call between scans in a long-lived process. */
export function clearProjectCaches(): void {
  THEME_CACHE.clear();
  CSS_THEME_CACHE.clear();
  CSS_ROOT_VARS_CACHE.clear();
  BUNDLER_REM_CACHE.clear();
  MANIFEST_CACHE.clear();
}

function readManifest(dir: string): Manifest | undefined {
  if (MANIFEST_CACHE.has(dir)) return MANIFEST_CACHE.get(dir);
  const manifest = loadManifest(dir);
  MANIFEST_CACHE.set(dir, manifest);
  return manifest;
}

function loadManifest(dir: string): Manifest | undefined {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return pkg && typeof pkg === 'object' ? { dir, pkg } : undefined;
  } catch {
    return undefined;
  }
}

function depsOf(pkg: Record<string, unknown>): Record<string, string> {
  return {
    ...(pkg.peerDependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined),
    ...(pkg.dependencies as Record<string, string> | undefined),
  };
}

/** How far up the tree we look for an owning package.json before giving up. */
const MAX_MANIFEST_DEPTH = 12;

/**
 * The package.json chain that governs `start`, nearest first. A workspace
 * package and its monorepo root are both in scope: `apps/mobile` declares
 * `nativewind` while the root declares the toolchain, and a rule needs the
 * union. The walk stops after the first directory containing `.git`, which
 * is the outermost thing that can reasonably be called "this project".
 */
export function manifestChain(start: string): Manifest[] {
  const chain: Manifest[] = [];
  let dir = fs.existsSync(start) && fs.statSync(start).isFile() ? path.dirname(start) : start;
  for (let depth = 0; depth < MAX_MANIFEST_DEPTH; depth++) {
    const manifest = readManifest(dir);
    if (manifest) chain.push(manifest);
    const atRepoRoot = fs.existsSync(path.join(dir, '.git'));
    const parent = path.dirname(dir);
    if (atRepoRoot || parent === dir) break;
    dir = parent;
  }
  return chain;
}

/** Dependencies governing `start`, with the nearest package.json winning. */
function readDependenciesFor(chain: Manifest[]): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const manifest of [...chain].reverse()) Object.assign(merged, depsOf(manifest.pkg));
  return merged;
}

/** Every dependency section of `root`'s package.json merged. */
export function readDependencies(root: string): Record<string, string> {
  return readDependenciesFor(manifestChain(root));
}

/** Packages whose presence means `className` (or `tw`) carries Tailwind utilities. */
const TAILWIND_BINDINGS = [
  'tailwindcss', 'nativewind', 'uniwind', 'twrnc', 'react-native-css',
  '@tailwindcss/postcss', '@tailwindcss/vite', 'tailwind-rn',
  // twrnc's pre-4.x package name, and NativeWind v4's style engine.
  'tailwind-react-native-classnames', 'react-native-css-interop',
];

export interface TailwindTheme {
  /** Flattened literal theme colors, keyed the way they appear in a class. */
  colors: Record<string, string>;
  /** Color keys the config defines but whose value could not be read statically. */
  unresolved: string[];
  /** True when `theme.colors` replaces the default palette outright. */
  replacesPalette: boolean;
}

/**
 * Flatten `{ brand: { 500: '#…', DEFAULT: '#…' } }` into `brand-500`, `brand`.
 * Keys whose value is not a literal (an import, a call, a spread) are recorded
 * in `unresolved` so the resolver abstains instead of falling back to the
 * default palette and reporting a confidently wrong hex.
 */
function flattenColors(
  node: ts.ObjectLiteralExpression,
  prefix: string,
  into: Record<string, string>,
  unresolved: Set<string>,
): void {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) {
      // `...colors` / shorthand / methods: whatever they contribute is unreadable,
      // but a spread of the stock palette is the common case, so only the named
      // keys below are marked unresolved.
      continue;
    }
    const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) || ts.isNumericLiteral(prop.name)
      ? prop.name.text
      : undefined;
    if (name === undefined) continue;
    const key = name === 'DEFAULT' ? prefix : prefix ? `${prefix}-${name}` : name;
    if (ts.isStringLiteralLike(prop.initializer)) {
      if (prop.initializer.text.includes('<alpha-value>')) unresolved.add(key);
      else into[key] = prop.initializer.text;
    } else if (ts.isObjectLiteralExpression(prop.initializer)) {
      flattenColors(prop.initializer, key, into, unresolved);
    } else {
      unresolved.add(key);
    }
  }
}

/** The `colors` object under a `theme` node, and whether it replaces the palette. */
function readThemeNode(theme: ts.ObjectLiteralExpression, out: TailwindTheme, unresolved: Set<string>): boolean {
  let found = false;
  for (const prop of theme.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
    if (prop.name.text === 'colors' && ts.isObjectLiteralExpression(prop.initializer)) {
      flattenColors(prop.initializer, '', out.colors, unresolved);
      // A spread (`...colors`) most likely pulls the stock palette back in, so
      // only a spread-free literal replaces it.
      if (!prop.initializer.properties.some(ts.isSpreadAssignment)) out.replacesPalette = true;
      found = true;
    } else if (prop.name.text === 'extend' && ts.isObjectLiteralExpression(prop.initializer)) {
      for (const ext of prop.initializer.properties) {
        if (!ts.isPropertyAssignment(ext) || !ts.isIdentifier(ext.name) || ext.name.text !== 'colors') continue;
        if (ts.isObjectLiteralExpression(ext.initializer)) {
          flattenColors(ext.initializer, '', out.colors, unresolved);
          found = true;
        }
      }
    }
  }
  return found;
}

/**
 * Tailwind resolves its config in this order and uses the first file that
 * exists; a `.js` shim that re-exports the real `.ts` config is common, so we
 * keep looking when a file yields no readable `theme`.
 */
const TAILWIND_CONFIG_FILES = [
  'tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts',
];

/**
 * Best-effort static read of `theme.colors` / `theme.extend.colors` from a
 * `tailwind.config.*` file. The config is never executed — only literal
 * object trees are understood, which covers the common case. Only those two
 * paths are read: a `colors` key anywhere else (a daisyUI theme block, a
 * plugin's options) is not the project palette.
 */
export function readTailwindTheme(root: string): TailwindTheme {
  const cached = THEME_CACHE.get(root);
  if (cached) return cached;
  const out: TailwindTheme = { colors: {}, unresolved: [], replacesPalette: false };
  const unresolved = new Set<string>();
  for (const name of TAILWIND_CONFIG_FILES) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    let sf: ts.SourceFile;
    try {
      sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    } catch {
      continue;
    }
    let found = false;
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'theme'
        && ts.isObjectLiteralExpression(node.initializer)) {
        if (readThemeNode(node.initializer, out, unresolved)) found = true;
      }
      node.forEachChild(visit);
    };
    visit(sf);
    if (found) break;
  }
  out.unresolved = [...unresolved];
  THEME_CACHE.set(root, out);
  return out;
}

/** Back-compatible view of {@link readTailwindTheme}. */
export function readTailwindConfigColors(root: string): Record<string, string> {
  return readTailwindTheme(root).colors;
}

/** How deep to look for the CSS file holding a Tailwind v4 `@theme` block. */
const CSS_THEME_DEPTH = 4;

/** A `--name: value;` declaration inside a CSS block. */
const CSS_DECLARATION = /--([a-zA-Z0-9-]+)\s*:\s*([^;{}]+);/g;

/** The body of every `:root { … }` (or `:root, .light { … }`) block. */
const ROOT_BLOCK = /:root[^{}]*\{([^{}]*)\}/g;

/** The body of every `@theme … { … }` block. */
const THEME_BLOCK = /@theme[^{}]*\{([^{}]*)\}/g;

/**
 * Follow `var(--x)` chains through the `:root` variables of a project. A
 * variable defined more than once at `:root` (two theme files) is ambiguous
 * and resolves to nothing rather than to whichever file happened to be read
 * first.
 */
function substituteVars(value: string, vars: Map<string, string | null>, depth = 0): string | undefined {
  if (depth > 4) return undefined;
  const m = /^var\(\s*--([a-zA-Z0-9-]+)\s*(?:,\s*([^)]+))?\)$/.exec(value.trim());
  if (!m) {
    // hsl(var(--primary)) — the shadcn v3 form: the variable holds a bare
    // `<h> <s>% <l>%` triple that only becomes a colour inside hsl().
    const inner = /^(hsla?|rgba?|oklch)\(\s*var\(\s*--([a-zA-Z0-9-]+)\s*\)\s*(\/\s*[^)]+)?\)$/.exec(value.trim());
    if (!inner) return value;
    if (inner[3]) return undefined; // an alpha modifier makes it translucent
    const resolved = vars.get(inner[2]);
    if (!resolved) return undefined;
    const triple = substituteVars(resolved, vars, depth + 1);
    return triple === undefined ? undefined : `${inner[1]}(${triple})`;
  }
  const resolved = vars.get(m[1]);
  if (resolved === undefined) return m[2] !== undefined ? substituteVars(m[2], vars, depth + 1) : undefined;
  if (resolved === null) return undefined;
  return substituteVars(resolved, vars, depth + 1);
}

/**
 * Tailwind v4 is configured in CSS: `@theme { --color-brand-500: #… }`.
 * shadcn-style projects go one step further and point every theme colour at
 * a `:root` variable — `@theme inline { --color-primary: var(--primary) }`
 * over `:root { --primary: oklch(…) }`, or in v3 `primary: 'hsl(var(--primary))'`
 * over `:root { --primary: 222 47% 11% }`. Both are followed, using the
 * `:root` (light) values; `.dark` overrides are not modelled. App Router
 * projects keep the file at `src/app/styles/globals.css`, so the walk goes a
 * few directories deep.
 */
export function readCssThemeColors(root: string): Record<string, string> {
  const cached = CSS_THEME_CACHE.get(root);
  if (cached) return cached;
  const themeDeclarations: Array<[string, string]> = [];
  const rootVars = new Map<string, string | null>();
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
        if (depth < CSS_THEME_DEPTH) walk(full, depth + 1);
      } else if (entry.name.endsWith('.css')) {
        let css: string;
        try {
          css = fs.readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (!css.includes('@theme') && !css.includes(':root')) continue;
        for (const block of css.matchAll(THEME_BLOCK)) {
          for (const m of block[1].matchAll(CSS_DECLARATION)) {
            if (m[1].startsWith('color-')) themeDeclarations.push([m[1].slice('color-'.length), m[2].trim()]);
          }
        }
        for (const block of css.matchAll(ROOT_BLOCK)) {
          for (const m of block[1].matchAll(CSS_DECLARATION)) {
            const value = m[2].trim();
            rootVars.set(m[1], rootVars.has(m[1]) && rootVars.get(m[1]) !== value ? null : value);
          }
        }
      }
    }
  };
  walk(root, 0);
  const colors: Record<string, string> = {};
  for (const [name, raw] of themeDeclarations) {
    const value = substituteVars(raw, rootVars);
    if (value !== undefined) colors[name] = value;
  }
  CSS_THEME_CACHE.set(root, colors);
  return colors;
}

/**
 * `:root` variables, for resolving `hsl(var(--primary))` values found in a
 * `tailwind.config.*` theme.
 */
export function readCssRootVars(root: string): Map<string, string | null> {
  const cached = CSS_ROOT_VARS_CACHE.get(root);
  if (cached) return cached;
  const vars = new Map<string, string | null>();
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
        if (depth < CSS_THEME_DEPTH) walk(full, depth + 1);
      } else if (entry.name.endsWith('.css')) {
        let css: string;
        try {
          css = fs.readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (!css.includes(':root')) continue;
        for (const block of css.matchAll(ROOT_BLOCK)) {
          for (const m of block[1].matchAll(CSS_DECLARATION)) {
            const value = m[2].trim();
            vars.set(m[1], vars.has(m[1]) && vars.get(m[1]) !== value ? null : value);
          }
        }
      }
    }
  };
  walk(root, 0);
  CSS_ROOT_VARS_CACHE.set(root, vars);
  return vars;
}

/** Resolve `hsl(var(--x))`-style theme values against the project's `:root` variables. */
export function resolveThemeVars(colors: Record<string, string>, vars: Map<string, string | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, raw] of Object.entries(colors)) {
    if (!raw.includes('var(')) {
      out[name] = raw;
      continue;
    }
    const value = substituteVars(raw, vars);
    if (value !== undefined) out[name] = value;
  }
  return out;
}

const METRO_CONFIG_FILES = ['metro.config.js', 'metro.config.cjs', 'metro.config.mjs', 'metro.config.ts'];

/**
 * The rem base a project's bundler config pins explicitly. NativeWind v4+ and
 * react-native-css take `inlineRem`; Uniwind takes `polyfills: { rem }`. Both
 * flagship NativeWind starters set this, so reading it is the difference
 * between a 14px and a 16px interpretation of every `h-11`.
 */
export function readBundlerRem(root: string): number | undefined {
  if (BUNDLER_REM_CACHE.has(root)) return BUNDLER_REM_CACHE.get(root);
  const rem = findBundlerRem(root);
  BUNDLER_REM_CACHE.set(root, rem);
  return rem;
}

function findBundlerRem(root: string): number | undefined {
  for (const name of METRO_CONFIG_FILES) {
    const file = path.join(root, name);
    if (!fs.existsSync(file)) continue;
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const inline = /\binlineRem\s*:\s*(\d+(?:\.\d+)?)/.exec(text);
    if (inline) return Number(inline[1]);
    const polyfill = /\bpolyfills\s*:\s*\{[\s\S]*?\brem\s*:\s*(\d+(?:\.\d+)?)/.exec(text);
    if (polyfill) return Number(polyfill[1]);
  }
  return undefined;
}

/**
 * Pixels per rem for the installed binding's default configuration, verified
 * against the published packages:
 *
 *   nativewind 2      `rem = 16`      (dist/tailwind/native/index.js)
 *   nativewind 4      `inlineRem = 14` (dist/metro/index.js)
 *   nativewind 5      delegates to react-native-css → 14
 *   react-native-css  `inlineRem ?? 14` (compiler/declarations.js)
 *   uniwind           `polyfills?.rem ?? 16` (bundler/css-processor)
 *   twrnc, tailwind-rn, web Tailwind    16
 */
function defaultRem(deps: Record<string, string>): number {
  const nativewind = majorVersion(deps['nativewind']);
  if (nativewind !== undefined) return nativewind >= 4 ? 14 : DEFAULT_TAILWIND_OPTIONS.rem;
  if ('react-native-css' in deps || 'react-native-css-interop' in deps) return 14;
  return DEFAULT_TAILWIND_OPTIONS.rem;
}

/** Which default palette the installed binding ships. */
function defaultPreset(deps: Record<string, string>): TailwindPreset {
  const tailwind = majorVersion(deps['tailwindcss']);
  if (tailwind !== undefined) return tailwind >= 4 ? 'v4' : 'v3';
  const nativewind = majorVersion(deps['nativewind']);
  if (nativewind !== undefined) return nativewind >= 5 ? 'v4' : 'v3';
  if ('uniwind' in deps || 'react-native-css' in deps) return 'v4';
  if ('twrnc' in deps || 'tailwind-rn' in deps || 'tailwind-react-native-classnames' in deps) return 'v3';
  return DEFAULT_TAILWIND_OPTIONS.preset;
}

function detectTailwind(
  deps: Record<string, string>,
  config: TailwindConfig | undefined,
  dirs: string[],
): TailwindOptions | undefined {
  const installed = TAILWIND_BINDINGS.some((name) => name in deps);
  if (!installed && !config) return undefined;

  let bundlerRem: number | undefined;
  const colors: Record<string, string> = {};
  const unresolved = new Set<string>();
  let replacesPalette = false;
  // Outermost first so the nearest package's theme wins on a key collision.
  for (const dir of [...dirs].reverse()) {
    const theme = readTailwindTheme(dir);
    Object.assign(colors, resolveThemeVars(theme.colors, readCssRootVars(dir)), readCssThemeColors(dir));
    for (const key of theme.unresolved) unresolved.add(key);
    replacesPalette = replacesPalette || theme.replacesPalette;
    bundlerRem = readBundlerRem(dir) ?? bundlerRem;
  }
  Object.assign(colors, config?.colors);
  for (const key of Object.keys(config?.colors ?? {})) unresolved.delete(key);

  return {
    preset: config?.preset ?? defaultPreset(deps),
    rem: config?.rem ?? bundlerRem ?? defaultRem(deps),
    ...(Object.keys(colors).length > 0 ? { colors } : {}),
    ...(unresolved.size > 0 ? { unresolvedColors: [...unresolved] } : {}),
    ...(replacesPalette ? { replacesPalette: true } : {}),
  };
}

/**
 * Read project facts once per scan; cheap enough to call per editor lint.
 * `root` may be a directory or a single file — in both cases the facts come
 * from the nearest owning package.json and its monorepo root, so scanning a
 * workspace package or one file gets the same answer as scanning the app.
 */
export function readProjectInfo(root: string, config: A11yConfig = {}): ProjectInfo {
  const chain = manifestChain(root);
  const dependencies = readDependenciesFor(chain);
  const dirs = chain.length > 0 ? chain.map((m) => m.dir) : [root];
  const tailwind = config.tailwind === false ? undefined : detectTailwind(dependencies, config.tailwind, dirs);
  return {
    dependencies,
    platform: isNative(dependencies) ? 'native' : 'web',
    ...(tailwind ? { tailwind } : {}),
    ...(chain.length > 0 ? { packageDir: chain[0].dir } : {}),
  };
}

/**
 * Per-file project facts, cached by directory. A monorepo scanned from its
 * root has web and native packages side by side; resolving each file against
 * its own package.json is what stops `apps/mobile` from being analysed with
 * the root's (empty) dependency list.
 */
export class ProjectResolver {
  readonly #config: A11yConfig;
  readonly #cache = new Map<string, ProjectInfo>();

  /** Facts for the scan root itself; used for banners and platform choice. */
  readonly root: ProjectInfo;

  /** Owning-package directory per source directory, so the walk runs once each. */
  readonly #byDirectory = new Map<string, string>();

  /** How many files each package owns, so the banner describes the bulk of the scan. */
  readonly #hits = new Map<string, number>();

  constructor(root: string, config: A11yConfig = {}) {
    clearProjectCaches();
    this.#config = config;
    this.root = readProjectInfo(root, config);
    const resolved = path.resolve(root);
    this.#byDirectory.set(resolved, this.root.packageDir ?? resolved);
    this.#cache.set(this.root.packageDir ?? resolved, this.root);
  }

  /** Facts governing `file` (an absolute path to a source file or directory). */
  for(file: string): ProjectInfo {
    const dir = path.dirname(path.resolve(file));
    const known = this.#byDirectory.get(dir);
    if (known !== undefined) {
      this.#hits.set(known, (this.#hits.get(known) ?? 0) + 1);
      return this.#cache.get(known)!;
    }
    // Files in sibling directories almost always share one package.json, so
    // the info is keyed by the package it came from and reused across them.
    const chain = manifestChain(dir);
    const key = chain[0]?.dir ?? dir;
    this.#byDirectory.set(dir, key);
    this.#hits.set(key, (this.#hits.get(key) ?? 0) + 1);
    const cached = this.#cache.get(key);
    if (cached) return cached;
    const info = readProjectInfo(dir, this.#config);
    this.#cache.set(key, info);
    return info;
  }

  /**
   * The facts a report should describe. In a monorepo the root manifest often
   * declares no Tailwind binding while the packages under it do, and a banner
   * reading "tailwind: off" would misdescribe the scan that just ran.
   */
  banner(): ProjectInfo {
    if (this.root.tailwind) return this.root;
    let best: ProjectInfo | undefined;
    let bestHits = -1;
    for (const [key, info] of this.#cache) {
      const hits = this.#hits.get(key) ?? 0;
      if (info.tailwind && hits > bestHits) {
        best = info;
        bestHits = hits;
      }
    }
    return best ?? this.root;
  }
}

/** Expand a `workspaces` glob (`apps/*`) to the directories it names. */
function expandWorkspace(root: string, pattern: string): string[] {
  const segments = pattern.split('/').filter((s) => s.length > 0 && s !== '.');
  let dirs = [root];
  for (const segment of segments) {
    if (segment === '**') return dirs; // too broad to enumerate cheaply
    const next: string[] = [];
    for (const dir of dirs) {
      if (segment === '*') {
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) next.push(path.join(dir, entry.name));
          }
        } catch {
          // unreadable directory — nothing to expand
        }
      } else {
        next.push(path.join(dir, segment));
      }
    }
    dirs = next;
    if (dirs.length > 64) return dirs.slice(0, 64);
  }
  return dirs;
}

/**
 * pnpm declares its workspace in `pnpm-workspace.yaml`, not in package.json:
 *
 *     packages:
 *       - "apps/*"
 *       - "packages/*"
 *
 * Reading the `packages:` list is enough; pulling in a YAML parser to learn
 * two globs is not worth the dependency.
 */
function pnpmWorkspacePatterns(dir: string): string[] {
  let text: string;
  try {
    text = fs.readFileSync(path.join(dir, 'pnpm-workspace.yaml'), 'utf8');
  } catch {
    return [];
  }
  const patterns: string[] = [];
  let inPackages = false;
  for (const line of text.split('\n')) {
    if (/^packages\s*:/.test(line)) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    const item = /^\s+-\s*['"]?([^'"#]+?)['"]?\s*$/.exec(line);
    if (item) {
      if (!item[1].startsWith('!')) patterns.push(item[1]);
      continue;
    }
    if (line.trim() !== '' && !line.startsWith(' ')) break; // next top-level key
  }
  return patterns;
}

/** Workspace member directories declared by a manifest, if it is a monorepo root. */
function workspaceDirs(manifest: Manifest): string[] {
  const raw = manifest.pkg.workspaces;
  const patterns = [
    ...(Array.isArray(raw)
      ? raw
      : raw && typeof raw === 'object' && Array.isArray((raw as { packages?: unknown }).packages)
        ? (raw as { packages: string[] }).packages
        : []),
    ...pnpmWorkspacePatterns(manifest.dir),
  ];
  const dirs: string[] = [];
  for (const pattern of patterns) {
    if (typeof pattern !== 'string') continue;
    for (const dir of expandWorkspace(manifest.dir, pattern)) {
      if (fs.existsSync(path.join(dir, 'package.json'))) dirs.push(dir);
    }
  }
  return dirs;
}

export interface PlatformDetection {
  platform: Platform;
  /** True when workspace members disagree, so one rule pack cannot serve them all. */
  mixed: boolean;
  /** Where the answer came from, for the run banner. */
  source: string;
}

function isNative(deps: Record<string, string>): boolean {
  return Boolean(deps['react-native'] || deps['expo'] || deps['react-native-web']);
}

/**
 * Detect web vs native. Looks at the owning package.json chain first (so a
 * subdirectory or single file resolves like its package does), then at
 * workspace members, so a monorepo root does not silently analyse a React
 * Native app with the web rule pack.
 */
export function detectPlatformDetailed(root: string): PlatformDetection {
  const chain = manifestChain(root);
  for (const manifest of chain) {
    if (isNative(depsOf(manifest.pkg))) {
      return { platform: 'native', mixed: false, source: path.join(manifest.dir, 'package.json') };
    }
  }
  const workspaceRoot = chain.find((m) => workspaceDirs(m).length > 0);
  if (workspaceRoot) {
    const members = workspaceDirs(workspaceRoot);
    const native: string[] = [];
    const web: string[] = [];
    for (const dir of members) {
      const manifest = readManifest(dir);
      if (!manifest) continue;
      const deps = depsOf(manifest.pkg);
      if (isNative(deps)) native.push(dir);
      else if (deps['react'] || deps['next']) web.push(dir);
    }
    if (native.length > 0 && web.length === 0) {
      return { platform: 'native', mixed: false, source: `${native.length} workspace package(s)` };
    }
    if (native.length > 0 && web.length > 0) {
      return { platform: 'web', mixed: true, source: `${native.length} native + ${web.length} web workspace packages` };
    }
  }
  return { platform: 'web', mixed: false, source: chain[0] ? path.join(chain[0].dir, 'package.json') : 'default' };
}

/** Detect web vs native from package.json dependencies. */
export function detectPlatform(root: string): Platform {
  return detectPlatformDetailed(root).platform;
}
