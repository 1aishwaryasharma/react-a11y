# react-a11y

[![npm](https://img.shields.io/npm/v/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![downloads](https://img.shields.io/npm/dm/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![CI](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml/badge.svg)](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/@aishware/react-a11y)](LICENSE)

Static WCAG 2.2 accessibility analysis for React, Next.js, React Native, and
Expo. It reports issues with file and line locations without requiring a
browser, application build, or rendered UI.

react-a11y supplements the ESLint accessibility plugins rather than replacing
them. For web projects it adds WCAG 2.2, structural, focus, and project-wide
checks to
[`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
without repeating its rules. For React Native it adds focus and reading order,
touch targets, text scaling, platform asymmetries and project configuration to
[`eslint-plugin-react-native-a11y`](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y),
and leaves the checks that plugin makes to it when it is installed. See
[Alongside ESLint](#alongside-eslint).

## Quick start

Node.js 20 or later is required.

```sh
npx @aishware/react-a11y .
```

The rule pack is detected from `package.json`. Pass a path or platform when
automatic detection is not appropriate:

```sh
npx @aishware/react-a11y apps/mobile --platform native
npx @aishware/react-a11y apps/web --platform web
```

The command exits with status 1 when it finds a serious or critical issue.

## Commands

```sh
# Apply safe mechanical fixes
npx @aishware/react-a11y . --fix

# Scan files changed in the working tree
npx @aishware/react-a11y . --changed

# Gate a pull request: scan what the branch changed (a CI checkout is clean,
# so --changed alone would find nothing there)
npx @aishware/react-a11y . --since origin/main

# Write JSON or SARIF output
npx @aishware/react-a11y . --format json --output a11y.json
npx @aishware/react-a11y . --format sarif --output a11y.sarif

# Set the CI failure threshold
npx @aishware/react-a11y . --fail-on moderate

# Adopt on an existing codebase: record today's findings once, commit the
# file, then fail only on new ones
npx @aishware/react-a11y . --baseline a11y-baseline.json --update-baseline
npx @aishware/react-a11y . --baseline a11y-baseline.json

# Inspect rules and WCAG coverage
npx @aishware/react-a11y --list-rules
npx @aishware/react-a11y --coverage
```

Run `npx @aishware/react-a11y --help` for all options.

## Configuration

Create `react-a11y.config.json` or `.react-a11yrc.json`, or add a
`react-a11y` key to `package.json`:

```json
{
  "ignore": ["src/legacy/**"],
  "platform": "web",
  "rules": {
    "color-contrast": "critical",
    "target-size": "off"
  }
}
```

Rule values can be `critical`, `serious`, `moderate`, `minor`, or `off`. A
rule id react-a11y does not know prints a warning — with the nearest id for a
typo, or the plugin to configure it in for a jsx-a11y or react-native-a11y rule.

Test, story, e2e and mock files are skipped by default (`*.test.*`,
`*.spec.*`, `*.e2e.*`, `*.stories.*`, `__tests__/`, `__mocks__/`, `e2e/`,
`storybook/`). `ignore` adds to that list; set `"defaultIgnores": false` to
scan them anyway. Ignore globs also apply to `--changed` and `--since`.

### Suppressing a finding

Directives are spelled like ESLint's. With no rule list they cover every rule;
text after `--` is a reason for reviewers.

```tsx
// react-a11y-disable-next-line target-size -- hitSlop extends the target
<Pressable hitSlop={12} className="h-6 w-6" onPress={close} />

<div>
  {/* react-a11y-disable-next-line color-contrast */}
  <p className="text-gray-400">Fine print</p>
  <img src={logo} alt="" /> {/* react-a11y-disable-line */}
</div>

/* react-a11y-disable heading-order */
…
/* react-a11y-enable */
```

## Tailwind, NativeWind and Uniwind

Style-dependent rules (touch-target size, color contrast, fixed text height,
focus-ring removal) read Tailwind utility classes as well as inline styles.
Resolution turns on automatically when `tailwindcss`, `nativewind`, `uniwind`,
`twrnc` or `react-native-css` is a dependency and understands `className`
strings, `cn()` / `clsx()` calls, `Platform.select()` branches, hoisted class
constants, `cva()` / `tv()` variant tables, `dark:` and other variants, twrnc
`` tw`…` `` and `tw.style()`, the v3 and v4 default palettes, and custom theme
colors from `tailwind.config.*` (`theme.colors` / `theme.extend.colors`) or CSS
`@theme` blocks — including shadcn-style `:root` variables behind
`var(--primary)` / `hsl(var(--primary))`, and `oklch()` / `hsl()` values.

A `cva()` size table is checked per variant: `size: { icon: 'h-10 w-10' }` on
a `<Pressable>` is reported once, on the variant definition, however many
elements use it.

The rem base comes from the binding's own default and from your bundler config
(`inlineRem` for NativeWind and react-native-css, `polyfills.rem` for Uniwind):

| Binding | rem |
| --- | --- |
| NativeWind 4 and 5, react-native-css | 14px |
| NativeWind 2, Uniwind, twrnc, tailwind-rn, web Tailwind | 16px |

In a monorepo each file is resolved against its own `package.json`, so a
workspace package's binding is picked up when you scan the repository root.
Every run prints what it decided:

```
react-a11y v0.5.0 — platform: native — tailwind: nativewind ^4.1.0 (rem 14, palette v3) — 5011 files scanned in 2523ms
```

Tune it with the `tailwind` config key:

```json
{
  "tailwind": { "rem": 14, "preset": "v3", "colors": { "brand": "#0055ff" } }
}
```

Set `"tailwind": false` to disable it. Details are in the
[native rules documentation](docs/rules/native.md#tailwind-nativewind-and-uniwind).

## Alongside ESLint

Keep your ESLint accessibility plugin; react-a11y covers what it does not.

**Web, with eslint-plugin-jsx-a11y.** No web rule repeats a rule in jsx-a11y's
recommended config. Where a rule sounds like a jsx-a11y one, it checks
something else:

| react-a11y | Closest jsx-a11y rule | Difference |
| --- | --- | --- |
| `button-has-accessible-name` | `control-has-associated-label` | off in jsx-a11y's recommended and strict configs |
| `form-control-has-label` | `label-has-associated-control` | jsx-a11y checks each `<label>` has a control; react-a11y checks each control has a label, resolving `htmlFor` ↔ `id` across files |
| `no-autocomplete-off` | `autocomplete-valid` | jsx-a11y validates `autoComplete` tokens; react-a11y flags `autoComplete="off"` on personal-data fields (WCAG 3.3.7) |
| `heading-order` | `heading-has-content` | jsx-a11y checks a heading has text; react-a11y checks levels do not skip |

**React Native, with eslint-plugin-react-native-a11y.** When that plugin is a
dependency of the project or its workspace root, react-a11y leaves the checks
it makes to it: 3 rules are skipped, 4 are narrowed to what the plugin does not
check, and the other 24 always run. The run banner says so, and setting a
rule's severity runs it in full. The
[rule-by-rule table](docs/rules/native.md#alongside-eslint-plugin-react-native-a11y)
lists each one.

A rule id from either plugin in a react-a11y config prints a warning naming the
plugin to configure it in.

## Rules

- [Web rules](docs/rules/web.md): 22 checks for WCAG 2.2 criteria, document
  structure, focus behavior, and project-wide relationships. Continue using
  `eslint-plugin-jsx-a11y` for standard web accessibility rules.
- [React Native rules](docs/rules/native.md): 31 checks for accessible names,
  roles and state, focus and reading order, touch targets, text scaling,
  platform asymmetries (Android-only live regions, Reduce Motion), and native
  or Expo configuration.

Use `--coverage` to see which WCAG success criteria are automated and which
still require manual verification.

## GitHub Actions

The repository includes a composite action:

```yaml
- uses: actions/checkout@v4
- uses: 1aishwaryasharma/react-a11y@v0.5.0
  with:
    fail-on: serious
    path: .
```

Set the optional `sarif-file` input to generate a report for GitHub code
scanning, and `baseline` to a committed baseline file to fail only on new
findings.

A baseline matches findings by rule, message and source line rather than line
number, so moving code does not bring a known finding back. The run reports
how many entries are no longer found; `--update-baseline` prunes them. A
missing baseline file is an error, never an empty baseline.

## Editor integrations

- [VS Code extension](packages/vscode)
- [WebStorm and JetBrains plugin](packages/webstorm)

Both integrations provide live diagnostics and safe quick fixes. Project-wide
checks remain available through their workspace or project scan commands.

## Limitations

Static analysis cannot verify runtime focus movement, dynamic announcements,
rendered layout, device settings, screen-reader behavior, or interactions that
depend on application state. Use the
[manual accessibility testing guide](docs/manual-testing.md) alongside the
scanner.

## Repository packages

- [`@aishware/react-a11y`](packages/cli): command-line interface
- [`@aishware/react-a11y-core`](packages/core): parser, rule engine, and
  reporters
- [`@aishware/react-a11y-rules-native`](packages/rules-native): React Native
  and Expo rules
- [`@aishware/react-a11y-rules-web`](packages/rules-web): React web rules
- [`packages/vscode`](packages/vscode): VS Code extension
- [`packages/webstorm`](packages/webstorm): JetBrains plugin

## Development

```sh
npm install
npm run build
npm test
```

`npm run field-test` scans the open-source apps pinned in
[`field-test/corpus.json`](field-test/corpus.json) and compares every finding
with the committed snapshots; CI runs it on any change to rule or engine
source. When a change is meant to add or remove findings, run
`npm run field-test -- --update` and commit the snapshot diff with it.
`npm run rn-drift` checks the role and prop allowlists against the latest
React Native release (weekly in CI).

## License

[MIT](LICENSE)
