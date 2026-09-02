import { buildFileModel, type FileModel } from './element.js';
import { parseSource } from './parse.js';
import { resolveWcag } from './wcag.js';
import type { ProjectInfo } from './project.js';
import type { Diagnostic, Platform, Rule, RuleSetting } from './types.js';

export interface AnalyzeOptions {
  code: string;
  filename: string;
  platform: Platform;
  rules: Rule[];
  ruleSettings?: Record<string, RuleSetting>;
  /** Project facts (dependencies, Tailwind resolution). See `readProjectInfo`. */
  project?: ProjectInfo;
}

export type AnalyzeModelOptions = Omit<AnalyzeOptions, 'code'>;

/** Run rules over an already-built file model (lets callers reuse the parse). */
export function analyzeModel(model: FileModel, options: AnalyzeModelOptions): Diagnostic[] {
  const { filename, platform, rules, ruleSettings = {}, project } = options;
  const diagnostics: Diagnostic[] = [];
  const sf = model.sourceFile;

  for (const rule of rules) {
    if (!rule.meta.platforms.includes(platform)) continue;
    const setting = ruleSettings[rule.meta.id];
    if (setting === 'off') continue;

    const wcag = resolveWcag(rule.meta.wcag);
    const visitor = rule.create({
      filename,
      platform,
      sourceFile: sf,
      project,
      report({ el, node, message, severity, fix }) {
        let loc = el?.loc;
        if (!loc && node) {
          const start = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          const end = sf.getLineAndCharacterOfPosition(node.getEnd());
          loc = {
            line: start.line + 1,
            column: start.character + 1,
            endLine: end.line + 1,
            endColumn: end.character + 1,
          };
        }
        if (!loc) throw new Error(`rule ${rule.meta.id} reported without an element or node`);
        diagnostics.push({
          ruleId: rule.meta.id,
          message,
          severity: setting ?? severity ?? rule.meta.severity,
          file: filename,
          line: loc.line,
          column: loc.column,
          endLine: loc.endLine,
          endColumn: loc.endColumn,
          wcag,
          helpUrl: rule.meta.helpUrl,
          ...(fix ? { fix } : {}),
        });
      },
    });

    if (visitor.sourceFile) visitor.sourceFile(sf);
    if (visitor.element && model.elements.length > 0) {
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
