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
}

export interface RuleMeta {
  id: string;
  description: string;
  severity: Severity;
  platforms: Platform[];
  /** WCAG success criterion numbers, resolved against the WCAG 2.2 table. */
  wcag: string[];
  helpUrl?: string;
}

export interface ReportDescriptor {
  el: import('./element.js').ElementNode;
  message: string;
  /** Per-report severity override (e.g. tiered touch-target sizes). */
  severity?: Severity;
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
