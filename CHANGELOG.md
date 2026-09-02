# Changelog

All notable changes to this project are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] — 2026-09-02

### Added

- **Tailwind, NativeWind, Uniwind and twrnc support.** The style-dependent
  rules (`touch-target-size`, `color-contrast`, `target-size`,
  `no-outline-none`, and the new `text-fixed-height`) now resolve utility
  classes: `className` strings, `cn()` / `clsx()` / `twMerge()` arguments,
  template literals, `Platform.select()` branches, hoisted class constants,
  `dark:` and other variants, and twrnc `` tw`…` `` / `tw.style()`. The default
  palette (Tailwind v3 vs v4), the rem base (NativeWind 4/5 and
  react-native-css use 14px; NativeWind 2, Uniwind, twrnc and the web use 16px,
  overridden by `inlineRem` / `polyfills.rem` in the bundler config) and custom
  theme colors (`tailwind.config.*`, CSS `@theme`, including `oklch()` and
  `hsl()`) are detected from the project; a `tailwind` config key tunes or
  disables it. The core exports the resolver (`resolveClassString`,
  `styleModel`, `contrastFindings`, `readProjectInfo`).
- Contrast is now checked against the nearest enclosing background, not only
  a background on the same element, and each Tailwind variant / conditional
  class set is checked separately (a pair that passes in light mode but fails
  under `dark:` is reported).
- Six React Native rules (31 native rules, 53 total) for problems no other
  static tool covers:
  - `text-onpress-has-role` — pressable `Text` needs a link/button role
    (skipped on React Native 0.84+, which applies `link` automatically).
  - `live-region-android-only` — `accessibilityLiveRegion` / `aria-live` do
    nothing on iOS; require an `announceForAccessibility` call too.
  - `animation-reduce-motion` — `Animated.loop` without a Reduce Motion
    check, Reanimated `withRepeat(…, -1, …, ReduceMotion.Never)`, and
    `<ReducedMotionConfig mode={ReduceMotion.Never}>`. Scans plain modules
    without JSX (first source-level rule; rules can now implement
    `sourceFile()` and report on any node).
  - `text-fixed-height` — fixed `height` on `Text` clips enlarged system text.
  - `accessibility-language-valid` — BCP 47 validation for `accessibilityLanguage`.
  - `label-not-all-caps` — all-caps labels that VoiceOver may spell out.
- `touchable-has-label` no longer accepts an unlabeled `<Image>` or an
  icon-library glyph (`@expo/vector-icons`, `react-native-vector-icons`,
  `lucide-react-native`, `react-native-svg`, …) as an accessible name.
- `no-nested-touchables` also flags `Switch`, `TextInput`, `Button` and
  pressable `Text` inside a touchable.
- `touch-target-size` / `target-size` report when a single known dimension is
  below the threshold, honour `minWidth` / `minHeight`, and read array styles
  (`style={[styles.base, { height: 20 }]}`).
- WCAG 2.3.3 (Animation from Interactions) added to the criteria table.

- `--since <ref>` scans what a branch changed against a merge base. `--changed`
  reads the working tree, which is empty in a CI checkout; `--since origin/main`
  is what a pull-request gate needs.
- Every run prints what it resolved — platform, binding and version, rem base,
  palette, theme-color count, and any files it skipped — so a wrong palette or
  a disabled resolution is visible instead of showing up as missing findings.
- `parseColor` understands `oklch()`, `hsl()` and space-separated `rgb()`.
- Project config is validated: `{"platform": "ios"}` and an unknown rule
  severity are now errors naming the file instead of being silently ignored.

### Fixed

- **The rem base was wrong for three of four React Native bindings.** Verified
  against the published packages: NativeWind 2 uses 16px (not 14), while
  NativeWind 5 and react-native-css use 14px (not 16). Every rem-based length
  was off by 14%, which flips `touch-target-size` across the 44pt line in both
  directions. An explicit `inlineRem` (NativeWind, react-native-css) or
  `polyfills.rem` (Uniwind) in the bundler config is now read.
- **`--fix` could write source that does not compile.** Renaming
  `aria-role` onto an element that already has `role` produced
  `role="…" role="…"` — a TS17001 parse error — and the CLI reported success.
  A colliding rename is now reported without a fix.
- **A monorepo root under-reported silently.** Dependencies, platform and
  Tailwind settings are resolved per file from the owning `package.json` and
  its workspace root, so scanning a repository root, a workspace package or a
  single file all agree. Workspaces declared in `pnpm-workspace.yaml` are read
  as well as npm/yarn/bun `workspaces`. A repository holding a React Native app
  beside a web app now analyses each package with the pack it needs instead of
  forcing one over both, and the banner reports the split.
- **Contrast between 3:1 and 4.5:1 was never reported when the font size was
  unknown**, which is where most real AA failures live (white on `blue-500` is
  3.68:1). An unknown size is now treated as normal text; only bold text of
  unknown size keeps the large-text allowance.
