import fs from 'node:fs';
import path from 'node:path';
import { analyzeModel } from './engine.js';
import { buildFileModel } from './element.js';
import { parseSource } from './parse.js';
import { globToRegExp } from './config.js';
import { readProjectInfo, type ProjectInfo } from './project.js';
import type { A11yConfig, Diagnostic, Platform, ProjectPass, Rule, ScanResult } from './types.js';

const SCAN_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage',
  '.next', '.expo', '.turbo', '.cache', 'android', 'ios', 'vendor',
]);

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
  /** Project facts; read from `root` and `config` when omitted. */
  project?: ProjectInfo;
}

/** Detect web vs native from package.json dependencies. */
export function detectPlatform(root: string): Platform {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    if (deps['react-native'] || deps['expo']) return 'native';
  } catch {
    // no package.json — default to web
  }
  return 'web';
}

export function collectFiles(root: string, ignore: string[] = []): string[] {
  const ignoreRes = ignore.map(globToRegExp);
  const files: string[] = [];

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
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile()) {
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

export function scanProject(options: ScanOptions): ScanResult {
  const { root, rules, platform, config = {}, projectPasses = [] } = options;
  const project = options.project ?? readProjectInfo(root, config);
  const started = performance.now();
  const files = options.files
    ? options.files
        .map((f) => (path.isAbsolute(f) ? f : path.resolve(root, f)))
        .filter((f) => SCAN_EXTENSIONS.has(path.extname(f)) && !f.endsWith('.d.ts') && fs.existsSync(f))
        .sort()
    : collectFiles(root, config.ignore ?? []);
  const diagnostics: Diagnostic[] = [];

  for (const file of files) {
    let code: string;
    try {
      if (fs.statSync(file).size > MAX_FILE_SIZE) continue;
      code = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    // Fast pre-filter: skip files with neither JSX nor React Native code
    // (source-level rules look at animation calls in plain modules).
    if (!code.includes('<') && !code.includes('react-native')) continue;
    const filename = path.relative(root, file).split(path.sep).join('/') || path.basename(file);
    const model = buildFileModel(parseSource(code, filename));
    diagnostics.push(...analyzeModel(model, { filename, platform, rules, ruleSettings: config.rules, project }));
    for (const pass of projectPasses) pass.collect(model, filename);
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
    filesScanned: files.length,
    durationMs: Math.round(performance.now() - started),
    platform,
    root,
  };
}
