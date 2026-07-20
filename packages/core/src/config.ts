import fs from 'node:fs';
import path from 'node:path';
import type { A11yConfig } from './types.js';

const CONFIG_FILES = ['react-a11y.config.json', '.react-a11yrc.json'];

export function loadConfig(root: string): A11yConfig {
  for (const file of CONFIG_FILES) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) {
      return JSON.parse(fs.readFileSync(full, 'utf8')) as A11yConfig;
    }
  }
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg['react-a11y'] && typeof pkg['react-a11y'] === 'object') {
        return pkg['react-a11y'] as A11yConfig;
      }
    } catch {
      // malformed package.json — fall through to defaults
    }
  }
  return {};
}

const MAX_GLOB_LENGTH = 1024;
const MAX_GLOB_INPUT_LENGTH = 16_384;

type GlobToken =
  | { kind: 'literal'; value: string }
  | { kind: 'star' | 'globstar' | 'globstar-slash' | 'question' };

function tokenizeGlob(glob: string): GlobToken[] {
  if (glob.length > MAX_GLOB_LENGTH) {
    throw new Error(`ignore glob exceeds ${MAX_GLOB_LENGTH} characters`);
  }

  const tokens: GlobToken[] = [];
  for (let i = 0; i < glob.length;) {
    if (glob.startsWith('**/', i)) {
      tokens.push({ kind: 'globstar-slash' });
      i += 3;
    } else if (glob.startsWith('**', i)) {
      tokens.push({ kind: 'globstar' });
      i += 2;
    } else if (glob[i] === '*') {
      tokens.push({ kind: 'star' });
      i++;
    } else if (glob[i] === '?') {
      tokens.push({ kind: 'question' });
      i++;
    } else {
      tokens.push({ kind: 'literal', value: glob[i] });
      i++;
    }
  }
  return tokens;
}

/**
 * Full-string glob matching in O(pattern length × path length). A dynamic
 * program avoids the catastrophic backtracking produced by translating
 * attacker-controlled config globs into chains of greedy regular expressions.
 */
function matchesGlob(tokens: GlobToken[], input: string): boolean {
  if (input.length > MAX_GLOB_INPUT_LENGTH) return false;
  const length = input.length;
  const nextSlash = new Int32Array(length + 1);
  let nearestSlash = -1;
  nextSlash[length] = -1;
  for (let i = length - 1; i >= 0; i--) {
    if (input[i] === '/') nearestSlash = i;
    nextSlash[i] = nearestSlash;
  }

  let next = new Uint8Array(length + 1);
  next[length] = 1;

  for (let tokenIndex = tokens.length - 1; tokenIndex >= 0; tokenIndex--) {
    const token = tokens[tokenIndex];
    const current = new Uint8Array(length + 1);
    for (let inputIndex = length; inputIndex >= 0; inputIndex--) {
      switch (token.kind) {
        case 'literal':
          current[inputIndex] = Number(
            inputIndex < length && input[inputIndex] === token.value && next[inputIndex + 1] === 1,
          );
          break;
        case 'question':
          current[inputIndex] = Number(
            inputIndex < length && input[inputIndex] !== '/' && next[inputIndex + 1] === 1,
          );
          break;
        case 'star':
          current[inputIndex] = Number(
            next[inputIndex] === 1 ||
              (inputIndex < length && input[inputIndex] !== '/' && current[inputIndex + 1] === 1),
          );
          break;
        case 'globstar':
          current[inputIndex] = Number(
            next[inputIndex] === 1 || (inputIndex < length && current[inputIndex + 1] === 1),
          );
          break;
        case 'globstar-slash': {
          const slash = nextSlash[inputIndex];
          current[inputIndex] = Number(
            next[inputIndex] === 1 || (slash !== -1 && current[slash + 1] === 1),
          );
          break;
        }
      }
    }
    next = current;
  }

  return next[0] === 1;
}

/**
 * RegExp-compatible wrapper for the public API. `exec()` uses the bounded
 * matcher above, so `.test()`, `.match()` and other RegExp consumers stay safe.
 */
class GlobRegExp extends RegExp {
  readonly #tokens: GlobToken[];

  constructor(glob: string) {
    // The real match is performed by exec(); the base expression must fail
    // closed if a caller deliberately bypasses this override.
    super('(?!)');
    this.#tokens = tokenizeGlob(glob);
  }

  override exec(input: string): RegExpExecArray | null {
    this.lastIndex = 0;
    if (!matchesGlob(this.#tokens, input)) return null;
    const result = [input] as RegExpExecArray;
    result.index = 0;
    result.input = input;
    result.groups = undefined;
    return result;
  }
}

/** Minimal glob support: `*` (within a segment) and `**` (across segments). */
export function globToRegExp(glob: string): RegExp {
  return new GlobRegExp(glob);
}
