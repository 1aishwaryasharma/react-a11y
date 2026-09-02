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

/** Bindings we resolve classes for, most specific first, for the run banner. */
const BINDINGS = ['nativewind', 'uniwind', 'twrnc', 'tailwind-react-native-classnames', 'react-native-css', 'tailwind-rn', 'tailwindcss'];

/**
 * What the scan decided about Tailwind. Printing it makes a wrong palette, a
 * wrong rem base or class resolution being off entirely visible in the output
 * instead of showing up as quietly missing findings.
 */
function describeTailwind(result: ScanResult): string {
  const project = result.project;
  if (!project) return '';
  const tailwind = project.tailwind;
  if (!tailwind) return ` — ${pc.dim('tailwind: off')}`;
  const name = BINDINGS.find((b) => b in project.dependencies);
  const version = name ? project.dependencies[name] : undefined;
  const binding = name ? `${name}${version ? ` ${version}` : ''}` : 'configured';
  const colors = tailwind.colors ? `, ${Object.keys(tailwind.colors).length} theme colors` : '';
  // In a monorepo the binding lives in a package under the root, so name it.
  const scope = project.packageDir && path.resolve(project.packageDir) !== path.resolve(result.root)
    ? ` in ${path.relative(result.root, project.packageDir).split(path.sep).join('/')}`
    : '';
  return ` — ${pc.dim(`tailwind: ${binding} (rem ${tailwind.rem}, palette ${tailwind.preset}${colors})${scope}`)}`;
}

/** One line per reason, so a skipped file is never silently dropped. */
function describeSkipped(result: ScanResult): string[] {
  if (!result.skipped?.length) return [];
  const byReason = new Map<string, number>();
  for (const { reason } of result.skipped) byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
  return [...byReason].map(([reason, count]) =>
    pc.dim(`  skipped ${count} file${count === 1 ? '' : 's'}: ${sanitizeTerminalText(reason)}`));
}

export function printPretty(result: ScanResult, version: string): void {
  const { diagnostics } = result;
  const out: string[] = [];
  const mix = result.filesByPlatform;
  const platform = mix
    ? `${pc.cyan('native + web')} ${pc.dim(`(${mix.native} native, ${mix.web} web)`)}`
    : pc.cyan(result.platform);
  out.push(
    `${pc.bold('react-a11y')} ${pc.dim(`v${version}`)} — platform: ${platform}` +
      `${describeTailwind(result)} — ${result.filesScanned} files scanned in ${result.durationMs}ms`,
  );
  out.push(...describeSkipped(result));
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

  // A design token that fails contrast fails everywhere it is used; say so
  // once so the fix is read as "change the token", not "change 158 elements".
  const pairs = new Map<string, number>();
  for (const d of diagnostics) {
    if (d.ruleId !== 'color-contrast') continue;
    const pair = /Contrast between (\S+) and (\S+) is/.exec(d.message);
    if (pair) pairs.set(`${pair[1]} on ${pair[2]}`, (pairs.get(`${pair[1]} on ${pair[2]}`) ?? 0) + 1);
  }
  for (const [pair, n] of [...pairs].sort((a, b) => b[1] - a[1]).slice(0, 3)) {
    if (n < 5) break;
    out.push(pc.dim(`  ${n} color-contrast findings share the pair ${sanitizeTerminalText(pair)} — likely one theme token`));
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
