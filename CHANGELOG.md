# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- A reusable composite GitHub Action (`action.yml`) — add the scan to any
  workflow with `uses: 1aishwaryasharma/react-a11y@main`, with optional SARIF
  output for GitHub code scanning.
- CI on GitHub Actions (build + tests on Node 18/20/22, plus a dogfood scan of
  the example projects).
- The npm package README now carries the full documentation (why, usage, CI
  recipes, rule summary) instead of a stub pointing at GitHub.

## [0.1.0] — 2026-06-14

Initial release. Published under the `@aishware` scope; the installed command is
`react-a11y`.

### Added

- **CLI** (`@aishware/react-a11y`) — static accessibility scanner for React and
  React Native. Pretty / JSON / SARIF output, `--fix`, `--changed`,
  `--list-rules`, and a WCAG 2.2 `--coverage` report.
- **Engine** (`@aishware/react-a11y-core`) — TypeScript-compiler-based JSX analysis,
  a normalized platform-agnostic element model, the rule engine, WCAG 2.2
  metadata, and JSON/SARIF reporters. Embeddable in editors, CI, or agents.
- **Web rules** (`@aishware/react-a11y-rules-web`) — 22 rules covering the WCAG 2.2
  criteria, document structure, focus visibility and project-wide checks that
  [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
  does **not** cover. Zero overlap with jsx-a11y — run both for full Level A+AA
  web coverage. Includes a cross-file `htmlFor` ↔ `id` label resolution pass.
- **React Native rules** (`@aishware/react-a11y-rules-native`) — 20 rules covering
  touchable labels/roles, focus and reading order (`accessible={true}`
  grouping), touch-target size, cross-platform hiding (iOS vs Android),
  accessibility actions, color contrast, and Expo config checks (orientation
  locks in `app.json`, `app.config.*`, `AndroidManifest.xml`, `Info.plist`).
- **VS Code extension** — live per-file diagnostics with WCAG citations and
  quick fixes, fix-on-save, and a "Scan workspace (project-wide checks)" command
  for the cross-file and config checks live linting can't run.
- An upstream-parity test that keeps the React Native `accessibilityRole` list
  in sync with `eslint-plugin-react-native-a11y`.

[0.1.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.1.0
