import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analyze,
  buildFileModel,
  filePlatform,
  fixRenameAttr,
  globToRegExp,
  parseColor,
  parseSource,
  staticValue,
  scanProject,
  validateConfig,
  type Rule,
} from '@aishware/react-a11y-core';

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
    expect(image.importName).toBe('Image');
    expect(image.importSource).toBe('next/image');
    expect(image.parent).toBe(div);
    expect(div.childElements).toHaveLength(2);
    expect(span.hasTextChild).toBe(true);
  });

  it('preserves imported component names through aliases and namespaces', () => {
    const { elements } = model(`
      import { Text as RNText } from 'react-native';
      import * as RN from 'react-native';
      import * as rn from 'react-native';
      const label = <RNText>Label</RNText>;
      const toggle = <RN.Switch value={enabled} />;
      const lowerAlias = <rn.Text>Lower alias</rn.Text>;
    `);
    expect(elements[0].importName).toBe('Text');
    expect(elements[0].importSource).toBe('react-native');
    expect(elements[1].importName).toBe('Switch');
    expect(elements[1].importSource).toBe('react-native');
    expect(elements[2].importName).toBe('Text');
    expect(elements[2].importSource).toBe('react-native');
    expect(elements[2].isComponent).toBe(true);
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
    const { parseColor, contrastRatio } = await import('@aishware/react-a11y-core');
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
    const { applyFixes } = await import('@aishware/react-a11y-core');
    const { output, applied } = applyFixes('abcdef', [
      { start: 0, end: 1, replacement: 'X' },
      { start: 3, end: 5, replacement: '' },
    ]);
    expect(output).toBe('Xbcf');
    expect(applied).toBe(2);
  });
  it('skips overlapping fixes', async () => {
    const { applyFixes } = await import('@aishware/react-a11y-core');
    const { output, applied } = applyFixes('abcdef', [
      { start: 1, end: 4, replacement: 'Z' },
      { start: 2, end: 5, replacement: 'Y' },
    ]);
    expect(applied).toBe(1);
    expect(output).toBe('abYf'); // later-starting fix applies; the overlap is skipped
  });
  it('fixRenameAttr and fixRemoveAttr produce working edits', async () => {
    const { fixRenameAttr, fixRemoveAttr, applyFixes } = await import('@aishware/react-a11y-core');
    const code = `const x = <div aria-Label="hi" role="generic" />;`;
    const { elements } = model(code);
    const rename = fixRenameAttr(elements[0], 'aria-Label', 'aria-label')!;
    const remove = fixRemoveAttr(elements[0], 'role')!;
    const { output } = applyFixes(code, [rename, remove]);
    expect(output).toBe(`const x = <div aria-label="hi" />;`);
  });
});

describe('glob matcher', () => {
  it('supports *, ** and ?', () => {
    expect(globToRegExp('**/*.stories.tsx').test('src/deep/Button.stories.tsx')).toBe(true);
    expect(globToRegExp('**/*.stories.tsx').test('Button.stories.tsx')).toBe(true);
    expect(globToRegExp('src/*.tsx').test('src/App.tsx')).toBe(true);
    expect(globToRegExp('src/*.tsx').test('src/deep/App.tsx')).toBe(false);
    expect(globToRegExp('src/?.tsx').test('src/A.tsx')).toBe(true);
    expect(globToRegExp('src/?.tsx').test('src/App.tsx')).toBe(false);
  });

  it('handles pathological wildcard patterns without regex backtracking', () => {
    const matcher = globToRegExp(`${'**/'.repeat(100)}never.tsx`);
    expect(matcher.test(`${'segment/'.repeat(1000)}file.tsx`)).toBe(false);
  });

  it('rejects unreasonably large config globs', () => {
    expect(() => globToRegExp('*'.repeat(1025))).toThrow('ignore glob exceeds 1024 characters');
  });
});

