import { describe, expect, it } from 'vitest';
import { analyze, type ProjectInfo } from '@aishware/react-a11y-core';
import { nativeRules } from '@aishware/react-a11y-rules-native';

const RN_IMPORT = `import { View, Text, Image, TextInput, Pressable, Switch, TouchableOpacity, Animated } from 'react-native';\n`;

const nativewind: ProjectInfo = { dependencies: { 'react-native': '^0.79.0', nativewind: '^4.1.0' }, tailwind: { preset: 'v3', rem: 14 } };
const uniwind: ProjectInfo = { dependencies: { 'react-native': '^0.81.0', uniwind: '^1.0.0' }, tailwind: { preset: 'v4', rem: 16 } };

function run(jsx: string, project: ProjectInfo | null = nativewind, extraImports = '') {
  return analyze({
    code: `${RN_IMPORT}${extraImports}const x = ${jsx};`,
    filename: 'App.tsx',
    platform: 'native',
    rules: nativeRules,
    project: project ?? undefined, // null = no project facts at all
  });
}
const ids = (jsx: string, project?: ProjectInfo | null, extraImports?: string) => run(jsx, project, extraImports).map((d) => d.ruleId);

describe('touch-target-size with Tailwind classes', () => {
  it('reads h-/w-/size- utilities with the binding rem base', () => {
    // NativeWind v4: h-6 = 21px → below the 24px floor; on Uniwind (16px rem) it is 24px.
    const nw = run(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-6 w-6" onPress={f} />`);
    expect(nw.find((d) => d.ruleId === 'touch-target-size')?.severity).toBe('serious');
    const uw = run(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="size-6" onPress={f} />`, uniwind);
    expect(uw.find((d) => d.ruleId === 'touch-target-size')?.severity).toBe('moderate');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-11 w-11" onPress={f} />`, uniwind)).not.toContain('touch-target-size');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-8 w-8 min-h-11 min-w-11" onPress={f} />`, uniwind)).not.toContain('touch-target-size');
  });
  it('flags a single known small dimension and honours cn() / twrnc / inline overrides', () => {
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-4 w-full" onPress={f} />`)).toContain('touch-target-size');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className={cn('h-5 w-5', className)} onPress={f} />`)).toContain('touch-target-size');
    expect(ids('<Pressable accessibilityRole="button" accessibilityLabel="x" style={tw`h-5 w-5`} onPress={f} />')).toContain('touch-target-size');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-5 w-5" style={{ height: 48, width: 48 }} onPress={f} />`)).not.toContain('touch-target-size');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-5 w-5" style={styles.btn} onPress={f} />`)).not.toContain('touch-target-size');
  });
  it('ignores className when no Tailwind binding is installed', () => {
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-5 w-5" onPress={f} />`, { dependencies: {} })).not.toContain('touch-target-size');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="x" className="h-5 w-5" onPress={f} />`, null)).not.toContain('touch-target-size');
  });
});

describe('color-contrast with Tailwind classes', () => {
  it('checks text against the enclosing View background, per dark: variant', () => {
    const diags = run(`<View className="bg-white dark:bg-gray-900"><Text className="text-gray-400 dark:text-gray-600">Muted</Text></View>`, uniwind)
      .filter((d) => d.ruleId === 'color-contrast');
    expect(diags).toHaveLength(2);
    expect(diags.some((d) => d.message.includes('`dark:` variant'))).toBe(true);
    expect(ids(`<View className="bg-white"><Text className="text-gray-700">Body</Text></View>`, uniwind)).not.toContain('color-contrast');
  });
  it('accounts for large text and custom theme colors', () => {
    expect(ids(`<View className="bg-white"><Text className="text-3xl text-gray-500">Title</Text></View>`, uniwind)).not.toContain('color-contrast');
    const themed: ProjectInfo = { ...uniwind, tailwind: { preset: 'v4', rem: 16, colors: { brand: '#e5e7eb' } } };
    expect(ids(`<View className="bg-white"><Text className="text-brand">Brand</Text></View>`, themed)).toContain('color-contrast');
    expect(ids(`<View className="bg-white"><Text className="text-brand">Brand</Text></View>`, uniwind)).not.toContain('color-contrast');
  });
});

describe('text-fixed-height', () => {
  it('flags fixed heights from classes and inline styles', () => {
    expect(ids(`<Text className="h-6">Clipped</Text>`)).toContain('text-fixed-height');
    expect(ids(`<Text style={{ height: 20 }}>Clipped</Text>`, null)).toContain('text-fixed-height');
    expect(ids(`<Text className="min-h-6">Grows</Text>`)).not.toContain('text-fixed-height');
    expect(ids(`<View className="h-6"><Text>Ok</Text></View>`)).not.toContain('text-fixed-height');
  });
});

describe('touchable-has-label with icon-only content', () => {
  it('does not count unlabeled icons or images as a name', () => {
    const icons = `import { Ionicons } from '@expo/vector-icons';\n`;
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Ionicons name="close" size={24} /></Pressable>`, nativewind, icons)).toContain('touchable-has-label');
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Ionicons name="close" size={24} accessibilityLabel="Close" /></Pressable>`, nativewind, icons)).not.toContain('touchable-has-label');
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Image source={pic} /></Pressable>`)).toContain('touchable-has-label');
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Image source={pic} alt="Heart" /></Pressable>`)).not.toContain('touchable-has-label');
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><View><Text>Go</Text></View></Pressable>`)).not.toContain('touchable-has-label');
    // Unknown components still get the benefit of the doubt.
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Avatar /></Pressable>`, nativewind, `import { Avatar } from './ui';\n`)).not.toContain('touchable-has-label');
  });
});

describe('no-nested-touchables with native controls', () => {
  it('flags Switch, TextInput and pressable Text inside a touchable', () => {
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Text>Row</Text><Switch accessibilityLabel="On" value={v} /></Pressable>`)).toContain('no-nested-touchables');
    expect(ids(`<Pressable accessibilityRole="button" onPress={f}><Text>Row</Text><Text onPress={g} accessibilityRole="link">More</Text></Pressable>`)).toContain('no-nested-touchables');
    expect(ids(`<View><Pressable accessibilityRole="button" onPress={f}><Text>Row</Text></Pressable><Switch accessibilityLabel="On" value={v} /></View>`)).not.toContain('no-nested-touchables');
  });
});

