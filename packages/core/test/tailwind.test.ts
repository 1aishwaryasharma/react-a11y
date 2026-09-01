import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFileModel,
  contrastFindings,
  effectiveStyle,
  parseSource,
  readProjectInfo,
  resolveClassString,
  resolveColor,
  resolveLength,
  resolvedStyleNumber,
  styleModel,
  DEFAULT_TAILWIND_OPTIONS,
  type ProjectInfo,
  type TailwindOptions,
} from '@aishware/react-a11y-core';

const v4: TailwindOptions = { preset: 'v4', rem: 16 };
const nativewind4: TailwindOptions = { preset: 'v3', rem: 14 };
const project = (tailwind: TailwindOptions = v4): ProjectInfo => ({ dependencies: {}, tailwind });

function firstElement(code: string) {
  return buildFileModel(parseSource(code, 'test.tsx')).elements[0];
}

describe('tailwind utilities', () => {
  it('resolves spacing-scale, px and arbitrary lengths against the rem base', () => {
    expect(resolveLength('6', v4)).toBe(24);
    expect(resolveLength('6', nativewind4)).toBe(21);
    expect(resolveLength('px', v4)).toBe(1);
    expect(resolveLength('[20px]', v4)).toBe(20);
    expect(resolveLength('[2rem]', nativewind4)).toBe(28);
    expect(resolveLength('full', v4)).toBeNull();
    expect(resolveLength('1/2', v4)).toBeNull();
  });

  it('resolves palette, arbitrary and custom colors, and refuses translucent ones', () => {
    expect(resolveColor('gray-400', v4)).toBe('#99a1af');
    expect(resolveColor('gray-400', nativewind4)).toBe('#9ca3af');
    expect(resolveColor('white', v4)).toBe('#ffffff');
    expect(resolveColor('[#123456]', v4)).toBe('#123456');
    expect(resolveColor('white/50', v4)).toBeNull();
    expect(resolveColor('white/100', v4)).toBe('#ffffff');
    expect(resolveColor('brand', { ...v4, colors: { brand: '#0055ff' } })).toBe('#0055ff');
    expect(resolveColor('primary', v4)).toBeNull();
    expect(resolveColor('transparent', v4)).toBe('transparent');
  });

  it('splits text-* into sizes and colors and keeps variants in separate layers', () => {
    const layers = resolveClassString('text-sm font-bold text-gray-500 bg-white dark:bg-gray-900 dark:text-gray-400 hidden', v4);
    const base = layers.get('')!;
    expect(base.fontSize).toBe(14);
    expect(base.fontWeight).toBe(700);
    expect(base.color).toBe('#6a7282');
    expect(base.backgroundColor).toBe('#ffffff');
    expect(base.display).toBe('none');
    expect(layers.get('dark')?.backgroundColor).toBe('#101828');
    expect(layers.get('dark')?.color).toBe('#99a1af');
  });

  it('handles size-*, min/max, important markers and arbitrary sizes', () => {
    const base = resolveClassString('size-5 min-h-11 !w-8 max-h-[40px] text-[13px]', v4).get('')!;
    expect(base.width).toBe(32);
    expect(base.height).toBe(20);
    expect(base.minHeight).toBe(44);
    expect(base.maxHeight).toBe(40);
    expect(base.fontSize).toBe(13);
  });
});

describe('style model', () => {
  it('reads className strings, cn() calls, templates and conditionals', () => {
    const el = firstElement(
      `const x = <View className={cn('h-6 w-6', active && 'bg-blue-500', \`text-\${size}\`, { 'text-red-500': hasError })} />;`,
    );
    const m = styleModel(el, project());
    expect(effectiveStyle(m).width).toBe(24);
    expect(effectiveStyle(m).backgroundColor).toBeUndefined();
    const conditional = [...m.layers.keys()].filter((k) => k.startsWith('#'));
    expect(conditional.length).toBe(2);
    expect(m.unknownClasses).toBe(true); // the template hole
  });

  it('lets inline literals win over classes and treats dynamic styles as unknown', () => {
    const inline = firstElement(`const x = <View className="h-6" style={{ height: 48 }} />;`);
    expect(resolvedStyleNumber(inline, 'height', project())).toBe(48);
    const dynamic = firstElement(`const x = <View className="h-6" style={styles.box} />;`);
    expect(resolvedStyleNumber(dynamic, 'height', project())).toBeUndefined();
    const arr = firstElement(`const x = <View style={[styles.box, { height: 20 }]} />;`);
    expect(resolvedStyleNumber(arr, 'height', project())).toBe(20);
    const arr2 = firstElement(`const x = <View style={[{ height: 20 }, styles.box]} />;`);
    expect(resolvedStyleNumber(arr2, 'height', project())).toBeUndefined();
  });

  it('reads twrnc tw`…` templates inside style', () => {
    const el = firstElement('const x = <Pressable style={tw`h-5 w-5`} />;');
    expect(resolvedStyleNumber(el, 'height', project())).toBe(20);
    expect(resolvedStyleNumber(el, 'height', { dependencies: {} })).toBeUndefined();
  });

  it('ignores classes when the project has no Tailwind binding', () => {
    const el = firstElement(`const x = <View className="h-6" />;`);
    expect(resolvedStyleNumber(el, 'height', { dependencies: {} })).toBeUndefined();
    expect(resolvedStyleNumber(el, 'height', undefined)).toBeUndefined();
  });
});

