#!/usr/bin/env node
/**
 * Precision regression suite. Scans open-source apps pinned at fixed commits
 * (field-test/corpus.json) with the built CLI and compares every finding with
 * a committed snapshot (field-test/snapshots/<name>.txt). A rule change that
 * adds or removes findings on real code shows up as a snapshot diff a
 * reviewer can read line by line.
 *
 *   npm run build && npm run field-test            # compare
 *   npm run field-test -- --update                 # rewrite snapshots
 *   npm run field-test -- social-app --cache /tmp/clones
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpus = JSON.parse(fs.readFileSync(path.join(repoRoot, 'field-test/corpus.json'), 'utf8'));
const snapshotDir = path.join(repoRoot, 'field-test/snapshots');
const cli = path.join(repoRoot, 'packages/cli/dist/index.js');

const argv = process.argv.slice(2);
const update = argv.includes('--update');
const cacheIndex = argv.indexOf('--cache');
const cacheDir = path.resolve(cacheIndex >= 0 ? argv[cacheIndex + 1] : path.join(repoRoot, '.field-test-cache'));
const only = argv.filter((a, i) => !a.startsWith('--') && i !== cacheIndex + 1);

if (!fs.existsSync(cli)) {
  console.error('packages/cli/dist is missing; run `npm run build` first.');
  process.exit(2);
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A shallow checkout of exactly `entry.commit`, reused when already present. */
function checkout(entry) {
  const dir = path.join(cacheDir, entry.name);
  try {
    if (git(dir, 'rev-parse', 'HEAD') === entry.commit) return dir;
  } catch {
    // not a checkout yet
  }
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q');
  git(dir, 'remote', 'add', 'origin', entry.repo);
  git(dir, 'fetch', '-q', '--depth', '1', '--filter=blob:limit=2m', 'origin', entry.commit);
  git(dir, 'checkout', '-q', 'FETCH_HEAD');
  return dir;
}

/** One sorted line per finding, plus a header of what the run decided. */
function snapshot(entry, dir) {
  const out = execFileSync('node', [cli, dir, '--format', 'json', '--fail-on', 'none'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const report = JSON.parse(out);
  const header = [
    `# ${entry.name} @ ${entry.commit} (${entry.stack})`,
    `# platform: ${report.platform}; files scanned: ${report.filesScanned}; findings: ${report.issueCount}`,
    ...(report.deferred ? [`# deferred: ${report.deferred.map((d) => d.ruleId).join(', ')}`] : []),
  ];
  const lines = report.issues
    .map((i) => `${i.file}:${i.line}:${i.column} ${i.severity} ${i.ruleId} ${i.message}`)
    .sort();
  return `${[...header, ...lines].join('\n')}\n`;
}

let changed = 0;
for (const entry of corpus) {
  if (only.length > 0 && !only.includes(entry.name)) continue;
  const file = path.join(snapshotDir, `${entry.name}.txt`);
  const actual = snapshot(entry, checkout(entry));
  const expected = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (actual === expected) {
    console.log(`✔ ${entry.name}`);
    continue;
  }
  if (update) {
    fs.mkdirSync(snapshotDir, { recursive: true });
    fs.writeFileSync(file, actual);
    console.log(`✎ ${entry.name}: snapshot updated`);
    continue;
  }
  changed++;
  const before = new Set(expected.split('\n'));
  const after = new Set(actual.split('\n'));
  console.log(`✖ ${entry.name}: findings changed`);
  for (const line of expected.split('\n')) if (line && !after.has(line)) console.log(`  - ${line}`);
  for (const line of actual.split('\n')) if (line && !before.has(line)) console.log(`  + ${line}`);
}

if (changed > 0) {
  console.log(`\n${changed} snapshot(s) differ. If every change above is intended, run`
    + ' `npm run field-test -- --update` and commit field-test/snapshots.');
  process.exit(1);
}
