#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  MANUAL_CHECKS,
  SEVERITY_ORDER,
  WCAG,
  WCAG22_A_AA,
  WCAG22_TOTALS,
  analyze,
  applyFixes,
  detectPlatform,
  globToRegExp,
  loadConfig,
  readOwnPackageMeta,
  readProjectInfo,
  scanProject,
  toJson,
  toSarif,
  type Fix,
  type Platform,
  type Rule,
  type ScanResult,
  type Severity,
  type WcagLevel,
} from '@aishware/react-a11y-core';
import { webProjectPasses, webRules, JSX_A11Y_COVERED_WCAG } from '@aishware/react-a11y-rules-web';
import { nativeRules } from '@aishware/react-a11y-rules-native';
import { printPretty, sanitizeTerminalText } from './pretty.js';

const PKG = readOwnPackageMeta(import.meta.url);
const VERSION = PKG.version ?? '0.0.0';

const HELP = `
${pc.bold('react-a11y')} — accessibility scanner for React, Next.js and React Native

${pc.bold('Usage')}
  react-a11y [path] [options]

${pc.bold('Options')}
  --platform <web|native|auto>   Rule pack to run (default: auto-detect from package.json)
  --format <pretty|json|sarif>   Output format (default: pretty)
  --output <file>                Write report to a file instead of stdout
  --fail-on <severity|none>      Exit 1 when issues at/above this severity exist (default: serious)
  --fix                          Apply safe mechanical fixes, then report what remains
  --changed                      Scan only files changed in git (vs HEAD, incl. untracked)
  --stdin                        Lint source read from stdin as one file (config from [path])
  --stdin-filename <file>        Filename to attribute stdin content to (for ignore matching)
  --list-rules                   Print every rule with severity and WCAG mapping (🔧 = fixable)
  --coverage                     Show which WCAG 2.2 success criteria the rules cover
  --version                      Print version
  --help                         Show this help

${pc.bold('Web a11y')}
  The web pack runs only what eslint-plugin-jsx-a11y does NOT cover (WCAG 2.2
  criteria, structure, focus visibility, project-wide checks). Run jsx-a11y in
  your ESLint config for standard web a11y; react-a11y covers the gaps and the
  React Native + conformance story.

${pc.bold('Config')}
  react-a11y.config.json / .react-a11yrc.json / package.json "react-a11y" key:
  { "platform": "web", "ignore": ["**/*.stories.tsx"], "rules": { "no-autofocus": "off" } }

${pc.bold('Tailwind / NativeWind / Uniwind')}
  className utilities (h-6 w-6, text-gray-400 bg-white, dark:…) are resolved for
  touch-target, contrast, text-height and focus-ring rules when a Tailwind binding
  is a dependency. Tune with the "tailwind" config key:
  { "tailwind": { "rem": 14, "preset": "v3", "colors": { "brand": "#0055ff" } } }
`;

interface CliArgs {
  root: string;
  platform: Platform | 'auto';
  format: 'pretty' | 'json' | 'sarif';
  output?: string;
  failOn: Severity | 'none';
  listRules: boolean;
  coverage: boolean;
  fix: boolean;
  changed: boolean;
  stdin: boolean;
  stdinFilename?: string;
}

function fail(msg: string): never {
  console.error(pc.red(`error: ${sanitizeTerminalText(msg)}`));
  process.exit(2);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    root: process.cwd(), platform: 'auto', format: 'pretty', failOn: 'serious',
    listRules: false, coverage: false, fix: false, changed: false, stdin: false,
  };
  const paths: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i] ?? fail(`${arg} requires a value`);
    switch (arg) {
      case '--help': case '-h':
        console.log(HELP);
        process.exit(0);
      // eslint-disable-next-line no-fallthrough
      case '--version': case '-v':
        console.log(VERSION);
        process.exit(0);
      case '--platform': {
        const v = next();
        if (v !== 'web' && v !== 'native' && v !== 'auto') fail(`invalid platform "${v}"`);
        args.platform = v;
        break;
      }
      case '--format': {
        const v = next();
        if (v !== 'pretty' && v !== 'json' && v !== 'sarif') fail(`invalid format "${v}"`);
        args.format = v;
        break;
      }
      case '--output': case '-o':
        args.output = next();
        break;
      case '--fail-on': {
        const v = next();
        if (v !== 'none' && !(v in SEVERITY_ORDER)) fail(`invalid severity "${v}"`);
        args.failOn = v as Severity | 'none';
        break;
      }
      case '--list-rules':
        args.listRules = true;
        break;
      case '--coverage':
        args.coverage = true;
        break;
      case '--fix':
        args.fix = true;
        break;
      case '--changed':
        args.changed = true;
        break;
      case '--stdin':
        args.stdin = true;
        break;
      case '--stdin-filename':
        args.stdinFilename = next();
        break;
      default:
        if (arg.startsWith('-')) fail(`unknown option "${arg}" (try --help)`);
        paths.push(arg);
    }
  }
  if (paths.length > 0) args.root = path.resolve(paths[0]);
  return args;
}

