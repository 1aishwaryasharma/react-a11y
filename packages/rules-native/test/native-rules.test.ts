import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyze, applyFixes, scanProject } from '@react-a11y/core';
import { nativeRules, noOrientationLock } from '@react-a11y/rules-native';

const RN_IMPORT = `import { View, Text, Image, TextInput, Pressable, TouchableOpacity } from 'react-native';\n`;

function run(jsx: string): string[] {
  return analyze({
    code: `${RN_IMPORT}const x = ${jsx};`,
    filename: 'App.tsx',
    platform: 'native',
    rules: nativeRules,
  }).map((d) => d.ruleId);
}

describe('touchable-has-label', () => {
  it('flags empty unlabeled touchables', () => {
    expect(run(`<Pressable onPress={f} accessibilityRole="button" />`)).toContain('touchable-has-label');
  });
  it('accepts labels and children', () => {
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={f} />`)).not.toContain('touchable-has-label');
    expect(run(`<Pressable accessibilityRole="button" onPress={f}><Text>Save</Text></Pressable>`)).not.toContain('touchable-has-label');
    expect(run(`<Pressable aria-label="Close" accessibilityRole="button" onPress={f} />`)).not.toContain('touchable-has-label');
  });
});

describe('touchable-has-role', () => {
  it('flags missing accessibilityRole', () => {
    expect(run(`<TouchableOpacity onPress={f}><Text>Go</Text></TouchableOpacity>`)).toContain('touchable-has-role');
    expect(run(`<TouchableOpacity accessibilityRole="button" onPress={f}><Text>Go</Text></TouchableOpacity>`)).not.toContain('touchable-has-role');
  });
  it('skips wrappers imported from other modules', () => {
    const diags = analyze({
      code: `import { Pressable } from './my-design-system';\nconst x = <Pressable onPress={f} />;`,
      filename: 'App.tsx',
      platform: 'native',
      rules: nativeRules,
    });
    expect(diags).toHaveLength(0);
  });
});

describe('no-nested-touchables', () => {
  it('flags touchables inside touchables', () => {
    expect(
      run(`<Pressable accessibilityRole="button" onPress={f}><View><TouchableOpacity accessibilityRole="button" onPress={g}><Text>Inner</Text></TouchableOpacity></View></Pressable>`),
    ).toContain('no-nested-touchables');
  });
});

describe('touch-target-size', () => {
  it('tiers by WCAG 2.5.8 / 2.5.5', () => {
    const tiny = analyze({
      code: `${RN_IMPORT}const x = <Pressable accessibilityRole="button" accessibilityLabel="x" style={{ width: 20, height: 20 }} onPress={f} />;`,
      filename: 'App.tsx', platform: 'native', rules: nativeRules,
    }).find((d) => d.ruleId === 'touch-target-size');
    expect(tiny?.severity).toBe('serious');
    const small = analyze({
      code: `${RN_IMPORT}const x = <Pressable accessibilityRole="button" accessibilityLabel="x" style={{ width: 32, height: 32 }} onPress={f} />;`,
      filename: 'App.tsx', platform: 'native', rules: nativeRules,
    }).find((d) => d.ruleId === 'touch-target-size');
    expect(small?.severity).toBe('moderate');
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="x" style={{ width: 44, height: 44 }} onPress={f} />`)).not.toContain('touch-target-size');
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="x" style={{ width: 20, height: 20 }} hitSlop={12} onPress={f} />`)).not.toContain('touch-target-size');
  });
});

describe('component rules', () => {
  it('image-has-label', () => {
    expect(run(`<Image source={pic} />`)).toContain('image-has-label');
    expect(run(`<Image source={pic} accessibilityLabel="Team photo" />`)).not.toContain('image-has-label');
    expect(run(`<Image source={pic} accessible={false} />`)).not.toContain('image-has-label');
    expect(run(`<Image source={pic} alt="" />`)).not.toContain('image-has-label');
  });
  it('textinput-has-label', () => {
    expect(run(`<TextInput placeholder="Email" />`)).toContain('textinput-has-label');
    expect(run(`<TextInput accessibilityLabel="Email" />`)).not.toContain('textinput-has-label');
  });
  it('valid-accessibility-role', () => {
    expect(run(`<View accessibilityRole="pushbutton" />`)).toContain('valid-accessibility-role');
    expect(run(`<View accessibilityRole="button" accessibilityLabel="x" />`)).not.toContain('valid-accessibility-role');
  });
  it('switch-has-label and modal-has-request-close', () => {
    const RN2 = `import { Switch, Modal, Text } from 'react-native';\n`;
    const runX = (jsx: string) =>
      analyze({ code: `${RN2}const x = ${jsx};`, filename: 'App.tsx', platform: 'native', rules: nativeRules }).map((d) => d.ruleId);
    expect(runX(`<Switch value={on} onValueChange={set} />`)).toContain('switch-has-label');
    expect(runX(`<Switch value={on} onValueChange={set} accessibilityLabel="Dark mode" />`)).not.toContain('switch-has-label');
    expect(runX(`<Modal visible={open}><Text>Hi</Text></Modal>`)).toContain('modal-has-request-close');
    expect(runX(`<Modal visible={open} onRequestClose={close}><Text>Hi</Text></Modal>`)).not.toContain('modal-has-request-close');
  });
  it('accessibility-state-valid', () => {
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="x" accessibilityState={{ pressed: true }} onPress={f} />`)).toContain('accessibility-state-valid');
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="x" accessibilityState={{ disabled: true }} onPress={f} />`)).not.toContain('accessibility-state-valid');
    expect(run(`<View accessibilityValue={{ current: 3 }} />`)).toContain('accessibility-state-valid');
    expect(run(`<View accessibilityValue={{ now: 3, min: 0, max: 10 }} />`)).not.toContain('accessibility-state-valid');
  });
  it('live-region-valid', () => {
    expect(run(`<View accessibilityLiveRegion="loud" />`)).toContain('live-region-valid');
    expect(run(`<View accessibilityLiveRegion="polite" />`)).not.toContain('live-region-valid');
    expect(run(`<View aria-live="polite" />`)).not.toContain('live-region-valid');
  });
  it('no-hidden-interactive', () => {
    expect(run(`<Pressable accessibilityElementsHidden onPress={f}><Text>Buy</Text></Pressable>`)).toContain('no-hidden-interactive');
    expect(run(`<View accessibilityElementsHidden />`)).not.toContain('no-hidden-interactive');
  });
  it('color-contrast on RN inline styles', () => {
    expect(run(`<Text style={{ color: '#9aa0a6', backgroundColor: '#ffffff', fontSize: 13 }}>Hint</Text>`)).toContain('color-contrast');
    expect(run(`<Text style={{ color: '#111111', backgroundColor: '#ffffff' }}>Body</Text>`)).not.toContain('color-contrast');
    expect(run(`<Text style={styles.hint}>Dynamic</Text>`)).not.toContain('color-contrast');
  });
  it('valid-accessibility-props catches typos', () => {
    const diags = analyze({
      code: `${RN_IMPORT}const x = <View accessibilitylabel="oops" />;`,
      filename: 'App.tsx', platform: 'native', rules: nativeRules,
    });
    expect(diags.some((d) => d.ruleId === 'valid-accessibility-props' && d.message.includes('accessibilityLabel'))).toBe(true);
  });
  it('no-orientation-lock across config formats', () => {
    const project = (files: Record<string, string>) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ra11y-'));
      for (const [rel, content] of Object.entries(files)) {
        const full = path.join(root, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
      }
      return root;
    };

    const locked = noOrientationLock.projectCheck!(
      project({ 'app.json': JSON.stringify({ expo: { name: 'x', orientation: 'portrait' } }, null, 2) }),
    );
    expect(locked).toHaveLength(1);
    expect(locked[0]).toMatchObject({ ruleId: 'no-orientation-lock', file: 'app.json' });
    expect(locked[0].line).toBeGreaterThan(1); // points at the "orientation" key, not the file start

    expect(noOrientationLock.projectCheck!(
      project({ 'app.json': JSON.stringify({ expo: { name: 'x', orientation: 'default' } }) }),
    )).toHaveLength(0);

    expect(noOrientationLock.projectCheck!(
      project({ 'app.config.ts': `export default { name: 'x', orientation: 'landscape' };` }),
    )).toHaveLength(1);

    expect(noOrientationLock.projectCheck!(
      project({ 'android/app/src/main/AndroidManifest.xml': `<activity android:screenOrientation="portrait" />` }),
    )).toHaveLength(1);

    expect(noOrientationLock.projectCheck!(
      project({
        'ios/MyApp/Info.plist': `<key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string></array>`,
      }),
    )).toHaveLength(1);

    expect(noOrientationLock.projectCheck!(
      project({
        'ios/MyApp/Info.plist': `<key>UISupportedInterfaceOrientations</key><array><string>UIInterfaceOrientationPortrait</string><string>UIInterfaceOrientationLandscapeLeft</string></array>`,
      }),
    )).toHaveLength(0);

    // scanProject runs projectCheck automatically and honors "off"
    const root = project({
      'app.json': JSON.stringify({ expo: { orientation: 'portrait' } }),
      'App.tsx': `export default () => null;`,
    });
    const viaScan = scanProject({ root, rules: nativeRules, platform: 'native' });
    expect(viaScan.diagnostics.some((d) => d.ruleId === 'no-orientation-lock')).toBe(true);
    const off = scanProject({
      root, rules: nativeRules, platform: 'native',
      config: { rules: { 'no-orientation-lock': 'off' } },
    });
    expect(off.diagnostics.some((d) => d.ruleId === 'no-orientation-lock')).toBe(false);
  });

  it('autofixes miscapitalized accessibility props', () => {
    const code = `${RN_IMPORT}const x = <View accessibilitylabel="profile" />;`;
    const diags = analyze({ code, filename: 'App.tsx', platform: 'native', rules: nativeRules });
    const fixes = diags.filter((d) => d.fix).map((d) => d.fix!);
    expect(fixes).toHaveLength(1);
    const { output } = applyFixes(code, fixes);
    expect(output).toContain(`accessibilityLabel="profile"`);
  });
});

describe('focus and reading order', () => {
  it('accessible-grouping-hides-interactive', () => {
    expect(run(`<View accessible={true}><Pressable accessibilityRole="button" onPress={f}><Text>Go</Text></Pressable></View>`)).toContain('accessible-grouping-hides-interactive');
    expect(run(`<View accessible={true}><TextInput accessibilityLabel="Email" /></View>`)).toContain('accessible-grouping-hides-interactive');
    // grouping non-interactive text is the intended use — not flagged
    expect(run(`<View accessible={true}><Text>Name</Text><Text>Detail</Text></View>`)).not.toContain('accessible-grouping-hides-interactive');
    // not grouped — children stay individually focusable
    expect(run(`<View><Pressable accessibilityRole="button" onPress={f}><Text>Go</Text></Pressable></View>`)).not.toContain('accessible-grouping-hides-interactive');
  });

  it('label-needs-accessible', () => {
    expect(run(`<View accessibilityLabel="Rating 4 of 5"><Text>****</Text></View>`)).toContain('label-needs-accessible');
    expect(run(`<View accessibilityState={{ selected: true }}><Text>Tab</Text></View>`)).toContain('label-needs-accessible');
    expect(run(`<View accessible={true} accessibilityLabel="Rating 4 of 5"><Text>****</Text></View>`)).not.toContain('label-needs-accessible');
    expect(run(`<View accessible={isA11y} accessibilityLabel="x"><Text>y</Text></View>`)).not.toContain('label-needs-accessible');
    // Pressable is accessible by default, so its label is not dropped
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={f} />`)).not.toContain('label-needs-accessible');
  });
});

