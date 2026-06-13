import { describe, expect, it } from 'vitest';
import {
  analyze,
  buildFileModel,
  globToRegExp,
  parseSource,
  staticValue,
  type Rule,
} from '@react-a11y/core';

function model(code: string) {
  return buildFileModel(parseSource(code, 'test.tsx'));
}

describe('element model', () => {
  it('extracts static and dynamic attributes', () => {
    const { elements } = model(
      `const x = <img src="/a.png" alt={"hero"} width={100} hidden draggable={false} title={someVar} />;`,
    );
    const img = elements[0];
    expect(img.name).toBe('img');
    expect(img.isComponent).toBe(false);
    expect(staticValue(img, 'alt')).toBe('hero');
    expect(staticValue(img, 'width')).toBe(100);
    expect(staticValue(img, 'hidden')).toBe(true);
    expect(staticValue(img, 'draggable')).toBe(false);
    expect(img.attrs.get('title')?.kind).toBe('expression');
  });

  it('tracks spreads, imports and nesting', () => {
    const { elements } = model(`
      import Image from 'next/image';
      const x = <div {...props}><Image alt="a" src="/a.png" /><span>hi</span></div>;
    `);
    const [div, image, span] = elements;
    expect(div.hasSpread).toBe(true);
    expect(image.importSource).toBe('next/image');
    expect(image.parent).toBe(div);
    expect(div.childElements).toHaveLength(2);
    expect(span.hasTextChild).toBe(true);
  });

  it('finds elements inside conditional expressions', () => {
    const { elements } = model(`const x = <div>{cond && <button onClick={f} />}</div>;`);
    expect(elements.map((e) => e.name)).toEqual(['div', 'button']);
    expect(elements[1].parent?.name).toBe('div');
  });
});

const dummyRule: Rule = {
  meta: { id: 'every-img', description: 'flags every img', severity: 'moderate', platforms: ['web'], wcag: ['1.1.1'] },
  create: (ctx) => ({
    element(el) {
      if (el.name === 'img') ctx.report({ el, message: 'img found' });
    },
  }),
};

describe('engine', () => {
  it('reports diagnostics with location and WCAG metadata', () => {
    const diags = analyze({
      code: `const x = <div>\n  <img src="a" />\n</div>;`,
      filename: 'app.tsx',
      platform: 'web',
      rules: [dummyRule],
    });
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({ ruleId: 'every-img', line: 2, severity: 'moderate' });
    expect(diags[0].wcag[0].name).toBe('Non-text Content');
  });

  it('honors rule settings: off and severity override', () => {
    const code = `const x = <img src="a" />;`;
    const base = { code, filename: 'app.tsx', platform: 'web' as const, rules: [dummyRule] };
    expect(analyze({ ...base, ruleSettings: { 'every-img': 'off' } })).toHaveLength(0);
    expect(analyze({ ...base, ruleSettings: { 'every-img': 'critical' } })[0].severity).toBe('critical');
  });

  it('skips rules for the wrong platform', () => {
    const diags = analyze({
      code: `const x = <img src="a" />;`,
      filename: 'app.tsx',
      platform: 'native',
      rules: [dummyRule],
    });
    expect(diags).toHaveLength(0);
  });
});

describe('color and contrast', () => {
  it('parses hex, rgb and named colors; rejects translucent and unknown', async () => {
    const { parseColor, contrastRatio } = await import('@react-a11y/core');
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#1a2b3c')).toEqual({ r: 26, g: 43, b: 60 });
    expect(parseColor('rgb(0, 128, 0)')).toEqual({ r: 0, g: 128, b: 0 });
    expect(parseColor('rgba(0,0,0,0.5)')).toBeNull();
    expect(parseColor('#aabbcc80')).toBeNull();
    expect(parseColor('var(--brand)')).toBeNull();
    expect(parseColor('rebeccapurple')).toBeNull();
    const ratio = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('captures static text on elements', () => {
    const { elements } = model(`const x = <button aria-label="Go">Submit {"now"}</button>;`);
    expect(elements[0].directText).toBe('Submit now');
  });
});

describe('fixes', () => {
  it('applies non-overlapping fixes from the end', async () => {
    const { applyFixes } = await import('@react-a11y/core');
    const { output, applied } = applyFixes('abcdef', [
      { start: 0, end: 1, replacement: 'X' },
      { start: 3, end: 5, replacement: '' },
    ]);
    expect(output).toBe('Xbcf');
    expect(applied).toBe(2);
  });
  it('skips overlapping fixes', async () => {
    const { applyFixes } = await import('@react-a11y/core');
    const { output, applied } = applyFixes('abcdef', [
      { start: 1, end: 4, replacement: 'Z' },
      { start: 2, end: 5, replacement: 'Y' },
    ]);
    expect(applied).toBe(1);
    expect(output).toBe('abYf'); // later-starting fix applies; the overlap is skipped
  });
  it('fixRenameAttr and fixRemoveAttr produce working edits', async () => {
    const { fixRenameAttr, fixRemoveAttr, applyFixes } = await import('@react-a11y/core');
    const code = `const x = <div aria-Label="hi" role="generic" />;`;
    const { elements } = model(code);
    const rename = fixRenameAttr(elements[0], 'aria-Label', 'aria-label')!;
    const remove = fixRemoveAttr(elements[0], 'role')!;
    const { output } = applyFixes(code, [rename, remove]);
    expect(output).toBe(`const x = <div aria-label="hi" />;`);
  });
});

describe('glob matcher', () => {
  it('supports * and **', () => {
    expect(globToRegExp('**/*.stories.tsx').test('src/deep/Button.stories.tsx')).toBe(true);
    expect(globToRegExp('**/*.stories.tsx').test('Button.stories.tsx')).toBe(true);
    expect(globToRegExp('src/*.tsx').test('src/App.tsx')).toBe(true);
    expect(globToRegExp('src/*.tsx').test('src/deep/App.tsx')).toBe(false);
  });
});
