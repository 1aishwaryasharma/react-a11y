import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFileModel,
  collectFiles,
  contrastFindings,
  effectiveStyle,
  parseColor,
  parseSource,
  detectPlatformDetailed,
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

describe('binding defaults (verified against the published packages)', () => {
  function tempProject(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-bind-'));
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    }
    return dir;
  }
  const pkg = (deps: Record<string, string>) => JSON.stringify({ dependencies: deps });

  // nativewind 2 dist/tailwind/native/index.js: `{ rem = 16 }`
  it('gives NativeWind v2 a 16px rem, not v4 metro default', () => {
    const dir = tempProject({ 'package.json': pkg({ nativewind: '^2.0.11', 'react-native': '0.72.0' }) });
    expect(readProjectInfo(dir).tailwind).toEqual({ preset: 'v3', rem: 16 });
  });

  // react-native-css compiler/declarations.js: `inlineRem = 14`
  it('gives react-native-css and NativeWind v5 a 14px rem and the v4 palette', () => {
    const rncss = tempProject({ 'package.json': pkg({ 'react-native-css': '^3.0.1', 'react-native': '0.81.0' }) });
    expect(readProjectInfo(rncss).tailwind).toEqual({ preset: 'v4', rem: 14 });
    const nw5 = tempProject({ 'package.json': pkg({ nativewind: '^5.0.0', 'react-native': '0.81.0' }) });
    expect(readProjectInfo(nw5).tailwind).toEqual({ preset: 'v4', rem: 14 });
  });

  it('reads an explicit rem base out of the bundler config', () => {
    const nw = tempProject({
      'package.json': pkg({ nativewind: '^4.1.0', 'react-native': '0.79.0' }),
      'metro.config.js': `module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });`,
    });
    expect(readProjectInfo(nw).tailwind?.rem).toBe(16);
    const uw = tempProject({
      'package.json': pkg({ uniwind: '^1.11.0', 'react-native': '0.81.0' }),
      'metro.config.js': `module.exports = withUniwind(config, { polyfills: { rem: 14 } });`,
    });
    expect(readProjectInfo(uw).tailwind?.rem).toBe(14);
  });

  it("detects twrnc under its pre-4.x package name", () => {
    const dir = tempProject({ 'package.json': pkg({ 'tailwind-react-native-classnames': '^3.0.0', 'react-native': '0.72.0' }) });
    expect(readProjectInfo(dir).tailwind).toEqual({ preset: 'v3', rem: 16 });
  });

  it('resolves a workspace package against its own manifest and the monorepo root', () => {
    const dir = tempProject({
      'package.json': JSON.stringify({ workspaces: ['apps/*'], devDependencies: { turbo: '^2' } }),
      'apps/mobile/package.json': pkg({ nativewind: '^4.1.0', 'react-native': '0.79.0' }),
      'apps/web/package.json': pkg({ next: '^15', react: '^19', tailwindcss: '^4.1.0' }),
    });
    expect(readProjectInfo(path.join(dir, 'apps/mobile')).tailwind).toEqual({ preset: 'v3', rem: 14 });
    expect(readProjectInfo(path.join(dir, 'apps/web')).tailwind).toEqual({ preset: 'v4', rem: 16 });
    // A single file resolves like the package that owns it.
    expect(readProjectInfo(path.join(dir, 'apps/mobile/src/App.tsx')).tailwind?.rem).toBe(14);
    expect(detectPlatformDetailed(path.join(dir, 'apps/mobile')).platform).toBe('native');
    expect(detectPlatformDetailed(dir).mixed).toBe(true);
  });

  it('reads theme colors only from theme.colors and theme.extend.colors', () => {
    const dir = tempProject({
      'package.json': pkg({ tailwindcss: '^3.4.0' }),
      'tailwind.config.js': `module.exports = {
        theme: { extend: { colors: { brand: '#0055ff' } } },
        daisyui: { themes: [{ light: { colors: { primary: '#ff0000' } } }] },
      };`,
    });
    expect(readProjectInfo(dir).tailwind?.colors).toEqual({ brand: '#0055ff' });
  });

  it('abstains instead of guessing when a theme color is not a literal', () => {
    const dir = tempProject({
      'package.json': pkg({ tailwindcss: '^3.4.0' }),
      'tailwind.config.js': `const palette = require('./palette');
        module.exports = { theme: { extend: { colors: { gray: palette.gray, ink: '#111' } } } };`,
    });
    const options = readProjectInfo(dir).tailwind!;
    expect(options.unresolvedColors).toEqual(['gray']);
    // gray-400 is overridden by something we cannot read — do not report the stock hex.
    expect(resolveColor('gray-400', options)).toBeNull();
    expect(resolveColor('ink', options)).toBe('#111');
    expect(resolveColor('red-400', options)).toBe('#f87171');
  });

  it('keeps looking past a tailwind.config.js shim that re-exports the real config', () => {
    const dir = tempProject({
      'package.json': pkg({ tailwindcss: '^3.4.0' }),
      'tailwind.config.js': `module.exports = require('./tailwind.config.ts').default;`,
      'tailwind.config.ts': `export default { theme: { extend: { colors: { brand: '#0055ff' } } } };`,
    });
    expect(readProjectInfo(dir).tailwind?.colors).toEqual({ brand: '#0055ff' });
  });
});

