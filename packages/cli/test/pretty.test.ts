import { describe, expect, it } from 'vitest';
import { sanitizeTerminalText } from '../src/pretty.js';

describe('pretty output security', () => {
  it('renders terminal control characters visibly instead of executing them', () => {
    expect(sanitizeTerminalText('file\u001b]8;;https://example.test\u0007name\n')).toBe(
      'file\\x1b]8;;https://example.test\\x07name\\x0a',
    );
  });
});
