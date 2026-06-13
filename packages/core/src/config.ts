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

// Placeholders keep the globstar expansions safe from the later `*`/`?` passes.
const GLOBSTAR_SLASH = '\u0000';
const GLOBSTAR = '\u0001';

/** Minimal glob support: `*` (within a segment) and `**` (across segments). */
export function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, GLOBSTAR_SLASH)
    .replace(/\*\*/g, GLOBSTAR)
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replaceAll(GLOBSTAR_SLASH, '(?:.*/)?')
    .replaceAll(GLOBSTAR, '.*');
  return new RegExp(`^${escaped}$`);
}
