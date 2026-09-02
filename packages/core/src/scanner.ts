import fs from 'node:fs';
import path from 'node:path';
import { analyzeModel } from './engine.js';
import { buildFileModel } from './element.js';
import { parseSource } from './parse.js';
import { globToRegExp } from './config.js';
import { ProjectResolver, detectPlatform, detectPlatformDetailed, type ProjectInfo } from './project.js';
import type { A11yConfig, Diagnostic, Platform, ProjectPass, Rule, ScanResult, SkippedFile } from './types.js';

export { detectPlatform, detectPlatformDetailed };

const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

/** Build output and dependencies — never source, at any depth. */
const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.expo', '.turbo', '.cache',
]);

/**
 * Native project directories. Skipped only at the top of a package, because
 * `src/components/ios/` is application source and skipping it by basename
 * dropped it from the scan with no way to say otherwise.
 */
const IGNORED_ROOT_DIRS = new Set(['android', 'ios', 'vendor']);

const MAX_FILE_SIZE = 1.5 * 1024 * 1024;

export interface ScanOptions {
  root: string;
  rules: Rule[];
  platform: Platform;
  config?: A11yConfig;
  /** Cross-file analyses run alongside the per-file rules. */
  projectPasses?: ProjectPass[];
  /** Restrict the scan to these files (e.g. --changed); still extension-filtered. */
  files?: string[];
  /** Project facts; resolved per file from `root` and `config` when omitted. */
  project?: ProjectInfo;
  /**
   * Both rule packs. When provided, each file is analysed with the pack its
   * own package needs, so a monorepo holding a React Native app beside a web
   * app is not forced through one of them. Without it every file uses `rules`.
   */
  rulePacks?: Record<Platform, Rule[]>;
}

/**
 * React Native resolves `Button.web.tsx` only on web and `Button.ios.tsx` only
 * on iOS. Running the native pack over a `.web.tsx` file reports web-valid
 * markup (`role="dialog"`) as a React Native mistake, and vice versa.
 */
const PLATFORM_SUFFIX = /\.(web|native|ios|android|windows|macos)\.[cm]?[jt]sx?$/;

export function filePlatform(file: string): Platform | undefined {
  const suffix = PLATFORM_SUFFIX.exec(file)?.[1];
  if (suffix === undefined) return undefined;
  return suffix === 'web' ? 'web' : 'native';
}

export function collectFiles(root: string, ignore: string[] = []): string[] {
  const ignoreRes = ignore.map(globToRegExp);
  const files: string[] = [];
  const resolvedRoot = realpathOr(root);
  // Real paths already walked, so a symlink cycle or two links to one
  // directory cannot loop or double-count.
  const visited = new Set<string>([resolvedRoot]);

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (ignoreRes.some((re) => re.test(rel))) continue;
      let isDirectory = entry.isDirectory();
      let isFile = entry.isFile();
      if (entry.isSymbolicLink()) {
        // Follow a link only when it stays inside the project: a workspace
        // package linked into place is source, `node_modules/foo -> ../..`
        // and links out of the tree are not.
        const target = realpathOr(full);
        if (!target.startsWith(resolvedRoot + path.sep)) continue;
        try {
          const stat = fs.statSync(full);
          isDirectory = stat.isDirectory();
          isFile = stat.isFile();
        } catch {
          continue;
        }
      }
      if (isDirectory) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        if (IGNORED_ROOT_DIRS.has(entry.name) && dir === root) continue;
        // Every directory is walked once by real path, whichever name reached it
        // first — a link and its target are the same directory.
        const real = realpathOr(full);
        if (visited.has(real)) continue;
        visited.add(real);
        walk(full);
      } else if (isFile) {
        const ext = path.extname(entry.name);
        if (!SCAN_EXTENSIONS.has(ext)) continue;
        if (entry.name.endsWith('.d.ts')) continue;
        files.push(full);
      }
    }
  }

  const stat = fs.statSync(root);
  if (stat.isFile()) return [root];
  walk(root);
  return files.sort();
}

