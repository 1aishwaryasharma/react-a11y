import { describe, expect, it } from 'vitest';
import { analyze, type ProjectInfo } from '@aishware/react-a11y-core';
import { webRules } from '@aishware/react-a11y-rules-web';

const tailwind: ProjectInfo = { dependencies: { tailwindcss: '^4.1.0' }, tailwind: { preset: 'v4', rem: 16 } };

function run(code: string, project: ProjectInfo | null = tailwind) {
  return analyze({ code, filename: 'test.tsx', platform: 'web', rules: webRules, project: project ?? undefined });
}
const ids = (code: string, project?: ProjectInfo | null) => run(code, project).map((d) => d.ruleId);

describe('web rules with Tailwind classes', () => {
  it('target-size reads h-/w-/size- utilities', () => {
    const tiny = run(`const x = <button className="h-5 w-5" onClick={f} aria-label="Close" />;`).find((d) => d.ruleId === 'target-size');
    expect(tiny?.severity).toBe('serious');
    expect(ids(`const x = <button className="size-6" onClick={f} aria-label="Close" />;`)).toContain('target-size');
    expect(ids(`const x = <button className="h-11 w-11" onClick={f} aria-label="Close" />;`)).not.toContain('target-size');
    expect(ids(`const x = <button className="h-5 w-5" onClick={f} aria-label="Close" />;`, null)).not.toContain('target-size');
  });

  it('color-contrast uses the enclosing background and dark: variants', () => {
    expect(ids(`const x = <div className="bg-white"><p className="text-gray-400">Muted</p></div>;`)).toContain('color-contrast');
    expect(ids(`const x = <div className="bg-white"><p className="text-gray-700">Body</p></div>;`)).not.toContain('color-contrast');
    const dark = run(`const x = <div className="bg-white dark:bg-gray-950"><p className="text-gray-700 dark:text-gray-700">Body</p></div>;`)
      .filter((d) => d.ruleId === 'color-contrast');
    expect(dark).toHaveLength(1);
    expect(dark[0].message).toContain('`dark:` variant');
  });

  it('no-outline-none flags outline-none without a focus: replacement', () => {
    expect(ids(`const x = <button className="outline-none" onClick={f}>Go</button>;`)).toContain('no-outline-none');
    expect(ids(`const x = <button className="outline-none focus-visible:ring-2" onClick={f}>Go</button>;`)).not.toContain('no-outline-none');
    expect(ids(`const x = <button className="focus:outline-none focus:ring-2" onClick={f}>Go</button>;`)).not.toContain('no-outline-none');
    expect(ids(`const x = <button className="outline-none" onClick={f}>Go</button>;`, null)).not.toContain('no-outline-none');
  });
});
