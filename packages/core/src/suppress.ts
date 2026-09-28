/**
 * Inline suppression comments, spelled like ESLint's so they read naturally
 * next to jsx-a11y and react-native-a11y directives:
 *
 *   // react-a11y-disable-next-line target-size -- icon has hitSlop
 *   <Pressable … />
 *   {/* react-a11y-disable-next-line *\/}
 *   <img … />   // react-a11y-disable-line color-contrast
 *   /* react-a11y-disable heading-order *\/ … /* react-a11y-enable *\/
 *
 * No rule list means every rule. Text after `--` is a free-form reason.
 */

const DIRECTIVE = /(?:\/\/|\/\*)\s*react-a11y-(disable-next-line|disable-line|disable|enable)\b((?:(?!\*\/)[^\n])*)/g;

const ALL = '*';

interface Range {
  rule: string;
  /** First suppressed line (1-based, inclusive). */
  start: number;
  /** Line the region was re-enabled on (exclusive); Infinity when never. */
  end: number;
}

export interface Suppressions {
  /** True when a directive covers `ruleId` on `line` (1-based). */
  covers(ruleId: string, line: number): boolean;
}

function ruleList(rest: string): string[] {
  const body = rest.split(/\s--(?:\s|$)/)[0];
  const rules = body.split(/[\s,]+/).filter(Boolean);
  return rules.length > 0 ? rules : [ALL];
}

/**
 * Read the suppression directives in a file. Undefined when there are none,
 * which is the common case and lets callers skip filtering entirely.
 */
export function parseSuppressions(text: string): Suppressions | undefined {
  if (!text.includes('react-a11y-')) return undefined;
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const lineOf = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const perLine = new Map<number, Set<string>>();
  const ranges: Range[] = [];
  const open = new Map<string, number>();
  let found = false;

  for (const match of text.matchAll(DIRECTIVE)) {
    found = true;
    const [, kind, rest] = match;
    const line = lineOf(match.index);
    const rules = ruleList(rest);
    if (kind === 'disable-next-line' || kind === 'disable-line') {
      const target = kind === 'disable-line' ? line : line + 1;
      const set = perLine.get(target) ?? new Set<string>();
      for (const rule of rules) set.add(rule);
      perLine.set(target, set);
    } else if (kind === 'disable') {
      for (const rule of rules) if (!open.has(rule)) open.set(rule, line);
    } else {
      const closing = rules[0] === ALL ? [...open.keys()] : rules;
      for (const rule of closing) {
        const start = open.get(rule);
        if (start === undefined) continue;
        ranges.push({ rule, start, end: line });
        open.delete(rule);
      }
    }
  }
  if (!found) return undefined;
  for (const [rule, start] of open) ranges.push({ rule, start, end: Infinity });

  return {
    covers(ruleId, line) {
      const set = perLine.get(line);
      if (set && (set.has(ALL) || set.has(ruleId))) return true;
      return ranges.some((r) => (r.rule === ALL || r.rule === ruleId) && line >= r.start && line < r.end);
    },
  };
}
