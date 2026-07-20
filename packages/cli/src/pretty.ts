import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import type { Diagnostic, ScanResult, Severity } from '@aishware/react-a11y-core';
import { SEVERITY_ORDER } from '@aishware/react-a11y-core';

const SEVERITY_COLOR: Record<Severity, (s: string) => string> = {
  critical: (s) => pc.bold(pc.red(s)),
  serious: (s) => pc.red(s),
  moderate: (s) => pc.yellow(s),
  minor: (s) => pc.blue(s),
};

/** Render repository-controlled text without letting it emit terminal commands. */
export function sanitizeTerminalText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, (char) => {
    return `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`;
  });
}

function snippet(root: string, diag: Diagnostic): string | null {
  try {
    const lines = fs.readFileSync(path.join(root, diag.file), 'utf8').split('\n');
    const line = lines[diag.line - 1];
    if (line === undefined) return null;
    const safeLine = sanitizeTerminalText(line);
    const trimmed = safeLine.length > 120 ? `${safeLine.slice(0, 117)}...` : safeLine;
    return `${pc.dim(`${String(diag.line).padStart(5)} |`)} ${trimmed}`;
  } catch {
    return null;
  }
}

export function printPretty(result: ScanResult, version: string): void {
  const { diagnostics } = result;
  const out: string[] = [];
  out.push(
    `${pc.bold('react-a11y')} ${pc.dim(`v${version}`)} — platform: ${pc.cyan(result.platform)} — ` +
      `${result.filesScanned} files scanned in ${result.durationMs}ms`,
  );
  out.push('');

  if (diagnostics.length === 0) {
    out.push(pc.green('✔ No accessibility issues found.'));
    console.log(out.join('\n'));
    return;
  }

  const byFile = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const list = byFile.get(d.file) ?? [];
    list.push(d);
    byFile.set(d.file, list);
  }

  for (const [file, diags] of byFile) {
    out.push(pc.bold(pc.underline(sanitizeTerminalText(file))));
    for (const d of diags) {
      const pos = pc.dim(`${d.line}:${d.column}`.padEnd(8));
      const sev = SEVERITY_COLOR[d.severity](d.severity.padEnd(8));
      out.push(`  ${pos} ${sev} ${pc.cyan(d.ruleId)}`);
      out.push(`           ${sanitizeTerminalText(d.message)}`);
      const snip = snippet(result.root, d);
      if (snip) out.push(`           ${snip}`);
      const wcag = d.wcag
        .map((w) => `${w.sc} ${w.name} (Level ${w.level}${w.version === '2.2' ? ', new in WCAG 2.2' : ''})`)
        .join('; ');
      out.push(`           ${pc.dim(`WCAG ${wcag}`)}`);
    }
    out.push('');
  }

  const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const d of diagnostics) counts[d.severity]++;
  const parts = (Object.keys(SEVERITY_ORDER) as Severity[])
    .sort((a, b) => SEVERITY_ORDER[b] - SEVERITY_ORDER[a])
    .filter((s) => counts[s] > 0)
    .map((s) => SEVERITY_COLOR[s](`${counts[s]} ${s}`));
  out.push(
    pc.bold(`✖ ${diagnostics.length} issue${diagnostics.length === 1 ? '' : 's'}`) +
      ` (${parts.join(', ')}) in ${byFile.size} file${byFile.size === 1 ? '' : 's'}`,
  );
  console.log(out.join('\n'));
}
