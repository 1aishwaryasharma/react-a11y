#!/usr/bin/env node
/**
 * Drift check against React Native's own types. The native rules keep
 * allowlists of roles and accessibility props; when a React Native release
 * adds one, code using it would be reported as invalid until the list is
 * updated. This reads the latest (or a given) react-native package from npm
 * and fails when it has a value the allowlists lack.
 *
 *   npm run build && npm run rn-drift            # latest
 *   npm run rn-drift -- 0.87.1
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const native = await import(path.join(repoRoot, 'packages/rules-native/dist/index.js'));
const version = process.argv[2] ?? 'latest';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-drift-'));
const tarball = execFileSync('npm', ['pack', `react-native@${version}`, '--silent', '--pack-destination', tmp], { encoding: 'utf8' })
  .trim().split('\n').pop();
const viewDir = 'package/Libraries/Components/View';
execFileSync('tar', ['xzf', path.join(tmp, tarball), '-C', tmp, `${viewDir}/ViewAccessibility.js`, `${viewDir}/ViewAccessibility.d.ts`]);
const flow = fs.readFileSync(path.join(tmp, viewDir, 'ViewAccessibility.js'), 'utf8');
const dts = fs.readFileSync(path.join(tmp, viewDir, 'ViewAccessibility.d.ts'), 'utf8');

/** The string members of `export type <name> = 'a' | 'b' | …;`. */
function union(source, name) {
  const match = new RegExp(`export type ${name}\\s*=([^;]*);`).exec(source);
  if (!match) throw new Error(`react-native ${version}: could not find type ${name}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

const checks = [
  { name: 'accessibilityRole values', upstream: union(flow, 'AccessibilityRole'), ours: native.RN_ROLES },
  { name: 'role values', upstream: union(flow, 'Role'), ours: native.RN_ROLE_PROP_VALUES },
  {
    name: 'aria-* props',
    upstream: [...new Set([...dts.matchAll(/'(aria-[a-z]+)'\??:/g)].map((m) => m[1]))],
    ours: native.KNOWN_ARIA_PROPS,
  },
  {
    name: 'accessibility* props',
    upstream: [...new Set([...dts.matchAll(/^\s*(accessibility[A-Z]\w*)\??:/gm)].map((m) => m[1]))],
    ours: native.KNOWN_A11Y_PROPS,
  },
];

let missing = 0;
console.log(`react-native ${tarball.replace(/^react-native-|\.tgz$/g, '')}`);
for (const { name, upstream, ours } of checks) {
  const lacking = upstream.filter((value) => !ours.has(value));
  missing += lacking.length;
  console.log(lacking.length === 0
    ? `✔ ${name}: all ${upstream.length} known`
    : `✖ ${name}: missing ${lacking.join(', ')}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
if (missing > 0) {
  console.log('\nAdd the missing values to the allowlists in packages/rules-native/src (components.ts, aria.ts).');
  process.exit(1);
}
