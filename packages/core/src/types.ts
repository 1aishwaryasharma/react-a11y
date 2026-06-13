export type Platform = 'web' | 'native';

export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

export type WcagLevel = 'A' | 'AA' | 'AAA';

export interface WcagRef {
  /** Success criterion number, e.g. "1.1.1" */
  sc: string;
  name: string;
  level: WcagLevel;
  /** WCAG version the criterion first appeared in, e.g. "2.0" or "2.2" */
  version: string;
  url: string;
}

/** A source replacement: [start, end) character offsets in the file. */
export interface Fix {
  start: number;
  end: number;
  replacement: string;
}

export interface Diagnostic {
  ruleId: string;
  message: string;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  wcag: WcagRef[];
  helpUrl?: string;
  /** Mechanical fix, applied by `--fix`. Only set when unambiguously correct. */
  fix?: Fix;
}

export interface RuleMeta {
  id: string;
  description: string;
  severity: Severity;
  platforms: Platform[];
  /** WCAG success criterion numbers, resolved against the WCAG 2.2 table. */
  wcag: string[];
  /**
   * True when the rule checks only a statically-decidable slice of its
   * criteria (e.g. contrast of inline literal styles). Coverage reporting
   * marks these criteria as partially automated.
   */
  partial?: boolean;
  /** True when at least some reports from this rule carry an autofix. */
  fixable?: boolean;
  helpUrl?: string;
}

export interface ReportDescriptor {
  el: import('./element.js').ElementNode;
  message: string;
  /** Per-report severity override (e.g. tiered touch-target sizes). */
  severity?: Severity;
  fix?: Fix;
}

/**
 * Cross-file analysis: `collect` sees every file's model during the scan,
 * `finalize` reports once the whole project has been seen. Used for checks
 * a single file cannot decide, like <label htmlFor> ↔ id resolution.
 */
export interface ProjectPass {
  collect(model: import('./element.js').FileModel, filename: string): void;
  finalize(): Diagnostic[];
}

export interface RuleContext {
  filename: string;
  platform: Platform;
  sourceFile: import('typescript').SourceFile;
  report(descriptor: ReportDescriptor): void;
}

export interface RuleVisitor {
  element?(el: import('./element.js').ElementNode): void;
}

export interface Rule {
  meta: RuleMeta;
  create(ctx: RuleContext): RuleVisitor;
}

export type RuleSetting = 'off' | Severity;

export interface A11yConfig {
  /** Per-rule overrides: "off" disables, a severity re-classifies. */
  rules?: Record<string, RuleSetting>;
  /** Glob patterns (relative to project root) to skip. */
  ignore?: string[];
  /** Force a platform instead of auto-detecting from package.json. */
  platform?: Platform;
}

export interface ScanResult {
  diagnostics: Diagnostic[];
  filesScanned: number;
  durationMs: number;
  platform: Platform;
  root: string;
}
