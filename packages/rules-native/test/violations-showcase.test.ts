import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanProject } from '@aishware/react-a11y-core';
import { nativeRules } from '@aishware/react-a11y-rules-native';

const showcaseRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../examples/native-violations',
);

describe('native-violations showcase', () => {
  it('every native rule fires at least once', () => {
    const { diagnostics } = scanProject({
      root: showcaseRoot,
      platform: 'native',
      rules: nativeRules,
    });
    const fired = new Set(diagnostics.map((diagnostic) => diagnostic.ruleId));
    const missing = nativeRules
      .map((rule) => rule.meta.id)
      .filter((id) => !fired.has(id));
    expect(missing).toEqual([]);
  });
});
