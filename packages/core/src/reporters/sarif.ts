import type { Rule, ScanResult, Severity } from '../types.js';

const SARIF_LEVEL: Record<Severity, string> = {
  critical: 'error',
  serious: 'error',
  moderate: 'warning',
  minor: 'note',
};

export interface SarifToolInfo {
  name?: string;
  version?: string;
  informationUri?: string;
}

/** SARIF 2.1.0 output, compatible with GitHub code scanning. */
export function toSarif(result: ScanResult, rules: Rule[], tool: SarifToolInfo = {}): string {
  const usedRuleIds = new Set(result.diagnostics.map((d) => d.ruleId));
  const ruleDescriptors = rules
    .filter((r) => usedRuleIds.has(r.meta.id))
    .map((r) => ({
      id: r.meta.id,
      shortDescription: { text: r.meta.description },
      helpUri: r.meta.helpUrl,
      properties: {
        severity: r.meta.severity,
        wcag: r.meta.wcag,
        tags: ['accessibility', ...r.meta.wcag.map((sc) => `wcag-${sc.replace(/\./g, '')}`)],
      },
    }));
  const ruleIndex = new Map(ruleDescriptors.map((r, i) => [r.id, i]));

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: tool.name ?? 'react-a11y',
            ...(tool.version ? { version: tool.version } : {}),
            ...(tool.informationUri ? { informationUri: tool.informationUri } : {}),
            rules: ruleDescriptors,
          },
        },
        results: result.diagnostics.map((d) => ({
          ruleId: d.ruleId,
          ruleIndex: ruleIndex.get(d.ruleId),
          level: SARIF_LEVEL[d.severity],
          message: {
            text: `${d.message} (WCAG ${d.wcag.map((w) => `${w.sc} ${w.name}, Level ${w.level}`).join('; ')})`,
          },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: d.file },
                region: {
                  startLine: d.line,
                  startColumn: d.column,
                  endLine: d.endLine,
                  endColumn: d.endColumn,
                },
              },
            },
          ],
        })),
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}