function listRules(): void {
  const print = (title: string, rules: Rule[]) => {
    console.log(pc.bold(`\n${title}`));
    for (const r of rules) {
      const fixable = r.meta.fixable ? '🔧' : '  ';
      console.log(
        `  ${fixable} ${pc.cyan(r.meta.id.padEnd(34))} ${r.meta.severity.padEnd(9)} WCAG ${r.meta.wcag.join(', ').padEnd(16)} ${pc.dim(r.meta.description)}`,
      );
    }
  };
  print(`Web rules — complement eslint-plugin-jsx-a11y (${webRules.length})`, webRules);
  print(`React Native rules (${nativeRules.length})`, nativeRules);
}

/** Files changed vs HEAD (staged, unstaged and untracked), for --changed. */
function changedFiles(root: string): string[] {
  let out: string;
  try {
    out = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' });
  } catch {
    fail('--changed requires a git repository (git status failed)');
  }
  const files: string[] = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    if (status.includes('D')) continue; // deleted files have nothing to scan
    let file = line.slice(3);
    const renameArrow = file.indexOf(' -> ');
    if (renameArrow !== -1) file = file.slice(renameArrow + 4);
    files.push(file.replace(/^"|"$/g, ''));
  }
  return files;
}

/**
 * Editor integration: lint one buffer piped through stdin instead of walking
 * the project. Config, ignore globs and platform still come from `root`, so
 * results match what a project scan would report for that file.
 */
function scanStdin(args: CliArgs, rules: Rule[], platform: Platform): ScanResult {
  const config = loadConfig(args.root);
  const started = Date.now();
  const filename = args.stdinFilename ?? 'stdin.tsx';
  const rel = (path.isAbsolute(filename) ? path.relative(args.root, filename) : filename)
    .split(path.sep)
    .join('/');
  const ignored = (config.ignore ?? []).some((glob) => globToRegExp(glob).test(rel));
  const code = fs.readFileSync(0, 'utf8');
  const diagnostics = ignored
    ? []
    : analyze({
        code,
        filename: rel,
        platform,
        rules,
        ruleSettings: config.rules,
        project: readProjectInfo(args.root, config),
      });
  return { diagnostics, filesScanned: 1, durationMs: Date.now() - started, platform, root: args.root };
}

/** Apply autofixes to disk; returns counts. Fixes come back from a scan. */
function applyFixesToDisk(result: ScanResult): { fixed: number; files: number } {
  const byFile = new Map<string, Fix[]>();
  for (const d of result.diagnostics) {
    if (!d.fix) continue;
    const list = byFile.get(d.file) ?? [];
    list.push(d.fix);
    byFile.set(d.file, list);
  }
  let fixed = 0;
  for (const [file, fixes] of byFile) {
    const full = path.join(result.root, file);
    const source = fs.readFileSync(full, 'utf8');
    const { output, applied } = applyFixes(source, fixes);
    if (applied > 0) {
      fs.writeFileSync(full, output);
      fixed += applied;
    }
  }
  return { fixed, files: byFile.size };
}

