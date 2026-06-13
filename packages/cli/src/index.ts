#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import {
  SEVERITY_ORDER,
  detectPlatform,
  loadConfig,
  readPackageMeta,
  scanProject,
  toJson,
  toSarif,
  type Platform,
  type Rule,
  type Severity,
} from '@react-a11y/core';
import { webRules } from '@react-a11y/rules-web';
import { nativeRules } from '@react-a11y/rules-native';
import { printPretty } from './pretty.js';

const PKG = readPackageMeta(new URL('../package.json', import.meta.url));
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
  --list-rules                   Print every rule with severity and WCAG mapping
  --version                      Print version
  --help                         Show this help

${pc.bold('Config')}
  react-a11y.config.json / .react-a11yrc.json / package.json "react-a11y" key:
  { "platform": "web", "ignore": ["**/*.stories.tsx"], "rules": { "no-autofocus": "off" } }
`;

interface CliArgs {
  root: string;
  platform: Platform | 'auto';
  format: 'pretty' | 'json' | 'sarif';
  output?: string;
  failOn: Severity | 'none';
  listRules: boolean;
}

function fail(msg: string): never {
  console.error(pc.red(`error: ${msg}`));
  process.exit(2);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { root: process.cwd(), platform: 'auto', format: 'pretty', failOn: 'serious', listRules: false };
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
      console.log(
        `  ${pc.cyan(r.meta.id.padEnd(34))} ${r.meta.severity.padEnd(9)} WCAG ${r.meta.wcag.join(', ').padEnd(16)} ${pc.dim(r.meta.description)}`,
      );
    }
  };
  print(`Web rules (${webRules.length})`, webRules);
  print(`React Native rules (${nativeRules.length})`, nativeRules);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.listRules) {
    listRules();
    return;
  }
  if (!fs.existsSync(args.root)) fail(`path does not exist: ${args.root}`);

  const config = loadConfig(args.root);
  const platform: Platform =
    args.platform !== 'auto' ? args.platform : config.platform ?? detectPlatform(args.root);
  const rules = platform === 'native' ? nativeRules : webRules;

  const result = scanProject({ root: args.root, rules, platform, config });

  let report: string | null = null;
  if (args.format === 'json') report = toJson(result);
  else if (args.format === 'sarif') {
    report = toSarif(result, rules, { name: PKG.name, version: PKG.version, informationUri: PKG.homepage });
  }

  if (report !== null) {
    if (args.output) {
      fs.writeFileSync(args.output, report);
      console.error(`report written to ${args.output}`);
    } else {
      console.log(report);
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
