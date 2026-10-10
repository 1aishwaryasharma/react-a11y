import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const read = (path: string) => fs.readFileSync(root(path), 'utf8');
const version = (JSON.parse(read('packages/cli/package.json')) as { version: string }).version;

// The release workflow publishes the tag's version, so every pin that users
// copy must name that version or it points at nothing on npm.
describe('release versions', () => {
  it('moves every package in lockstep', () => {
    for (const pkg of ['package.json', 'packages/core', 'packages/rules-web', 'packages/rules-native', 'packages/vscode', 'packages/webstorm']) {
      const file = pkg.endsWith('.json') ? pkg : `${pkg}/package.json`;
      expect((JSON.parse(read(file)) as { version: string }).version, file).toBe(version);
    }
    expect(read('packages/webstorm/build.gradle.kts')).toContain(`version = "${version}"`);
  });

  it('pins the action and the README to the released version', () => {
    expect(read('action.yml')).toMatch(new RegExp(`default: ${version.replaceAll('.', '\\.')}\\n`));
    expect(read('README.md')).toContain(`1aishwaryasharma/react-a11y@v${version}`);
  });

  it('has a changelog entry for the released version', () => {
    expect(read('CHANGELOG.md')).toContain(`## [${version}]`);
  });
});
