import * as vscode from 'vscode';
import path from 'node:path';
import {
  analyze,
  applyFixes,
  detectPlatform,
  globToRegExp,
  loadConfig,
  type A11yConfig,
  type Diagnostic as A11yDiagnostic,
  type Fix,
  type Platform,
  type Severity,
} from '@react-a11y/core';
import { webRules } from '@react-a11y/rules-web';
import { nativeRules } from '@react-a11y/rules-native';

const LANGUAGES = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];
const DEBOUNCE_MS = 300;

const SEVERITY_MAP: Record<Severity, vscode.DiagnosticSeverity> = {
  critical: vscode.DiagnosticSeverity.Error,
  serious: vscode.DiagnosticSeverity.Error,
  moderate: vscode.DiagnosticSeverity.Warning,
  minor: vscode.DiagnosticSeverity.Information,
};

interface FolderInfo {
  platform: Platform;
  config: A11yConfig;
  ignore: RegExp[];
}

/** VS Code diagnostic carrying the react-a11y fix for the quick-fix provider. */
interface A11yVsDiagnostic extends vscode.Diagnostic {
  a11yFix?: Fix;
}

const folderCache = new Map<string, FolderInfo>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let collection: vscode.DiagnosticCollection;

function folderInfo(doc: vscode.TextDocument): FolderInfo | null {
  const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
  if (!folder) {
    // Standalone file: lint as web with defaults.
    return { platform: 'web', config: {}, ignore: [] };
  }
  const root = folder.uri.fsPath;
  let info = folderCache.get(root);
  if (!info) {
    const config = loadConfig(root);
    const platformSetting = vscode.workspace.getConfiguration('react-a11y').get<string>('platform', 'auto');
    const platform: Platform =
      platformSetting === 'web' || platformSetting === 'native'
        ? platformSetting
        : config.platform ?? detectPlatform(root);
    info = { platform, config, ignore: (config.ignore ?? []).map(globToRegExp) };
    folderCache.set(root, info);
  }
  return info;
}

function toVsDiagnostic(d: A11yDiagnostic): A11yVsDiagnostic {
  const range = new vscode.Range(d.line - 1, d.column - 1, d.endLine - 1, d.endColumn - 1);
  const wcag = d.wcag.map((w) => `${w.sc} ${w.name} (${w.level})`).join('; ');
  const diag = new vscode.Diagnostic(range, `${d.message} [WCAG ${wcag}]`, SEVERITY_MAP[d.severity]) as A11yVsDiagnostic;
  diag.source = 'react-a11y';
  diag.code = d.helpUrl ? { value: d.ruleId, target: vscode.Uri.parse(d.helpUrl) } : d.ruleId;
  if (d.fix) diag.a11yFix = d.fix;
  return diag;
}

function lint(doc: vscode.TextDocument): void {
  if (!LANGUAGES.includes(doc.languageId)) return;
  if (!vscode.workspace.getConfiguration('react-a11y').get<boolean>('enable', true)) {
    collection.delete(doc.uri);
    return;
  }
  const info = folderInfo(doc);
  if (!info) return;

  const folder = vscode.workspace.getWorkspaceFolder(doc.uri);
  if (folder) {
    const rel = path.relative(folder.uri.fsPath, doc.uri.fsPath).split(path.sep).join('/');
    if (info.ignore.some((re) => re.test(rel))) {
      collection.delete(doc.uri);
      return;
    }
  }

  const rules = info.platform === 'native' ? nativeRules : webRules;
  const diagnostics = analyze({
    code: doc.getText(),
    filename: doc.fileName,
    platform: info.platform,
    rules,
    ruleSettings: info.config.rules,
  });
  collection.set(doc.uri, diagnostics.map(toVsDiagnostic));
}

function lintDebounced(doc: vscode.TextDocument): void {
  const key = doc.uri.toString();
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    lint(doc);
  }, DEBOUNCE_MS));
}

function lintAllOpen(): void {
  for (const doc of vscode.workspace.textDocuments) lint(doc);
}

class A11yCodeActionProvider implements vscode.CodeActionProvider {
  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [vscode.CodeActionKind.QuickFix, vscode.CodeActionKind.SourceFixAll],
  };

  provideCodeActions(
    doc: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    for (const diag of context.diagnostics as A11yVsDiagnostic[]) {
      if (diag.source !== 'react-a11y' || !diag.a11yFix) continue;
      const ruleId = typeof diag.code === 'object' ? String(diag.code.value) : String(diag.code);
      const action = new vscode.CodeAction(`Fix: ${ruleId}`, vscode.CodeActionKind.QuickFix);
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(
        doc.uri,
        new vscode.Range(doc.positionAt(diag.a11yFix.start), doc.positionAt(diag.a11yFix.end)),
        diag.a11yFix.replacement,
      );
      action.diagnostics = [diag];
      action.isPreferred = true;
      actions.push(action);
    }

    const all = (collection.get(doc.uri) ?? []) as readonly A11yVsDiagnostic[];
    if (all.some((d) => d.a11yFix)) {
      const fixAll = new vscode.CodeAction('Fix all react-a11y issues', vscode.CodeActionKind.SourceFixAll.append('reactA11y'));
      fixAll.command = { command: 'react-a11y.fixAll', title: 'Fix all react-a11y issues' };
      actions.push(fixAll);
    }
    return actions;
  }
}

async function fixAllInActiveEditor(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const doc = editor.document;
  const fixes = ((collection.get(doc.uri) ?? []) as readonly A11yVsDiagnostic[])
    .map((d) => d.a11yFix)
    .filter((f): f is Fix => f !== undefined);
  if (fixes.length === 0) {
    vscode.window.setStatusBarMessage('react-a11y: no auto-fixable issues', 3000);
    return;
  }
  const source = doc.getText();
  const { output, applied } = applyFixes(source, fixes);
  const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(source.length));
  await editor.edit((edit) => edit.replace(fullRange, output));
  vscode.window.setStatusBarMessage(`react-a11y: fixed ${applied} issue${applied === 1 ? '' : 's'}`, 3000);
  lint(doc);
}

export function activate(context: vscode.ExtensionContext): void {
  collection = vscode.languages.createDiagnosticCollection('react-a11y');
  context.subscriptions.push(collection);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(lint),
    vscode.workspace.onDidChangeTextDocument((e) => lintDebounced(e.document)),
    vscode.workspace.onDidCloseTextDocument((doc) => collection.delete(doc.uri)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('react-a11y')) {
        folderCache.clear();
        lintAllOpen();
      }
    }),
    vscode.commands.registerCommand('react-a11y.fixAll', fixAllInActiveEditor),
    vscode.languages.registerCodeActionsProvider(
      LANGUAGES.map((language) => ({ language })),
      new A11yCodeActionProvider(),
      A11yCodeActionProvider.metadata,
    ),
  );

  // Project config or dependencies changing can flip platform/rule settings.
  const watcher = vscode.workspace.createFileSystemWatcher(
    '**/{react-a11y.config.json,.react-a11yrc.json,package.json}',
  );
  const invalidate = () => {
    folderCache.clear();
    lintAllOpen();
  };
  watcher.onDidChange(invalidate);
  watcher.onDidCreate(invalidate);
  watcher.onDidDelete(invalidate);
  context.subscriptions.push(watcher);

  lintAllOpen();
}

export function deactivate(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}