function printCoverage(): void {
  const covered = new Map<string, { web: number; native: number; full: boolean }>();
  const count = (rules: Rule[], platform: 'web' | 'native') => {
    for (const rule of rules) {
      for (const sc of rule.meta.wcag) {
        const entry = covered.get(sc) ?? { web: 0, native: 0, full: false };
        entry[platform]++;
        if (!rule.meta.partial) entry.full = true;
        covered.set(sc, entry);
      }
    }
  };
  count(webRules, 'web');
  count(nativeRules, 'native');

  const refs = [...covered.keys()].map((sc) => WCAG[sc]).sort((a, b) =>
    a.sc.localeCompare(b.sc, undefined, { numeric: true }),
  );

  console.log(pc.bold(`\nAutomated by react-a11y: WCAG 2.2 criteria with at least one rule (${webRules.length} web + ${nativeRules.length} native rules)\n`));
  for (const ref of refs) {
    const entry = covered.get(ref.sc)!;
    const packs = [entry.web ? `${entry.web} web` : null, entry.native ? `${entry.native} native` : null]
      .filter(Boolean)
      .join(', ');
    const partialBadge = entry.full ? '' : pc.yellow(' ~partial');
    const newBadge = ref.version === '2.2' ? pc.cyan(' [new in 2.2]') : '';
    console.log(`  ${ref.sc.padEnd(7)} ${ref.name.padEnd(46)} ${ref.level.padEnd(4)} ${pc.dim(packs)}${partialBadge}${newBadge}`);
  }

  // Criteria deferred to eslint-plugin-jsx-a11y (run it alongside react-a11y).
  const deferred = JSX_A11Y_COVERED_WCAG.filter((sc) => !covered.has(sc) && WCAG22_A_AA.includes(sc));
  console.log(pc.bold('\nCovered by eslint-plugin-jsx-a11y: run it in your ESLint config\n'));
  for (const sc of deferred.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const ref = WCAG[sc];
    console.log(`  ${ref.sc.padEnd(7)} ${ref.name.padEnd(46)} ${ref.level}`);
  }

  const handled = new Set([...covered.keys(), ...deferred]);
  const manual = WCAG22_A_AA.filter((sc) => !handled.has(sc));
  console.log(pc.bold('\nManual: A+AA criteria static analysis cannot decide — guided checklist\n'));
  for (const sc of manual) {
    const ref = WCAG[sc];
    console.log(`  ${ref.sc.padEnd(7)} ${ref.name.padEnd(46)} ${ref.level}`);
    console.log(pc.dim(`          ${MANUAL_CHECKS[sc] ?? 'Verify manually.'}`));
  }

  const byLevel: Record<WcagLevel, number> = { A: 0, AA: 0, AAA: 0 };
  for (const ref of refs) byLevel[ref.level]++;
  const pct = (n: number, total: number) => `${Math.round((n / total) * 100)}%`;
  const aPlusAa = byLevel.A + byLevel.AA;
  const aPlusAaTotal = WCAG22_TOTALS.A + WCAG22_TOTALS.AA;
  const withJsx = WCAG22_A_AA.filter((sc) => handled.has(sc)).length;

  console.log(pc.bold('\nCoverage (Level A + AA)'));
  console.log(`  Automated by react-a11y     ${aPlusAa}/${aPlusAaTotal}  (${pct(aPlusAa, aPlusAaTotal)})`);
  console.log(`  + eslint-plugin-jsx-a11y    ${withJsx}/${aPlusAaTotal}  (${pct(withJsx, aPlusAaTotal)})  ← when run alongside`);
  console.log(pc.yellow(`  Manual review needed        ${manual.length}/${aPlusAaTotal}         ← no static tool can decide these`));
  console.log(pc.dim(
    '\n  react-a11y covers the WCAG 2.2 / structure / RN / project-wide criteria;\n' +
    '  eslint-plugin-jsx-a11y covers standard web a11y. The remaining criteria\n' +
    '  are not automatable — each has a guided manual check listed above, but a\n' +
    `  human must verify it. Run both linters and work the ${manual.length} manual items.`,
  ));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.listRules) {
    listRules();
    return;
  }
  if (args.coverage) {
    printCoverage();
    return;
  }
  if (!fs.existsSync(args.root)) fail(`path does not exist: ${args.root}`);

  const config = loadConfig(args.root);
  const platform: Platform =
    args.platform !== 'auto' ? args.platform : config.platform ?? detectPlatform(args.root);
  const rules = platform === 'native' ? nativeRules : webRules;

  if (args.stdin) {
    if (args.fix || args.changed) fail('--stdin cannot be combined with --fix or --changed');
    report(scanStdin(args, rules, platform), args, rules);
    return;
  }

  const files = args.changed ? changedFiles(args.root) : undefined;
  // Cross-file passes need the whole project; skip them on partial scans.
  // Passes are stateful, so each scan gets fresh instances.
  const makePasses = () =>
    platform === 'web' && !args.changed ? webProjectPasses(config) : [];

  const scan = () => scanProject({ root: args.root, rules, platform, config, projectPasses: makePasses(), files });
  let result = scan();

  if (args.fix) {
    const { fixed, files: fixedFiles } = applyFixesToDisk(result);
    if (fixed > 0) {
      console.error(pc.green(`✔ fixed ${fixed} issue${fixed === 1 ? '' : 's'} in ${fixedFiles} file${fixedFiles === 1 ? '' : 's'}`));
      result = scan(); // report what remains after the rewrite
    } else {
      console.error(pc.dim('no autofixable issues found'));
    }
  }

  report(result, args, rules);
}

function report(result: ScanResult, args: CliArgs, rules: Rule[]): void {
  let rendered: string | null = null;
  if (args.format === 'json') rendered = toJson(result);
  else if (args.format === 'sarif') {
    rendered = toSarif(result, rules, { name: PKG.name, version: PKG.version, informationUri: PKG.homepage });
  }

  if (rendered !== null) {
    if (args.output) {
      fs.writeFileSync(args.output, rendered);
      console.error(`report written to ${sanitizeTerminalText(args.output)}`);
    } else {
      console.log(rendered);
    }
  } else {
    printPretty(result, VERSION);
  }

  if (args.failOn !== 'none') {
    const threshold = SEVERITY_ORDER[args.failOn];
    if (result.diagnostics.some((d) => SEVERITY_ORDER[d.severity] >= threshold)) {
      process.exit(1);
    }
  }
}

main();
