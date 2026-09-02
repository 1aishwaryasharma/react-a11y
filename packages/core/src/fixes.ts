import type { ElementNode } from './element.js';
import type { Fix } from './types.js';

/** Fix that deletes an attribute (including its leading whitespace). */
export function fixRemoveAttr(el: ElementNode, name: string): Fix | undefined {
  const node = el.attrs.get(name)?.attrNode;
  if (!node) return undefined;
  return { start: node.getFullStart(), end: node.getEnd(), replacement: '' };
}

/**
 * Fix that renames an attribute, keeping its value untouched. Returns
 * undefined when the destination name is already on the element: renaming
 * onto it would produce `role="dialog" role="dialog"`, which is a TS17001
 * parse error, not a fix.
 */
export function fixRenameAttr(el: ElementNode, name: string, newName: string): Fix | undefined {
  const node = el.attrs.get(name)?.attrNode;
  if (!node || el.attrs.has(newName)) return undefined;
  return { start: node.name.getStart(), end: node.name.getEnd(), replacement: newName };
}

/**
 * Apply fixes to a source string. Fixes are applied last-to-first so offsets
 * stay valid; overlapping fixes are skipped (re-run to converge).
 */
export function applyFixes(source: string, fixes: Fix[]): { output: string; applied: number } {
  const sorted = [...fixes].sort((a, b) => b.start - a.start || b.end - a.end);
  let output = source;
  let applied = 0;
  let lastStart = Infinity;
  for (const fix of sorted) {
    if (fix.end > lastStart || fix.start > fix.end) continue;
    if (fix.start < 0 || fix.end > source.length) continue;
    output = output.slice(0, fix.start) + fix.replacement + output.slice(fix.end);
    lastStart = fix.start;
    applied++;
  }
  return { output, applied };
}