describe('text-onpress-has-role', () => {
  it('requires a role on pressable Text before React Native 0.84', () => {
    expect(ids(`<Text onPress={f}>Terms</Text>`)).toContain('text-onpress-has-role');
    expect(ids(`<Text onPress={f} accessibilityRole="link">Terms</Text>`)).not.toContain('text-onpress-has-role');
    expect(ids(`<Text onPress={f}>Terms</Text>`, { dependencies: { 'react-native': '0.84.0' } })).not.toContain('text-onpress-has-role');
    expect(ids(`<Text onPress={f}>Terms</Text>`, null)).toContain('text-onpress-has-role');
  });
});

describe('live-region-android-only', () => {
  it('flags live regions with no iOS announcement in the file', () => {
    expect(ids(`<Text accessibilityLiveRegion="polite">{status}</Text>`)).toContain('live-region-android-only');
    expect(ids(`<Text aria-live="assertive">{status}</Text>`)).toContain('live-region-android-only');
    expect(ids(`<Text accessibilityLiveRegion="none">{status}</Text>`)).not.toContain('live-region-android-only');
    expect(ids(`<Text accessibilityLiveRegion="polite">{status}</Text>`, nativewind, `AccessibilityInfo.announceForAccessibility(status);\n`)).not.toContain('live-region-android-only');
  });
});

describe('accessibility-language-valid and label-not-all-caps', () => {
  it('validates BCP 47 tags', () => {
    expect(ids(`<Text accessibilityLanguage="english">Bonjour</Text>`)).toContain('accessibility-language-valid');
    expect(ids(`<Text accessibilityLanguage="fr">Bonjour</Text>`)).not.toContain('accessibility-language-valid');
    expect(ids(`<Text accessibilityLanguage="pt-BR">Olá</Text>`)).not.toContain('accessibility-language-valid');
  });
  it('flags shouting labels but not acronyms', () => {
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="ADD TO CART" onPress={f} />`)).toContain('label-not-all-caps');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="Add to cart" onPress={f} />`)).not.toContain('label-not-all-caps');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="PDF" onPress={f} />`)).not.toContain('label-not-all-caps');
    expect(ids(`<Pressable accessibilityRole="button" accessibilityLabel="HTML export" onPress={f} />`)).not.toContain('label-not-all-caps');
  });
});

describe('animation-reduce-motion', () => {
  function source(code: string, filename = 'useSpin.ts') {
    return analyze({ code, filename, platform: 'native', rules: nativeRules, project: nativewind });
  }
  it('flags Animated.loop with no Reduce Motion check, even in plain modules', () => {
    const diags = source(`import { Animated } from 'react-native';\nexport const spin = (v) => Animated.loop(Animated.timing(v, { toValue: 1, duration: 1000 })).start();`);
    expect(diags.map((d) => d.ruleId)).toEqual(['animation-reduce-motion']);
    expect(diags[0].line).toBe(2);
  });
  it('accepts loops guarded by the setting or with finite iterations', () => {
    expect(source(`import { Animated, AccessibilityInfo } from 'react-native';\nAccessibilityInfo.isReduceMotionEnabled().then((on) => { if (!on) Animated.loop(a).start(); });`)).toEqual([]);
    expect(source(`import { Animated } from 'react-native';\nAnimated.loop(a, { iterations: 3 }).start();`)).toEqual([]);
  });
  it('flags Reanimated opt-outs on infinite loops and the global config', () => {
    expect(source(`import { withRepeat, withTiming, ReduceMotion } from 'react-native-reanimated';\nsv.value = withRepeat(withTiming(1), -1, true, undefined, ReduceMotion.Never);`).map((d) => d.ruleId)).toEqual(['animation-reduce-motion']);
    expect(source(`import { withRepeat, withTiming } from 'react-native-reanimated';\nsv.value = withRepeat(withTiming(1), -1, true);`)).toEqual([]);
    const global = source(`import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';\nconst x = <ReducedMotionConfig mode={ReduceMotion.Never} />;`, 'App.tsx');
    expect(global[0]?.severity).toBe('serious');
  });
});

