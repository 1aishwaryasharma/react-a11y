# Changelog

All notable changes to the react-a11y VS Code extension are documented here.

## 0.6.0 — 2026-10-09

- Updated the bundled engine and rule packs to 0.6.0: inline
  `react-a11y-disable` comments, test, story and mock files skipped by default,
  deferral to eslint-plugin-react-native-a11y when it is installed, a warning
  for unknown rule ids in the config, and fewer false positives in
  `color-contrast`, `valid-accessibility-role` and the touchable rules.
- Includes the 0.5.0 changes below, which were not published.

## 0.5.0 — 2026-09-02

- Updated the bundled engine and rule packs to 0.5.0 (Tailwind/NativeWind/Uniwind
  class resolution and six new React Native rules).

## 0.4.0 — 2026-07-21

- Updated the bundled engine and rule packs to 0.4.0.
- Hardened ignore-glob matching against pathological workspace configuration.

## 0.3.0 — 2026-07-20

- Added live WCAG 2.2 diagnostics for React and React Native projects.
- Added platform auto-detection with explicit web and native overrides.
- Added quick fixes and source-level fix-all support.
- Added project-wide workspace scanning.
- Added support for `react-a11y.config.json` rule overrides and ignore globs.
- Bundled 22 web rules and 25 React Native rules for offline analysis.
