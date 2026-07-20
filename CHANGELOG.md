# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [0.3.0] — 2026-07-20

### Added

- Four React Native accessibility rules (25 native rules, 47 total):
  - `accessibility-hint-has-label` requires hints to supplement a usable
    accessible name.
  - `accessibility-value-valid` validates object shape, supported fields,
    literal types, and numeric ranges.
  - `no-disable-font-scaling` prevents stock `Text` and `TextInput` from
    disabling or effectively capping system text scaling.
  - `role-has-required-state` requires checked state for custom toggles and
    selected state for tabs.
- A [manual accessibility testing guide](docs/manual-testing.md) for checks
  static analysis cannot prove, including screen-reader focus, rendered text
  scaling, contrast, alternative input, motion, and media.

### Changed

- Component import tracking now preserves named aliases and namespace exports,
  so native rules recognize forms such as aliased `Text` and `<rn.Switch>`.
- Object-literal analysis now has one canonical shape model with static
  computed-key support and explicit handling for unknowable spreads.
- Native hidden-tree, role precedence, and state/value validation now use
  shared conservative helpers to reduce false positives and silent misses.

## [0.2.0] — 2026-07-18

### Added

- **First-class support for React Native's ARIA-style props** (the recommended
  spellings since RN 0.71), driven by one canonical model of RN's aria-* props
  (`@aishware/react-a11y-rules-native` exports it as `ARIA_PROPS`):
  - `valid-accessibility-role` now validates the `role` prop against its own
    ARIA-style vocabulary (which differs from `accessibilityRole` — `heading`
    vs `header`, `img` vs `image`, `searchbox` vs `search`, `slider` vs
    `adjustable`) and names the correct equivalent when the two vocabularies
    are mixed up, in either direction.
  - `valid-accessibility-props` now catches `aria-*` casing mistakes and
    misspellings (`aria-labeledby`, `aria-Label`, `aria-role`) with rename
    fixes. Unknown `aria-*` props with no close match are not flagged, since
    react-native-web forwards them.
  - New rule **`aria-state-valid`**: flags string values on boolean `aria-*`
    state props — in React Native `aria-checked="false"` is a truthy string,
    so screen readers announce it as *checked*. (21 native rules, 43 total.)
  - `label-needs-accessible` counts `aria-label` and the other ARIA-style
    descriptors when deciding a `<View>` needs `accessible={true}`.

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

[0.3.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.3.0
[0.2.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.2.0
[0.1.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.1.0
