import type { ScanResult } from '../types.js';

export function toJson(result: ScanResult): string {
  return JSON.stringify(
    {
      platform: result.platform,
      filesScanned: result.filesScanned,
      durationMs: result.durationMs,
      issueCount: result.diagnostics.length,
      issues: result.diagnostics,
    },
    null,
    2,
  );
}
