import { buildFileModel, type FileModel } from './element.js';
import { parseSource } from './parse.js';
import { resolveWcag } from './wcag.js';
import type { Diagnostic, Platform, Rule, RuleSetting } from './types.js';

export interface AnalyzeOptions {
  code: string;
  filename: string;
  platform: Platform;
  rules: Rule[];
  ruleSettings?: Record<string, RuleSetting>;
}

export type AnalyzeModelOptions = Omit<AnalyzeOptions, 'code'>;

/** Run rules over an already-built file model (lets callers reuse the parse). */
export function analyzeModel(model: FileModel, options: AnalyzeModelOptions): Diagnostic[] {
  const { filename, platform, rules, ruleSettings = {} } = options;
  if (model.elements.length === 0) return [];

  const diagnostics: Diagnostic[] = [];

  for (const rule of rules) {
    if (!rule.meta.platforms.includes(platform)) continue;
    const setting = ruleSettings[rule.meta.id];
    if (setting === 'off') continue;

    const wcag = resolveWcag(rule.meta.wcag);
    const visitor = rule.create({
      filename,
      platform,
      sourceFile: model.sourceFile,
      report({ el, message, severity, fix }) {
        diagnostics.push({
          ruleId: rule.meta.id,
          message,
          severity: setting ?? severity ?? rule.meta.severity,
          file: filename,
          line: el.loc.line,
          column: el.loc.column,
          endLine: el.loc.endLine,
          endColumn: el.loc.endColumn,
          wcag,
          helpUrl: rule.meta.helpUrl,
          ...(fix ? { fix } : {}),
        });
      },
    });

    if (visitor.element) {
      for (const el of model.elements) visitor.element(el);
    }
  }

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column || a.ruleId.localeCompare(b.ruleId));
  return diagnostics;
}

/**
 * Analyze a single file. Pure and synchronous — this is the unit both the CLI
 * and any editor/CI integration build on.
 */
export function analyze(options: AnalyzeOptions): Diagnostic[] {
  const model = buildFileModel(parseSource(options.code, options.filename));
  return analyzeModel(model, options);
}
