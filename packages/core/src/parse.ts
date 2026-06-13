import ts from 'typescript';

function scriptKindFor(filename: string): ts.ScriptKind {
  if (filename.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filename.endsWith('.mts') || filename.endsWith('.cts')) return ts.ScriptKind.TS;
  if (filename.endsWith('.ts')) return ts.ScriptKind.TS;
  // .js / .jsx / .mjs / .cjs — parse permissively so JSX in plain JS works.
  return ts.ScriptKind.JSX;
}

export function parseSource(code: string, filename: string): ts.SourceFile {
  return ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, scriptKindFor(filename));
}
