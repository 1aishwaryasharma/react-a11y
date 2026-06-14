import fs from 'node:fs';

export interface PackageMeta {
  name?: string;
  version?: string;
  homepage?: string;
}

/**
 * Read a package's own metadata so names, versions and URLs live in one
 * place (package.json) instead of being duplicated in source.
 *
 * Call with `new URL('../package.json', import.meta.url)` — resolves
 * correctly from both src/ (tests) and dist/ (builds).
 */
export function readPackageMeta(packageJsonUrl: URL | string): PackageMeta {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonUrl, 'utf8'));
    return { name: pkg.name, version: pkg.version, homepage: pkg.homepage };
  } catch {
    return {};
  }
}

/**
 * Like readPackageMeta, but safe when `import.meta.url` is unavailable
 * (e.g. the package was bundled to CJS for a VS Code extension) — the URL
 * construction itself is guarded, returning {} instead of throwing at
 * module load.
 */
export function readOwnPackageMeta(importMetaUrl: string | undefined, rel = '../package.json'): PackageMeta {
  try {
    return readPackageMeta(new URL(rel, importMetaUrl));
  } catch {
    return {};
  }
}