describe('contrast findings', () => {
  it('uses the enclosing background and checks dark: variants separately', () => {
    const el = buildFileModel(parseSource(
      `const x = <View className="bg-white dark:bg-gray-900"><Text className="text-gray-400 dark:text-gray-700">Hi</Text></View>;`,
      'test.tsx',
    )).elements[1];
    const findings = contrastFindings(el, project());
    expect(findings.map((f) => f.layer).sort()).toEqual(['', 'dark']);
    expect(findings[0].message).toContain('enclosing <View>');
  });

  it('passes good pairs and skips unknown or translucent backgrounds', () => {
    const good = buildFileModel(parseSource(
      `const x = <View className="bg-white"><Text className="text-gray-700">Hi</Text></View>;`, 'test.tsx',
    )).elements[1];
    expect(contrastFindings(good, project())).toEqual([]);
    const translucent = buildFileModel(parseSource(
      `const x = <View className="bg-black/50"><Text className="text-gray-400">Hi</Text></View>;`, 'test.tsx',
    )).elements[1];
    expect(contrastFindings(translucent, project())).toEqual([]);
    const wrapped = buildFileModel(parseSource(
      `import { Card } from './ui';\nconst x = <View className="bg-white"><Card><Text className="text-gray-400">Hi</Text></Card></View>;`, 'test.tsx',
    )).elements[2];
    expect(contrastFindings(wrapped, project())).toEqual([]);
  });

  it('exempts disabled: and placeholder: variants', () => {
    const el = buildFileModel(parseSource(
      `const x = <View className="bg-white"><Text className="text-gray-900 disabled:text-gray-300">Hi</Text></View>;`, 'test.tsx',
    )).elements[1];
    expect(contrastFindings(el, project())).toEqual([]);
  });

  it('still works for inline literal styles without Tailwind', () => {
    const el = firstElement(`const x = <p style={{ color: '#999', backgroundColor: '#fff' }}>Hi</p>;`);
    expect(contrastFindings(el, undefined)).toHaveLength(1);
  });
});

describe('project detection', () => {
  function tempProject(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-tw-'));
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    }
    return dir;
  }

  it('detects NativeWind v4 as Tailwind v3 with a 14px rem', () => {
    const dir = tempProject({ 'package.json': JSON.stringify({ dependencies: { nativewind: '^4.1.0', 'react-native': '0.79.0' } }) });
    const info = readProjectInfo(dir);
    expect(info.tailwind).toEqual({ preset: 'v3', rem: 14 });
    expect(info.dependencies['react-native']).toBe('0.79.0');
  });

  it('detects Uniwind / Tailwind v4 and reads theme colors from config and CSS', () => {
    const dir = tempProject({
      'package.json': JSON.stringify({ dependencies: { uniwind: '^1.0.0', tailwindcss: '^4.1.0' } }),
      'tailwind.config.js': `module.exports = { theme: { extend: { colors: { brand: { DEFAULT: '#0055ff', 500: '#0055ff' }, ink: '#111' } } } };`,
      'src/global.css': `@import "tailwindcss";\n@theme { --color-accent-500: #ff0055; --color-alias: var(--color-accent-500); }`,
    });
    const info = readProjectInfo(dir);
    expect(info.tailwind?.preset).toBe('v4');
    expect(info.tailwind?.rem).toBe(16);
    expect(info.tailwind?.colors).toEqual({ brand: '#0055ff', 'brand-500': '#0055ff', ink: '#111', 'accent-500': '#ff0055' });
  });

  it('honours config overrides and the off switch', () => {
    const dir = tempProject({ 'package.json': JSON.stringify({ dependencies: { tailwindcss: '^3.4.0' } }) });
    expect(readProjectInfo(dir, { tailwind: false }).tailwind).toBeUndefined();
    expect(readProjectInfo(dir, { tailwind: { rem: 10, colors: { brand: '#000' } } }).tailwind).toEqual({ preset: 'v3', rem: 10, colors: { brand: '#000' } });
    const plain = tempProject({ 'package.json': JSON.stringify({ dependencies: { react: '^19' } }) });
    expect(readProjectInfo(plain).tailwind).toBeUndefined();
    expect(readProjectInfo(plain, { tailwind: {} }).tailwind).toEqual(DEFAULT_TAILWIND_OPTIONS);
  });
});