function realpathOr(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

export function scanProject(options: ScanOptions): ScanResult {
  const { root, rules, platform, config = {}, projectPasses = [] } = options;
  // A monorepo has web and native packages side by side, so project facts are
  // resolved per file against its own package.json rather than once from the
  // scan root — otherwise `apps/mobile` is analysed with the root's (empty)
  // dependency list and Tailwind resolution silently switches off.
  const resolver = options.project ? undefined : new ProjectResolver(root, config);
  const rootProject = options.project ?? resolver!.root;
  const started = performance.now();
  const files = options.files
    ? options.files
        .map((f) => (path.isAbsolute(f) ? f : path.resolve(root, f)))
        .filter((f) => SCAN_EXTENSIONS.has(path.extname(f)) && !f.endsWith('.d.ts') && fs.existsSync(f))
        .sort()
    : collectFiles(root, config.ignore ?? []);
  const diagnostics: Diagnostic[] = [];
  const skipped: SkippedFile[] = [];
  const rulePacks = options.rulePacks;
  const filesByPlatform: Record<Platform, number> = { web: 0, native: 0 };

  for (const file of files) {
    const filename = path.relative(root, file).split(path.sep).join('/') || path.basename(file);
    const target = filePlatform(file);
    // Without both packs on hand there is nothing to do with a file written
    // for the other platform except leave it alone and say so.
    if (!rulePacks && target !== undefined && target !== platform) {
      skipped.push({ file: filename, reason: `${target}-only file, scanning as ${platform}` });
      continue;
    }
    let code: string;
    try {
      if (fs.statSync(file).size > MAX_FILE_SIZE) {
        skipped.push({ file: filename, reason: `larger than ${Math.round(MAX_FILE_SIZE / 1024)}KB` });
        continue;
      }
      code = fs.readFileSync(file, 'utf8');
    } catch (error) {
      skipped.push({ file: filename, reason: `unreadable (${errorText(error)})` });
      continue;
    }
    const project = resolver ? resolver.for(file) : rootProject;
    // `Button.web.tsx` is web whatever package it sits in; otherwise the
    // owning package decides.
    const filePack = rulePacks ? target ?? project.platform : platform;
    filesByPlatform[filePack]++;
    // Fast pre-filter: skip files with neither JSX nor React Native code
    // (source-level rules look at animation calls in plain modules).
    if (!code.includes('<') && !code.includes('react-native')) continue;
    // One malformed file must not lose the whole report — record it and move on.
    try {
      const model = buildFileModel(parseSource(code, filename));
      diagnostics.push(...analyzeModel(model, {
        filename,
        platform: filePack,
        rules: rulePacks ? rulePacks[filePack] : rules,
        ruleSettings: config.rules,
        project,
      }));
      if (filePack === 'web') for (const pass of projectPasses) pass.collect(model, filename);
    } catch (error) {
      skipped.push({ file: filename, reason: `analysis failed (${errorText(error)})` });
    }
  }

  for (const pass of projectPasses) diagnostics.push(...pass.finalize());

  for (const rule of rules) {
    if (!rule.projectCheck || !rule.meta.platforms.includes(platform)) continue;
    const setting = config.rules?.[rule.meta.id];
    if (setting === 'off') continue;
    for (const diag of rule.projectCheck(root)) {
      diagnostics.push(setting ? { ...diag, severity: setting } : diag);
    }
  }

  diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);

  return {
    diagnostics,
    filesScanned: files.length - skipped.length,
    durationMs: Math.round(performance.now() - started),
    platform,
    root,
    project: resolver ? resolver.banner() : rootProject,
    ...(rulePacks && filesByPlatform.web > 0 && filesByPlatform.native > 0 ? { filesByPlatform } : {}),
    ...(skipped.length > 0 ? { skipped } : {}),
  };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