describe('modern colour syntaxes', () => {
  it('parses oklch, hsl and slash-separated rgb', () => {
    // Tailwind v4 writes its palette in OKLCH; blue-500 is oklch(0.623 0.214 259.815).
    expect(parseColor('oklch(0.623 0.214 259.815)')).toEqual({ r: 43, g: 127, b: 255 });
    expect(parseColor('oklch(1 0 0)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('hsl(0 0% 100%)')).toEqual({ r: 255, g: 255, b: 255 });
    // shadcn writes its theme as a bare `<h> <s>% <l>%` triple; blue-500 is 217.2 91.2% 59.8%.
    expect(parseColor('hsl(217.2, 91.2%, 59.8%)')).toEqual({ r: 59, g: 130, b: 246 });
    expect(parseColor('rgb(0 0 0)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('still refuses anything translucent', () => {
    expect(parseColor('oklch(0.6 0.2 260 / 0.5)')).toBeNull();
    expect(parseColor('hsl(217 91% 60% / 50%)')).toBeNull();
    expect(parseColor('rgb(0 0 0 / 0.2)')).toBeNull();
  });
});

describe('autofix safety', () => {
  it('refuses to rename an attribute onto one the element already has', () => {
    const el = model(`const x = <View role="dialog" aria-role="dialog" />;`).elements[0];
    // Renaming would emit `role="dialog" role="dialog"` — a TS17001 parse error.
    expect(fixRenameAttr(el, 'aria-role', 'role')).toBeUndefined();
    const clean = model(`const x = <View aria-role="dialog" />;`).elements[0];
    expect(fixRenameAttr(clean, 'aria-role', 'role')).toBeDefined();
  });
});

describe('config validation', () => {
  it('rejects settings that would otherwise be silently ignored', () => {
    expect(() => validateConfig({ platform: 'ios' }, 'test')).toThrow(/invalid platform/);
    expect(() => validateConfig({ rules: { 'no-autofocus': 'disabled' } }, 'test')).toThrow(/invalid setting/);
    expect(() => validateConfig({ ignore: '**/*.tsx' }, 'test')).toThrow(/array of glob strings/);
    expect(() => validateConfig({ tailwind: { rem: 0 } }, 'test')).toThrow(/positive number/);
    expect(() => validateConfig({ tailwnid: {} }, 'test')).toThrow(/unknown key/);
    expect(validateConfig({ platform: 'native', tailwind: false }, 'test')).toEqual({ platform: 'native', tailwind: false });
  });
});

describe('platform-specific file extensions', () => {
  it('routes .web/.native/.ios files to the pack that actually loads them', () => {
    expect(filePlatform('src/Dialog.web.tsx')).toBe('web');
    expect(filePlatform('src/Dialog.native.tsx')).toBe('native');
    expect(filePlatform('src/Dialog.ios.tsx')).toBe('native');
    expect(filePlatform('src/Dialog.android.jsx')).toBe('native');
    expect(filePlatform('src/Dialog.tsx')).toBeUndefined();
  });
});

describe('a monorepo that holds both platforms', () => {
  const packRule = (id: string, platform: 'web' | 'native'): Rule => ({
    meta: { id, description: id, severity: 'moderate', platforms: [platform], wcag: ['1.1.1'] },
    create: (ctx) => ({ element: (el) => ctx.report({ el, message: id }) }),
  });

  it('analyses each file with the pack its own package needs', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-packs-'));
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    const write = (rel: string, body: string) => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), body);
    };
    write('package.json', JSON.stringify({ name: 'root', devDependencies: { turbo: '^2' } }));
    write('pnpm-workspace.yaml', 'packages:\n  - "apps/*"\n');
    write('apps/mobile/package.json', JSON.stringify({ dependencies: { 'react-native': '0.81.0' } }));
    write('apps/mobile/App.tsx', 'export const A = () => <View />;');
    write('apps/web/package.json', JSON.stringify({ dependencies: { next: '^15', react: '^19' } }));
    write('apps/web/Page.tsx', 'export const P = () => <div />;');
    // A platform-suffixed file overrides its package: this is web code inside
    // the React Native app.
    write('apps/mobile/Dialog.web.tsx', 'export const D = () => <div />;');

    const result = scanProject({
      root: dir,
      rules: [packRule('web-only', 'web')],
      rulePacks: { web: [packRule('web-only', 'web')], native: [packRule('native-only', 'native')] },
      platform: 'web',
    });
    const byFile = new Map(result.diagnostics.map((d) => [d.file, d.ruleId]));
    expect(byFile.get('apps/mobile/App.tsx')).toBe('native-only');
    expect(byFile.get('apps/web/Page.tsx')).toBe('web-only');
    expect(byFile.get('apps/mobile/Dialog.web.tsx')).toBe('web-only');
    expect(result.filesByPlatform).toEqual({ native: 1, web: 2 });
    expect(result.skipped).toBeUndefined();
  });
});
