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

describe('glob matcher', () => {
  it('supports * and **', () => {
    expect(globToRegExp('**/*.stories.tsx').test('src/deep/Button.stories.tsx')).toBe(true);
    expect(globToRegExp('**/*.stories.tsx').test('Button.stories.tsx')).toBe(true);
    expect(globToRegExp('src/*.tsx').test('src/App.tsx')).toBe(true);
    expect(globToRegExp('src/*.tsx').test('src/deep/App.tsx')).toBe(false);
  });
});
