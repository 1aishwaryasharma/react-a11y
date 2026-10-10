# Changelog

All notable changes to the react-a11y JetBrains plugin are documented here.

## 0.6.0 — 2026-10-09

- Updated the bundled CLI to 0.6.0: inline `react-a11y-disable` comments,
  test, story and mock files skipped by default, deferral to
  eslint-plugin-react-native-a11y when it is installed, a warning for unknown
  rule ids in the config, and fewer false positives in `color-contrast`,
  `valid-accessibility-role` and the touchable rules.
- Includes the 0.5.0 changes below, which were not published.

## 0.5.0 — 2026-09-02

- Updated the bundled CLI to 0.5.0 (Tailwind/NativeWind/Uniwind class resolution
  and six new React Native rules).

## 0.4.0 — 2026-07-21

- Initial release, at feature parity with the VS Code extension.
- Live WCAG 2.2 diagnostics for React and React Native in JS/JSX/TS/TSX.
- Platform auto-detection with explicit web and native overrides.
- Alt+Enter quick fixes and a fix-all-in-file intention.
- Tools → react-a11y: Scan Project for project-wide and cross-file checks.
- Support for `react-a11y.config.json` rule overrides and ignore globs.
- Bundled, version-pinned react-a11y CLI with JetBrains trusted-project enforcement.
