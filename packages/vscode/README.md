# react-a11y for VS Code

Inline WCAG 2.2 accessibility diagnostics for React, Next.js and React
Native, powered by the [react-a11y](https://github.com/1aishwaryasharma/react-a11y)
static analyzer — no browser, no build, results as you type.

## Features

- **Live diagnostics** in JS/JSX/TS/TSX, debounced as you type, with
  severity mapped to VS Code (critical/serious → error, moderate → warning,
  minor → info). Every finding links its rule ID to the docs and cites the
  WCAG success criteria in the message.
- **Quick fixes (💡)** for mechanically-safe issues: ARIA attribute casing,
  deprecated ARIA attributes, redundant roles, misplaced `scope`,
  `accessKey`, and miscapitalized React Native `accessibility*` props.
- **Fix all** via the `react-a11y: Fix all auto-fixable issues` command or
  `source.fixAll.reactA11y` in `editor.codeActionsOnSave`.
- **Platform auto-detection** per workspace folder (React Native/Expo →
  native rule pack), and full support for `react-a11y.config.json` rule
  overrides and ignore globs.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `react-a11y.enable` | `true` | Toggle diagnostics. |
| `react-a11y.platform` | `auto` | `web`, `native`, or auto-detect from package.json. |

Fix on save:

```json
"editor.codeActionsOnSave": { "source.fixAll.reactA11y": "explicit" }
```

## Development

```sh
npm install            # at the repo root
npm run build -w react-a11y-vscode
```

Then open the repo in VS Code and press **F5** ("Run react-a11y extension")
to launch an Extension Development Host. To build an installable `.vsix`:

```sh
npx @vscode/vsce package --no-dependencies   # in packages/vscode
code --install-extension react-a11y-vscode-0.1.0.vsix
```

(`--no-dependencies` is correct: the build bundles everything with esbuild.)
