import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Exercises the built CLI end-to-end; `npm run build` must have run first
// (CI builds before testing).
const cli = fileURLToPath(new URL('../dist/index.js', import.meta.url));

const UNNAMED = 'export const A = () => <button onClick={f} />;\n';

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-baseline-'));
  fs.mkdirSync(path.join(dir, '.git'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { react: '^19' } }));
  fs.writeFileSync(path.join(dir, 'A.tsx'), UNNAMED);
  return dir;
}

function run(dir: string, ...args: string[]) {
  const out = spawnSync('node', [cli, dir, '--format', 'json', ...args], { encoding: 'utf8' });
  return { status: out.status, stderr: out.stderr, report: out.stdout ? JSON.parse(out.stdout) : undefined };
}

describe('--baseline', () => {
  it('refuses a missing baseline instead of silently passing', () => {
    const dir = project();
    const result = run(dir, '--baseline', path.join(dir, 'a11y-baseline.json'));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('--update-baseline');
  });

  it('hides recorded findings, survives code moving, and fails on a new one', () => {
    const dir = project();
    const file = path.join(dir, 'a11y-baseline.json');
    expect(run(dir, '--baseline', file, '--update-baseline').status).toBe(0);

    const clean = run(dir, '--baseline', file);
    expect(clean.status).toBe(0);
    expect(clean.report.issueCount).toBe(0);
    expect(clean.report.baseline).toMatchObject({ suppressed: 1, stale: 0 });

    // The known finding moves down three lines; a second identical one is new.
    fs.writeFileSync(path.join(dir, 'A.tsx'), `\n\n\n${UNNAMED}export const B = () => <button onClick={f} />;\n`);
    const added = run(dir, '--baseline', file);
    expect(added.status).toBe(1);
    expect(added.report.issues.map((i: { line: number }) => i.line)).toEqual([5]);
  });

  it('counts entries that are gone as stale, and will not rewrite from a partial scan', () => {
    const dir = project();
    const file = path.join(dir, 'a11y-baseline.json');
    run(dir, '--baseline', file, '--update-baseline');
    fs.writeFileSync(path.join(dir, 'A.tsx'), 'export const A = () => <button onClick={f}>Save</button>;\n');
    expect(run(dir, '--baseline', file).report.baseline).toMatchObject({ suppressed: 0, stale: 1 });
    const partial = run(dir, '--baseline', file, '--update-baseline', '--changed');
    expect(partial.status).toBe(2);
    expect(partial.stderr).toContain('full scan');
  });
});