describe('class resolution gaps', () => {
  const nw = project(nativewind4);

  it('reads a hoisted class constant', () => {
    const el = firstElement(`const base = 'h-5 w-5';\nconst x = <View className={base} />;`);
    expect(resolvedStyleNumber(el, 'height', nw)).toBe(17.5);
  });

  it('refuses a name bound more than once, which may be shadowed', () => {
    const el = firstElement(`const base = 'h-5 w-5';\nfunction f() { const base = 'h-20'; return base; }\nconst x = <View className={base} />;`);
    expect(resolvedStyleNumber(el, 'height', nw)).toBeUndefined();
  });

  it('reads Platform.select branch values, not the platform keys', () => {
    const model = styleModel(
      firstElement(`const x = <Text className={Platform.select({ ios: 'text-gray-400', android: 'text-gray-500' })} />;`),
      project(v4),
    );
    const colors = [...model.layers.values()].map((s) => s.color);
    expect(colors).toContain('#99a1af'); // gray-400 (v4)
    expect(colors).toContain('#6a7282'); // gray-500 (v4)
  });

  it('resolves tw.style() the way it resolves tw``', () => {
    const el = firstElement("const x = <View style={tw.style('h-5 w-5')} />;");
    expect(resolvedStyleNumber(el, 'height', nw)).toBe(17.5);
  });

  it('ignores text-* and bg-* utilities that are not colours', () => {
    const layers = resolveClassString('text-gray-700 text-shadow-md bg-white bg-size-auto', v4);
    expect(layers.get('')?.color).toBe('#364153');
    expect(layers.get('')?.backgroundColor).toBe('#ffffff');
  });

  it('lets a theme redefine a built-in colour name', () => {
    const themed: TailwindOptions = { preset: 'v4', rem: 16, colors: { white: '#f5f5f0' } };
    expect(resolveColor('white', themed)).toBe('#f5f5f0');
  });

  it('does not fall back to the stock palette when the theme replaces it', () => {
    const replaced: TailwindOptions = { preset: 'v4', rem: 16, colors: { ink: '#111' }, replacesPalette: true };
    expect(resolveColor('ink', replaced)).toBe('#111');
    expect(resolveColor('gray-400', replaced)).toBeNull();
  });
});

describe('contrast correctness', () => {
  function textIn(code: string) {
    return buildFileModel(parseSource(code, 'test.tsx')).elements[1];
  }

  it('treats an unknown font size as normal text, not large', () => {
    // blue-500 on white is 3.68:1 — a real AA failure that used to pass because
    // the font size was unknown and unknown was read as "large".
    const found = contrastFindings(textIn(`const x = <View className="bg-white"><Text className="text-blue-500">Hi</Text></View>;`), project(nativewind4));
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('moderate');
    expect(found[0].message).toContain('below the 4.5:1');
  });

  it('still gives known-large and possibly-large bold text the 3:1 requirement', () => {
    const large = contrastFindings(textIn(`const x = <View className="bg-white"><Text className="text-blue-500 text-3xl">Hi</Text></View>;`), project(nativewind4));
    expect(large).toEqual([]);
    const bold = contrastFindings(textIn(`const x = <View className="bg-white"><Text className="text-blue-500 font-bold">Hi</Text></View>;`), project(nativewind4));
    expect(bold).toEqual([]);
  });

  it('does not pair a conditional layer of one element with the same id on another', () => {
    // Both elements allocate a `#1` set; they are unrelated, and pairing them
    // used to fabricate a black-on-black finding.
    const el = textIn(
      `const x = <View className={dark ? 'bg-black' : 'bg-white'}><Text className={dark ? 'text-white' : 'text-black'}>Hi</Text></View>;`,
    );
    const findings = contrastFindings(el, project(v4));
    // white-on-white and black-on-black are 1:1 and cannot happen: the two
    // branches are mutually exclusive across the two elements.
    expect(findings.every((f) => f.ratio > 1)).toBe(true);
  });

  it('stops at a component that may paint its own background', () => {
    const local = buildFileModel(parseSource(
      `const Card = () => <View className="bg-black" />;\nconst x = <Card><Text className="text-gray-800">Hi</Text></Card>;`,
      'test.tsx',
    ));
    const text = local.elements.find((e) => e.name === 'Text')!;
    expect(contrastFindings(text, project(v4))).toEqual([]);
  });

  it('anchors on the element own conditional background', () => {
    const el = firstElement(`const x = <Text className={active ? 'bg-yellow-200 text-yellow-300' : 'text-black'}>Hi</Text>;`);
    expect(contrastFindings(el, project(v4)).length).toBeGreaterThan(0);
  });
});

