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

describe('web rule false-positive fixes', () => {
  it('does not measure a checkbox against its own box when a label extends it', () => {
    expect(ids(`const x = <label className="flex gap-2"><input type="checkbox" className="h-4 w-4" /> Remember me</label>;`))
      .not.toContain('target-size');
    // A bare checkbox with no label really is a 16px target.
    expect(ids(`const x = <input type="checkbox" className="h-4 w-4" aria-label="Remember me" />;`)).toContain('target-size');
  });

  it('checks interpolated text, not just literal children', () => {
    expect(ids(`const x = <div className="bg-white"><p className="text-gray-400">{label}</p></div>;`)).toContain('color-contrast');
  });

  it('does not claim a missing focus ring it cannot see', () => {
    // The replacement ring may be in the half of the class string we cannot read…
    expect(ids(`const x = <button className={cn('outline-none', props.className)} onClick={f}>Go</button>;`))
      .not.toContain('no-outline-none');
    // …or on the parent, which is the shadcn group/has-focus-visible pattern.
    expect(ids(`const x = <div className="has-focus-visible:ring-2"><button className="outline-none" onClick={f}>Go</button></div>;`))
      .not.toContain('no-outline-none');
  });

  it('flags text between 3:1 and 4.5:1 whose size is unknown', () => {
    // blue-500 on white is 3.68:1 — below AA for the 16px default <p>.
    const found = run(`const x = <div className="bg-white"><p className="text-blue-500">Link</p></div>;`)
      .filter((d) => d.ruleId === 'color-contrast');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('moderate');
  });
});

describe('things that are not pointer targets', () => {
  it('ignores visually-hidden and transparent controls', () => {
    // calcom's required-field shim: a 1px transparent input behind a Select.
    expect(ids(`const x = <input tabIndex={-1} style={{ opacity: 0, height: 1, width: 1 }} onClick={f} />;`))
      .not.toContain('target-size');
    expect(ids(`const x = <button className="sr-only h-2 w-2" onClick={f}>Skip</button>;`)).not.toContain('target-size');
    expect(ids(`const x = <input type="hidden" className="h-1 w-1" onClick={f} />;`)).not.toContain('target-size');
    expect(ids(`const x = <button className="h-2 w-2" onClick={f} aria-label="x" />;`)).toContain('target-size');
  });

  it('does not measure a checkbox against its box when a clickable row activates it', () => {
    expect(ids(`const x = <div onClick={f}><input type="checkbox" className="h-4 w-4" /><span>Pick me</span></div>;`))
      .not.toContain('target-size');
  });

  it('does not check contrast of screen-reader-only text', () => {
    expect(ids(`const x = <div className="bg-white"><p className="sr-only text-gray-400">Announced</p></div>;`))
      .not.toContain('color-contrast');
  });
});

describe('label association extends a checkbox target', () => {
  it('accepts a label that references the control by id', () => {
    expect(ids(`const x = (
      <div className="flex items-center">
        <input id="remember" type="checkbox" className="h-4 w-4" />
        <label htmlFor="remember" className="ml-2 text-sm">Remember me</label>
      </div>
    );`)).not.toContain('target-size');
  });

  it('still flags a checkbox with no label anywhere', () => {
    expect(ids(`const x = (
      <div className="flex items-center">
        <input id="remember" type="checkbox" className="h-4 w-4" aria-label="Remember me" />
      </div>
    );`)).toContain('target-size');
  });
});

describe('target-size across conditional class sets', () => {
  it('reports a branch that is smaller than the always-on size, once', () => {
    const found = run(`const x = <a href="/help" className={cn('rounded', secondary ? 'flex h-8 w-8' : 'flex size-11')}>?</a>;`)
      .filter((d) => d.ruleId === 'target-size');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('32×32px target under a conditional class set');
  });

  it('does not restate the base finding for a branch in the same tier', () => {
    // h-5 is already 20px tall; `isEmpty && 'w-5'` does not make it worse.
    const found = run(`const x = <button className={cn('flex h-5 px-1.5', isEmpty && 'w-5 p-0')} aria-label="x" />;`)
      .filter((d) => d.ruleId === 'target-size');
    expect(found).toHaveLength(1);
    expect(found[0].message).not.toContain('conditional');
  });
});
