import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Diagnostic, ScanResult } from './types.js';

/**
 * A baseline records the findings a project already has, so CI can fail on
 * new ones only and an existing codebase can adopt the scanner without first
 * fixing everything. Findings are matched by fingerprint — rule, message and
 * the trimmed source line — never by line number, so code moving around a
 * file does not bring a known finding back.
 */
export interface Baseline {
  version: 1;
  entries: BaselineEntry[];
}

export interface BaselineEntry {
  file: string;
  ruleId: string;
  fingerprint: string;
  /** How many identical findings the file had; one more is new. */
  count: number;
}

/** What applying a baseline did, for the report. */
export interface BaselineSummary {
  file: string;
  /** Findings hidden because the baseline already records them. */
  suppressed: number;
  /** Baseline entries no longer found; undefined on a partial scan, which cannot tell. */
  stale?: number;
}

function lineReader(root: string): (d: Diagnostic) => string {
  const cache = new Map<string, string[]>();
  return (d) => {
    let lines = cache.get(d.file);
    if (!lines) {
      try {
        lines = fs.readFileSync(path.join(root, d.file), 'utf8').split('\n');
      } catch {
        lines = [];
      }
      cache.set(d.file, lines);
    }
    return (lines[d.line - 1] ?? '').trim();
  };
}

function keyOf(file: string, ruleId: string, fingerprint: string): string {
  return `${file}\0${ruleId}\0${fingerprint}`;
}

function fingerprintOf(d: Diagnostic, line: string): string {
  return crypto.createHash('sha256').update(`${d.ruleId}\0${d.message}\0${line}`).digest('hex').slice(0, 16);
}

/** Record every finding in `result`. */
export function createBaseline(result: ScanResult): Baseline {
  const read = lineReader(result.root);
  const counts = new Map<string, BaselineEntry>();
  for (const d of result.diagnostics) {
    const fingerprint = fingerprintOf(d, read(d));
    const key = keyOf(d.file, d.ruleId, fingerprint);
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { file: d.file, ruleId: d.ruleId, fingerprint, count: 1 });
  }
  const entries = [...counts.values()].sort((a, b) =>
    a.file.localeCompare(b.file) || a.ruleId.localeCompare(b.ruleId) || a.fingerprint.localeCompare(b.fingerprint));
  return { version: 1, entries };
}

/**
 * Drop the findings the baseline records. On a partial scan (`--changed`,
 * `--since`) stale entries are not counted: files outside the scan would all
 * look fixed.
 */
export function applyBaseline(
  result: ScanResult,
  baseline: Baseline,
  file: string,
  options: { partial?: boolean } = {},
): ScanResult {
  const read = lineReader(result.root);
  const remaining = new Map<string, number>();
  for (const e of baseline.entries) remaining.set(keyOf(e.file, e.ruleId, e.fingerprint), e.count);
  const kept: Diagnostic[] = [];
  let suppressed = 0;
  for (const d of result.diagnostics) {
    const key = keyOf(d.file, d.ruleId, fingerprintOf(d, read(d)));
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      suppressed++;
    } else {
      kept.push(d);
    }
  }
  const stale = options.partial ? undefined : [...remaining.values()].reduce((sum, n) => sum + n, 0);
  return { ...result, diagnostics: kept, baseline: { file, suppressed, ...(stale !== undefined ? { stale } : {}) } };
}

/** Read and validate a baseline file. Throws with the file named. */
export function readBaseline(file: string): Baseline {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const b = parsed as Partial<Baseline> | null;
  const valid = b !== null && typeof b === 'object' && b.version === 1 && Array.isArray(b.entries)
    && b.entries.every((e) => e && typeof e.file === 'string' && typeof e.ruleId === 'string'
      && typeof e.fingerprint === 'string' && Number.isInteger(e.count) && e.count > 0);
  if (!valid) throw new Error(`${file}: not a react-a11y baseline (expected {"version": 1, "entries": [...]})`);
  return b as Baseline;
}

export function writeBaseline(file: string, baseline: Baseline): void {
  fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
}
