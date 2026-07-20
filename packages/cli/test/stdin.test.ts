import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Exercises the built CLI end-to-end; `npm run build` must have run first
// (CI builds before testing).
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));

interface StdinReport {
  platform: string;
  filesScanned: number;
  issueCount: number;
  issues: Array<{
    ruleId: string;
    file: string;
    fix?: { start: number; end: number; replacement: string };
  }>;
}

function runStdin(code: string, args: string[], cwd?: string): StdinReport {
  const out = execFileSync('node', [cli, ...args], { input: code, encoding: 'utf8', cwd });
  return JSON.parse(out) as StdinReport;
}

describe('--stdin', () => {
  it('lints piped source as a single file and reports fixes', () => {
    const report = runStdin(
      'import { View } from "react-native";\nexport const A = () => <View accessibilitylabel="Save" />;\n',
      ['--stdin', '--stdin-filename', 'src/A.tsx', '--platform', 'native', '--format', 'json', '--fail-on', 'none'],
    );
    expect(report.platform).toBe('native');
    expect(report.filesScanned).toBe(1);
    const issue = report.issues.find((i) => i.ruleId === 'valid-accessibility-props');
    expect(issue).toBeDefined();
    expect(issue!.file).toBe('src/A.tsx');
    expect(issue!.fix).toEqual({ start: 66, end: 84, replacement: 'accessibilityLabel' });
  });

  it('applies config ignore globs to the stdin filename', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-stdin-'));
    try {
      fs.writeFileSync(
        path.join(root, 'react-a11y.config.json'),
        JSON.stringify({ platform: 'native', ignore: ['**/*.stories.tsx'] }),
      );
      const code = 'import { View } from "react-native";\nexport const A = () => <View accessibilitylabel="x" />;\n';
      const args = (file: string) => [root, '--stdin', '--stdin-filename', file, '--format', 'json', '--fail-on', 'none'];
      expect(runStdin(code, args('src/A.stories.tsx')).issueCount).toBe(0);
      expect(runStdin(code, args('src/A.tsx')).issueCount).toBeGreaterThan(0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('exits 1 when issues meet --fail-on and rejects --fix', () => {
    const code = 'export function B() { return <TouchableOpacity onPress={() => {}} />; }\n';
    const exitCode = (args: string[]): number => {
      try {
        execFileSync('node', [cli, ...args], { input: code, stdio: 'pipe' });
        return 0;
      } catch (err) {
        return (err as { status: number }).status;
      }
    };
    expect(exitCode(['--stdin', '--platform', 'native', '--format', 'json'])).toBe(1);
    expect(exitCode(['--stdin', '--fix'])).toBe(2);
  });
});
