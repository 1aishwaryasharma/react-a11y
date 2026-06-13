import fs from 'node:fs';
import path from 'node:path';
import { resolveWcag, type Diagnostic, type Rule } from '@react-a11y/core';
import { helpUrlFor } from '../util.js';

const RULE_META = {
  id: 'no-orientation-lock',
  description: 'Do not lock the app to a single orientation in project config.',
  severity: 'moderate',
  platforms: ['native'],
  wcag: ['1.3.4'],
  partial: true,
  helpUrl: helpUrlFor('no-orientation-lock'),
} satisfies Rule['meta'];

function lineColAt(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const column = index - before.lastIndexOf('\n');
  return { line, column };
}

function read(file: string): string | null {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function makeDiagnostic(file: string, text: string, index: number, matchLength: number, message: string): Diagnostic {
  const { line, column } = lineColAt(text, index);
  return {
    ruleId: RULE_META.id,
    message,
    severity: RULE_META.severity,
    file,
    line,
    column,
    endLine: line,
    endColumn: column + matchLength,
    wcag: resolveWcag(RULE_META.wcag),
    helpUrl: RULE_META.helpUrl,
  };
}

const REMEDY =
  'WCAG 1.3.4 (AA) requires content to work in both portrait and landscape — users with mounted devices cannot rotate. Lock only if a single orientation is truly essential.';

function checkExpoJson(root: string): Diagnostic[] {
  const file = 'app.json';
  const text = read(path.join(root, file));
  if (!text) return [];
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const expo = (parsed.expo ?? parsed) as Record<string, unknown>;
  const orientation = expo?.orientation;
  if (orientation !== 'portrait' && orientation !== 'landscape') return [];
  const index = Math.max(text.indexOf('"orientation"'), 0);
  return [
    makeDiagnostic(file, text, index, '"orientation"'.length,
      `Expo config locks orientation to "${orientation}". ${REMEDY} Use "default" to allow rotation.`),
  ];
}

function checkExpoConfigScript(root: string): Diagnostic[] {
  for (const name of ['app.config.js', 'app.config.ts', 'app.config.mjs', 'app.config.cjs']) {
    const text = read(path.join(root, name));
    if (!text) continue;
    const match = /orientation\s*:\s*['"](portrait|landscape)['"]/.exec(text);
    if (!match) continue;
    return [
      makeDiagnostic(name, text, match.index, match[0].length,
        `Expo config locks orientation to "${match[1]}". ${REMEDY} Use 'default' to allow rotation.`),
    ];
  }
  return [];
}

const ANDROID_MANIFEST = 'android/app/src/main/AndroidManifest.xml';
const ANDROID_LOCKED = /android:screenOrientation\s*=\s*"(portrait|reversePortrait|sensorPortrait|userPortrait|landscape|reverseLandscape|sensorLandscape|userLandscape)"/;

function checkAndroidManifest(root: string): Diagnostic[] {
  const text = read(path.join(root, ANDROID_MANIFEST));
  if (!text) return [];
  const match = ANDROID_LOCKED.exec(text);
  if (!match) return [];
  return [
    makeDiagnostic(ANDROID_MANIFEST, text, match.index, match[0].length,
      `AndroidManifest locks the activity to "${match[1]}". ${REMEDY} Remove android:screenOrientation or use "fullUser".`),
  ];
}

function checkIosPlists(root: string): Diagnostic[] {
  const iosDir = path.join(root, 'ios');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(iosDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const diagnostics: Diagnostic[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const rel = `ios/${entry.name}/Info.plist`;
    const text = read(path.join(root, rel));
    if (!text || !text.includes('UISupportedInterfaceOrientations')) continue;
    const hasPortrait = text.includes('UIInterfaceOrientationPortrait');
    const hasLandscape = text.includes('UIInterfaceOrientationLandscape');
    if (hasPortrait === hasLandscape) continue; // both (fine) or neither (unparseable)
    const locked = hasPortrait ? 'portrait' : 'landscape';
    const index = text.indexOf('UISupportedInterfaceOrientations');
    diagnostics.push(
      makeDiagnostic(rel, text, index, 'UISupportedInterfaceOrientations'.length,
        `Info.plist supports only ${locked} orientations. ${REMEDY}`),
    );
  }
  return diagnostics;
}

/**
 * WCAG 1.3.4 Orientation: flags orientation locks wherever React Native
 * projects declare them — Expo app.json / app.config.*, AndroidManifest.xml
 * and iOS Info.plist. Runtime locks (expo-screen-orientation) are out of
 * static reach, hence `partial`.
 */
export const noOrientationLock: Rule = {
  meta: RULE_META,
  create: () => ({}),
  projectCheck(root) {
    return [
      ...checkExpoJson(root),
      ...checkExpoConfigScript(root),
      ...checkAndroidManifest(root),
      ...checkIosPlists(root),
    ];
  },
};