describe('background that is not the ancestor background', () => {
  it('abstains when an out-of-flow sibling paints over the ancestor', () => {
    // A hero image and its overlay sit between <main className="bg-white"> and
    // the caption; the text is not on white at all.
    const model = buildFileModel(parseSource(
      `const x = (
        <main className="relative bg-white">
          <div className="absolute inset-0"><img src="/hero.jpg" alt="" /></div>
          <div className="relative"><p className="text-white text-xl">Caption</p></div>
        </main>
      );`,
      'test.tsx',
    ));
    const caption = model.elements.find((e) => e.name === 'p')!;
    expect(contrastFindings(caption, project(v4))).toEqual([]);
  });

  it('still checks an ancestor background when every sibling is in flow', () => {
    const model = buildFileModel(parseSource(
      `const x = (
        <main className="bg-white">
          <div><img src="/logo.png" alt="" /></div>
          <div><p className="text-white text-xl">Caption</p></div>
        </main>
      );`,
      'test.tsx',
    ));
    const caption = model.elements.find((e) => e.name === 'p')!;
    expect(contrastFindings(caption, project(v4))).toHaveLength(1);
  });
});

describe('monorepo layouts', () => {
  function tempRepo(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-mono-'));
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    }
    return dir;
  }

  it('reads a pnpm workspace, which is declared outside package.json', () => {
    // react-native-reusables' layout: the root manifest holds only the
    // toolchain, so without pnpm-workspace.yaml the repo looks like a web app.
    const dir = tempRepo({
      'package.json': JSON.stringify({ name: 'root', devDependencies: { turbo: '^2', typescript: '^5' } }),
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n  - "packages/*"\n',
      'apps/showcase/package.json': JSON.stringify({ dependencies: { 'react-native': '0.81.0', nativewind: '^4.2.2' } }),
      'apps/docs/package.json': JSON.stringify({ dependencies: { next: '^15', react: '^19' } }),
      'packages/registry/package.json': JSON.stringify({ dependencies: { 'react-native': '0.81.0', nativewind: '^4.2.2' } }),
    });
    expect(detectPlatformDetailed(dir).mixed).toBe(true);
    expect(readProjectInfo(path.join(dir, 'apps/showcase')).platform).toBe('native');
    expect(readProjectInfo(path.join(dir, 'apps/showcase')).tailwind).toEqual({ preset: 'v3', rem: 14 });
    expect(readProjectInfo(path.join(dir, 'apps/docs')).platform).toBe('web');
  });
})

describe('overlays versus badges', () => {
  const build = (code: string, tag: string) => {
    const model = buildFileModel(parseSource(code, 'test.tsx'));
    return model.elements.find((e) => e.name === tag)!;
  };

  it('does not treat a corner badge as a backdrop', () => {
    // `absolute -top-1 -right-1` pins an icon to a corner; it covers nothing,
    // so the enclosing background is still what is behind the text.
    const el = build(`const x = (
      <View className="bg-slate-700">
        <View className="flex-1 relative">
          <View className="absolute z-10 -top-1 -right-1"><Ionicons name="checkmark" /></View>
          <Text className="text-gray-400 text-xs">v1.2.3</Text>
        </View>
      </View>
    );`, 'Text');
    expect(contrastFindings(el, project(v4))).toHaveLength(1);
  });

  it('treats a stretched overlay as a backdrop', () => {
    const el = build(`const x = (
      <View className="bg-slate-700">
        <View className="flex-1 relative">
          <View className="absolute inset-0 bg-black" />
          <Text className="text-gray-400 text-xs">v1.2.3</Text>
        </View>
      </View>
    );`, 'Text');
    expect(contrastFindings(el, project(v4))).toEqual([]);
  });
});

describe('an ancestor background that is not always the same', () => {
  const textIn = (code: string) => {
    const model = buildFileModel(parseSource(code, 'test.tsx'));
    return model.elements.find((e) => e.name === 'Text')!;
  };

  it("checks the ancestor's variant background against unvaried text", () => {
    // `active:bg-red-200` applies to this Text even though the Text itself
    // declares no `active:` layer.
    const found = contrastFindings(
      textIn(`const x = <Pressable className="bg-red-100 active:bg-red-200"><Text className="text-sm text-red-700">Delete</Text></Pressable>;`),
      project(v4),
    );
    expect(found.map((f) => f.layer)).toContain('active');
  });

  it("checks each background an ancestor can take when the text colour is fixed", () => {
    const found = contrastFindings(
      textIn(`const x = <View className={selected ? 'bg-slate-700' : 'bg-slate-900'}><Text className="text-gray-400 text-xs">v1</Text></View>;`),
      project(v4),
    );
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].message).toContain('#314158'); // slate-700
  });

  it('will not pair a conditional background with conditional text', () => {
    // Both are driven by `dark`, so bg-black never renders behind text-black.
    const found = contrastFindings(
      textIn(`const x = <View className={dark ? 'bg-black' : 'bg-white'}><Text className={dark ? 'text-white' : 'text-black'}>Hi</Text></View>;`),
      project(v4),
    );
    expect(found).toEqual([]);
  });
});

