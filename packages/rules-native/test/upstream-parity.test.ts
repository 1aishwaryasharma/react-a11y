import fs from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { RN_ROLES } from '@aish/react-a11y-rules-native';

const require = createRequire(import.meta.url);

/**
 * The accessibilityRole values eslint-plugin-react-native-a11y accepts, read
 * from its source (it can't be imported without the full ESLint toolchain).
 * Compound values like "img button" are not single roles and are skipped.
 */
function upstreamRoles(): string[] {
  const file = require.resolve('eslint-plugin-react-native-a11y/lib/rules/has-valid-accessibility-role.js');
  const src = fs.readFileSync(file, 'utf8');
  const match = /validValues\s*=\s*\[([^\]]*)\]/.exec(src);
  if (!match) throw new Error('could not find validValues in eslint-plugin-react-native-a11y');
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((role) => !role.includes(' '));
}

// Drift detector: when React Native (mirrored by the plugin) adds an
// accessibilityRole, this fails so we know to add it to RN_ROLES. Renovate keeps
// the eslint-plugin-react-native-a11y devDependency current, which trips this.
describe('upstream parity: React Native accessibilityRole', () => {
  it('RN_ROLES covers every role eslint-plugin-react-native-a11y accepts', () => {
    const upstream = upstreamRoles();
    expect(upstream.length).toBeGreaterThan(20); // sanity: the list actually parsed
    const missing = upstream.filter((role) => !RN_ROLES.has(role));
    expect(missing).toEqual([]); // if non-empty, port these into RN_ROLES (components.ts)
  });
});
