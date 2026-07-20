import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const actionPath = fileURLToPath(new URL('../../../action.yml', import.meta.url));

describe('composite action security', () => {
  it('passes action inputs through the environment instead of Bash source', () => {
    const action = fs.readFileSync(actionPath, 'utf8');
    const shellCommands = action
      .split('\n')
      .filter((line) => line.includes('npx --yes') || line.trimStart().startsWith('--'))
      .join('\n');

    expect(shellCommands).not.toContain('${{ inputs.');
    expect(shellCommands).toContain('"${REACT_A11Y_PATH}"');
    expect(action).not.toContain('default: latest');
  });
});
