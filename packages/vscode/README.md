# react-a11y for VS Code

Inline WCAG 2.2 accessibility diagnostics for React and React Native,
powered by the [react-a11y](https://github.com/1aishwaryasharma/react-a11y)
static analyzer. No browser or application build is required, and analysis
runs locally as you type.

## Features

- **Live diagnostics** in JS/JSX/TS/TSX, debounced as you type, with
  severity mapped to VS Code (critical/serious → error, moderate → warning,
  minor → info). Every finding links its rule ID to the docs and cites the
  WCAG success criteria in the message.
- **Quick fixes (💡)** for mechanically-safe issues — e.g. miscapitalized
  React Native `accessibility*` props.
- **Fix all** via the `react-a11y: Fix all auto-fixable issues` command or
  `source.fixAll.reactA11y` in `editor.codeActionsOnSave`.
- **Platform auto-detection** per workspace folder (React Native/Expo →
  native rule pack), and full support for `react-a11y.config.json` rule
  overrides and ignore globs.
- **Project-wide checks** through the `react-a11y: Scan workspace` command.

The extension bundles 22 web rules and 31 React Native rules, and resolves Tailwind / NativeWind / Uniwind classes for the style-dependent ones. Static analysis
cannot reproduce a rendered app, assistive technology, or device settings;
use the
[manual accessibility testing guide](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/manual-testing.md)
alongside it.

## Getting started

Open a React or React Native project and edit a JavaScript or TypeScript file.
Diagnostics appear in the editor and Problems panel. Use the lightbulb menu for
safe quick fixes, or run `react-a11y: Scan workspace` from the Command Palette
for project-wide checks.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `react-a11y.enable` | `true` | Toggle diagnostics. |
| `react-a11y.platform` | `auto` | `web`, `native`, or auto-detect from package.json. |

Fix on save:

```json
"editor.codeActionsOnSave": { "source.fixAll.reactA11y": "explicit" }
```

## Privacy

Analysis runs entirely on your machine. The extension does not upload source
code or require an account.

## Issues

Report bugs and false positives on
[GitHub](https://github.com/1aishwaryasharma/react-a11y/issues).

## Development

```sh
npm install            # at the repo root
npm run typecheck -w packages/vscode
npm run build -w packages/vscode
```

Then open the repo in VS Code and press **F5** ("Run react-a11y extension")
to launch an Extension Development Host. To build an installable `.vsix`:

```sh
npm run package -w packages/vscode
code --install-extension packages/vscode/react-a11y-0.5.0.vsix
```

(`--no-dependencies` is correct: the build bundles everything with esbuild.)