describe('touch-target-size through cva() variant tables', () => {
  const BUTTON = `
import { cva } from 'class-variance-authority';
const buttonVariants = cva('flex-row items-center rounded-md', {
  variants: {
    variant: { default: 'bg-primary', ghost: '' },
    size: { default: 'h-10 px-4', sm: 'h-9 px-3', lg: 'h-11 px-6', icon: 'h-10 w-10' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
`;
  const nw16: ProjectInfo = { ...nativewind, tailwind: { preset: 'v3', rem: 16 } };

  it('reports each undersized variant once, anchored on its definition', () => {
    const diags = run(
      `<Pressable accessibilityRole="button" accessibilityLabel="x" className={cn(buttonVariants({ variant, size, className }), className)} onPress={f} />`,
      nw16, BUTTON,
    ).filter((d) => d.ruleId === 'touch-target-size');
    const labels = diags.map((d) => /in the \`([^\`]+)\` variant/.exec(d.message)?.[1]).sort();
    // h-10 = 40pt, h-9 = 36pt: below 44. h-11 = 44 passes. w-10 h-10 icon = 40×40.
    expect(labels).toEqual(['size.default', 'size.icon', 'size.sm']);
    const icon = diags.find((d) => d.message.includes('size.icon'))!;
    expect(icon.message).toContain('40×40pt');
    expect(icon.severity).toBe('moderate');
    // Anchored on the variant literal in the cva() call, not on the <Pressable>.
    expect(icon.line).toBeLessThan(diags[0].line + 1);
    expect(icon.line).toBe(7);
  });

  it('honours a literal choice at the call site', () => {
    const lg = ids(
      `<Pressable accessibilityRole="button" accessibilityLabel="x" className={buttonVariants({ size: 'lg' })} onPress={f} />`,
      nw16, BUTTON,
    );
    expect(lg).not.toContain('touch-target-size');
    const sm = run(
      `<Pressable accessibilityRole="button" accessibilityLabel="x" className={buttonVariants({ size: 'sm' })} onPress={f} />`,
      nw16, BUTTON,
    ).filter((d) => d.ruleId === 'touch-target-size');
    expect(sm).toHaveLength(1);
    expect(sm[0].message).not.toContain('variant'); // unconditional: reported on the element itself
  });

  it('falls back to defaultVariants when the call omits a group', () => {
    const diags = run(
      `<Pressable accessibilityRole="button" accessibilityLabel="x" className={buttonVariants()} onPress={f} />`,
      nw16, BUTTON,
    ).filter((d) => d.ruleId === 'touch-target-size');
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('40-tallpt'.replace('pt', '')); // h-10 default
  });

  it('does not report the same variant twice in one file', () => {
    const diags = run(
      `<><Pressable accessibilityRole="button" accessibilityLabel="a" className={buttonVariants({ size })} onPress={f} /><Pressable accessibilityRole="button" accessibilityLabel="b" className={buttonVariants({ size })} onPress={f} /></>`,
      nw16, BUTTON,
    ).filter((d) => d.ruleId === 'touch-target-size');
    expect(diags.filter((d) => d.message.includes('size.icon'))).toHaveLength(1);
  });

  it('reads a tailwind-variants tv() table too', () => {
    const TV = `
import { tv } from 'tailwind-variants';
const chip = tv({ base: 'rounded-full', variants: { size: { xs: 'h-5 w-5', md: 'h-11 w-11' } } });
`;
    const diags = run(
      `<Pressable accessibilityRole="button" accessibilityLabel="x" className={chip({ size })} onPress={f} />`,
      nw16, TV,
    ).filter((d) => d.ruleId === 'touch-target-size');
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('size.xs');
    expect(diags[0].severity).toBe('serious'); // 20pt < 24
  });
});