describe('action and platform validation', () => {
  it('accessibility-actions-handled', () => {
    expect(run(`<View accessibilityActions={[{ name: 'activate' }]} />`)).toContain('accessibility-actions-handled');
    expect(run(`<Pressable accessibilityRole="button" accessibilityLabel="x" onAccessibilityAction={h} onPress={f} />`)).toContain('accessibility-actions-handled');
    expect(run(`<View accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={h} />`)).not.toContain('accessibility-actions-handled');
  });

  it('valid-important-for-accessibility', () => {
    expect(run(`<View importantForAccessibility="false" />`)).toContain('valid-important-for-accessibility');
    expect(run(`<View importantForAccessibility="auto" />`)).not.toContain('valid-important-for-accessibility');
  });

  it('hidden-cross-platform', () => {
    expect(run(`<View accessibilityElementsHidden={true}><Text>x</Text></View>`)).toContain('hidden-cross-platform');
    expect(run(`<View importantForAccessibility="no-hide-descendants"><Text>x</Text></View>`)).toContain('hidden-cross-platform');
    expect(run(`<View accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants"><Text>x</Text></View>`)).not.toContain('hidden-cross-platform');
    expect(run(`<View aria-hidden={true} accessibilityElementsHidden={true}><Text>x</Text></View>`)).not.toContain('hidden-cross-platform');
  });
});