describe('CSS-variable themes (shadcn)', () => {
  function tempProject(files: Record<string, string>): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-vars-'));
    fs.mkdirSync(path.join(dir, '.git'), { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      fs.writeFileSync(path.join(dir, name), content);
    }
    return dir;
  }

  it('follows @theme inline → var(--x) → :root oklch (v4)', () => {
    const dir = tempProject({
      'package.json': JSON.stringify({ dependencies: { tailwindcss: '^4.1.0' } }),
      'app/globals.css': `@import "tailwindcss";
@theme inline {
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-ring: var(--ring);
}
:root {
  --primary: oklch(0.623 0.214 259.815);
  --primary-foreground: oklch(0.985 0 0);
}
.dark { --primary: oklch(0.9 0 0); }`,
    });
    const colors = readProjectInfo(dir).tailwind?.colors;
    expect(colors?.primary).toBe('oklch(0.623 0.214 259.815)');
    expect(colors?.['primary-foreground']).toBe('oklch(0.985 0 0)');
    expect(colors?.ring).toBeUndefined(); // no :root value — dropped, not guessed
    // And the class resolves end to end: blue-500-ish on near-white.
    const project: ProjectInfo = { dependencies: {}, platform: 'web', tailwind: { preset: 'v4', rem: 16, colors } };
    const el = buildFileModel(parseSource(
      `const x = <div className="bg-primary"><p className="text-primary-foreground">Save</p></div>;`, 'test.tsx',
    )).elements[1];
    const found = contrastFindings(el, project);
    expect(found).toHaveLength(1);
    expect(found[0].ratio).toBeCloseTo(3.7, 0);
  });

  it('follows hsl(var(--x)) in tailwind.config over a :root triple (v3)', () => {
    const dir = tempProject({
      'package.json': JSON.stringify({ dependencies: { tailwindcss: '^3.4.0' } }),
      'tailwind.config.js': `module.exports = { theme: { extend: { colors: {
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        muted: 'hsl(var(--muted) / <alpha-value>)',
      } } } };`,
      'styles/globals.css': `@tailwind base;
@layer base {
  :root { --primary: 222.2 47.4% 11.2%; --primary-foreground: 210 40% 98%; }
  .dark { --primary: 210 40% 98%; }
}`,
    });
    const colors = readProjectInfo(dir).tailwind?.colors;
    expect(colors?.primary).toBe('hsl(222.2 47.4% 11.2%)');
    expect(colors?.['primary-foreground']).toBe('hsl(210 40% 98%)');
    expect(parseColor(colors!.primary)).toEqual({ r: 15, g: 23, b: 42 });
  });

  it('drops a variable that two :root blocks define differently', () => {
    const dir = tempProject({
      'package.json': JSON.stringify({ dependencies: { tailwindcss: '^4.1.0' } }),
      'a.css': `@theme inline { --color-brand: var(--brand); }\n:root { --brand: #ff0000; }`,
      'b.css': `:root { --brand: #0000ff; }`,
    });
    expect(readProjectInfo(dir).tailwind?.colors?.brand).toBeUndefined();
  });
});

describe('symlinked source directories', () => {
  it('follows a link that stays inside the project, once, and ignores one that leaves it', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-outside-'));
    fs.writeFileSync(path.join(outside, 'Leak.tsx'), 'export const L = () => <img />;');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'react-a11y-links-'));
    fs.mkdirSync(path.join(dir, 'packages/ui'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'packages/ui/Button.tsx'), 'export const B = () => <button />;');
    fs.symlinkSync(path.join(dir, 'packages/ui'), path.join(dir, 'ui-link'));
    fs.symlinkSync(path.join(dir, 'packages/ui'), path.join(dir, 'ui-link-2'));
    fs.symlinkSync(outside, path.join(dir, 'outside-link'));
    const files = collectFiles(dir).map((f) => path.relative(dir, f));
    expect(files).toContain(path.join('packages', 'ui', 'Button.tsx'));
    expect(files.filter((f) => f.endsWith('Button.tsx'))).toHaveLength(1);
    expect(files.some((f) => f.includes('Leak'))).toBe(false);
  });
});