- `cva()` / `tv()` variant tables are read, so a `size: { icon: 'h-10 w-10' }`
  used on a touchable is reported — once, on the variant definition. A
  variant that only inherits the base size is not restated.
- shadcn-style themes resolve: `@theme inline { --color-primary: var(--primary) }`
  and `primary: 'hsl(var(--primary))'` are followed into `:root`, so contrast
  is checked on projects that define every colour as a CSS variable. A variable
  two `:root` blocks disagree on resolves to nothing.
- Symlinked directories inside the project are scanned (once, by real path);
  links leaving the tree are not followed.
- The pretty report names a colour pair that recurs five or more times, since
  that is one theme token to fix rather than many elements.
- Conditional class sets (`#2`) are element-local and are no longer paired
  across two elements, which used to fabricate impossible colour pairs such as
  white on white. A variant still crosses elements, because `active:` means the
  same thing on both — so a parent's `hover:bg-neutral-100` is now checked
  against the text inside it — and each background a parent can conditionally
  take is checked against text whose own colour is fixed.
- Contrast abstains when the background cannot be known: a covering sibling
  paints over it (a hero image, an `absolute inset-0` overlay — a badge pinned
  to a corner is not treated as one), an ancestor is a component that may style
  its own root (including one defined in the same file), or part of its class
  string is unreadable.
- `no-outline-none` no longer reports a missing focus ring supplied by an
  unreadable half of the class string or by a parent (`has-focus-visible:`,
  `group-focus:`, `peer-focus:`).
- Size and contrast rules skip elements that are not pointer targets or
  readable text: `sr-only`, `display:none`, `opacity: 0`, `hidden`,
  `aria-hidden` and hidden inputs.
- `target-size` measures a checkbox or radio by its activation area, so one
  associated with a `<label>` (wrapping or `htmlFor`) or inside a clickable row
  is not reported as a 16px target.
- Theme colors are read only from `theme.colors` and `theme.extend.colors`; a
  `colors` key elsewhere in the config (a daisyUI theme block) no longer
  fabricates findings. A theme value that cannot be read statically, or a theme
  that replaces the palette outright, makes the resolver abstain instead of
  reporting a default-palette hex the app does not use. A `tailwind.config.js`
  shim no longer shadows the real `.ts` config, and a theme may redefine
  built-in names such as `white`.
- `Platform.select({ ios: 'text-sm' })` contributed its platform keys as
  classes and discarded the utilities.
- twrnc is detected under its pre-4.x name `tailwind-react-native-classnames`.
- `.web.tsx` / `.native.tsx` / `.ios.tsx` files are analysed with the rule pack
  that actually loads them, instead of reporting web-valid markup as a React
  Native mistake.
- A file that fails to parse or analyse no longer aborts the whole scan, and
  every skipped file is reported with its reason.
- `src/components/ios/` is no longer skipped: `android` / `ios` / `vendor` are
  ignored only at the top of a package.
- The SARIF `$schema` URL no longer 404s, and results carry
  `partialFingerprints` so GitHub code-scanning alerts survive a line move.

### Changed

- `analyze()` and `scanProject()` accept a `project` option (from
  `readProjectInfo(root, config)`) carrying dependency versions and Tailwind
  settings; the CLI (including `--stdin`) and the VS Code extension pass it
  automatically. `ProjectResolver` provides the same facts per file.
- The scanner no longer skips JSX-free modules that mention `react-native`,
  so animation hooks are covered.
- Web `color-contrast` also checks interpolated text (`<p>{label}</p>`) in
  text-bearing elements, matching the React Native pack.

## [0.4.0] — 2026-07-21

### Added

- A WebStorm/JetBrains plugin with live JS/JSX/TS/TSX diagnostics, Alt+Enter
  quick fixes, fix-all support, and project-wide scans. The plugin bundles the
  CLI and supports every JetBrains IDE that includes the JavaScript plugin.
- CLI `--stdin` and `--stdin-filename` modes for editor integrations that need
  to analyze an in-memory buffer while retaining project configuration.

### Security

- Prevented shell injection through inputs to the composite GitHub Action and
  pinned its default scanner version to the matching release.
- Replaced backtracking ignore-glob regular expressions with bounded dynamic
  matching to prevent malicious configuration from hanging scans or editors.
- Prevented the JetBrains plugin from starting processes for untrusted projects
  and stopped automatically executing a workspace-local CLI. Its bundled CLI
  cache is content-addressed and integrity-checked before execution.
- Escaped terminal control characters in repository-controlled pretty output.
- Pinned CI actions to immutable commits, restricted workflow permissions, and
  verified the Gradle distribution checksum.

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

- The npm packages now require Node.js 20 or newer.
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

[0.5.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.5.0
[0.4.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.4.0
[0.3.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.3.0
[0.2.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.2.0
[0.1.0]: https://github.com/1aishwaryasharma/react-a11y/releases/tag/v0.1.0
