import fs from 'node:fs';
import path from 'node:path';
import type { A11yConfig } from './types.js';

const CONFIG_FILES = ['react-a11y.config.json', '.react-a11yrc.json'];

const SEVERITIES = new Set(['critical', 'serious', 'moderate', 'minor']);

/**
 * Reject a config that would otherwise be accepted and then quietly ignored —
 * `{"platform": "ios"}` used to parse fine and run the web pack.
 */
export function validateConfig(value: unknown, source: string): A11yConfig {
  const bad = (message: string): never => {
    throw new Error(`${source}: ${message}`);
  };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) bad('expected a JSON object');
  const config = value as Record<string, unknown>;
  for (const key of Object.keys(config)) {
    if (!['rules', 'ignore', 'platform', 'tailwind'].includes(key)) {
      bad(`unknown key "${key}" (expected rules, ignore, platform or tailwind)`);
    }
  }
  if (config.platform !== undefined && config.platform !== 'web' && config.platform !== 'native') {
    bad(`invalid platform ${JSON.stringify(config.platform)} (expected "web" or "native")`);
  }
  if (config.ignore !== undefined
    && (!Array.isArray(config.ignore) || config.ignore.some((g) => typeof g !== 'string'))) {
    bad('"ignore" must be an array of glob strings');
  }
  if (config.rules !== undefined) {
    if (config.rules === null || typeof config.rules !== 'object' || Array.isArray(config.rules)) {
      bad('"rules" must be an object of ruleId → "off" | severity');
    }
    for (const [id, setting] of Object.entries(config.rules as Record<string, unknown>)) {
      if (setting !== 'off' && !SEVERITIES.has(setting as string)) {
        bad(`invalid setting ${JSON.stringify(setting)} for rule "${id}" (expected "off" or a severity)`);
      }
    }
  }
  const tailwind = config.tailwind;
  if (tailwind !== undefined && tailwind !== false) {
    if (tailwind === null || typeof tailwind !== 'object' || Array.isArray(tailwind)) {
      bad('"tailwind" must be false or an object');
    }
    const tw = tailwind as Record<string, unknown>;
    if (tw.preset !== undefined && tw.preset !== 'v3' && tw.preset !== 'v4') {
      bad(`invalid tailwind.preset ${JSON.stringify(tw.preset)} (expected "v3" or "v4")`);
    }
    if (tw.rem !== undefined && (typeof tw.rem !== 'number' || !(tw.rem > 0))) {
      bad('tailwind.rem must be a positive number');
    }
  }
  return config as A11yConfig;
}

/** Read and validate the project config. Throws with the offending file named. */
export function loadConfig(root: string): A11yConfig {
  for (const file of CONFIG_FILES) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (error) {
      throw new Error(`${file}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    }
    return validateConfig(parsed, file);
  }
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg['react-a11y'] && typeof pkg['react-a11y'] === 'object') {
        return validateConfig(pkg['react-a11y'], 'package.json "react-a11y"');
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('package.json')) throw error;
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
