# @aishware/react-a11y

[![npm](https://img.shields.io/npm/v/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![downloads](https://img.shields.io/npm/dm/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![CI](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml/badge.svg)](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/@aishware/react-a11y)](https://github.com/1aishwaryasharma/react-a11y/blob/main/LICENSE)

A static accessibility scanner for **React Native and React** that catches what
your ESLint setup can't: full React Native accessibility (including focus and
reading order), the newer **WCAG 2.2** web criteria, and a WCAG conformance
report — analyzed from source with file:line precision, no browser or rendering.

```
$ npx @aishware/react-a11y apps/mobile

react-a11y v0.1.0 — platform: native — 92 files scanned in 210ms

src/screens/Profile.tsx
  34:7   serious  accessible-grouping-hides-interactive
         <View accessible> groups its whole subtree into one focus stop, so the
         <Pressable> inside is no longer separately focusable and the reading
         order changes. Move the grouping off the interactive content.
            34 |       <View accessible={true}>
         WCAG 2.4.3 Focus Order (Level A)

✖ 7 issues (1 critical, 5 serious, 1 moderate) in 4 files
```

## Why

- **React Native a11y nobody else lints.** Focus and reading order
  (`accessible={true}` grouping), touch-target size, cross-platform hiding, and
  Expo config (orientation locks in `app.json`, `AndroidManifest.xml`,
  `Info.plist`) — 20 rules, from the same engine as web.
- **The WCAG 2.2 web criteria jsx-a11y lacks.** Color contrast, target size,
  label-in-name, pointer cancellation, viewport zoom and reading order — 22
  rules, each mapped to a success criterion with a link to the W3C
  Understanding page.
- **Complements [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), doesn't fight it.**
  The web pack contains none of the rules jsx-a11y already does, so the two run
  together with no double-reporting — run both for full Level A+AA web
  coverage. For React Native there's no equivalent; react-a11y is the whole
  story.
- **Project-wide and conformance-aware.** A WCAG 2.2 coverage report plus
  cross-file checks (label resolution, duplicate landmarks) that per-file
  ESLint rules structurally can't do.
- **Static and deterministic.** Parses TSX/JSX with the TypeScript compiler —
  works on code that doesn't build yet, runs in CI in under a second, and is
  conservative about spreads and dynamic values to keep false positives low.

## Usage

```sh
# audit the current project (platform auto-detected from package.json)
npx @aishware/react-a11y .

# explicit platform
npx @aishware/react-a11y apps/mobile --platform native

# machine-readable output
npx @aishware/react-a11y . --format json
npx @aishware/react-a11y . --format sarif --output a11y.sarif   # GitHub code scanning

# gate CI: exit 1 when serious or critical issues exist (default)
npx @aishware/react-a11y . --fail-on serious

# apply safe mechanical fixes (e.g. miscapitalized React Native accessibility props)
npx @aishware/react-a11y . --fix

# scan only files changed in git — fast PR checks
npx @aishware/react-a11y . --changed

# every rule with severity + WCAG mapping, or the coverage report
npx @aishware/react-a11y --list-rules
npx @aishware/react-a11y --coverage
```

Install globally (or as a dev dependency) to get the bare `react-a11y` command:

```sh
npm install -g @aishware/react-a11y   # then: react-a11y .
```

## CI (GitHub Actions)

One line with the bundled action:

```yaml
- uses: 1aishwaryasharma/react-a11y@main
  with:
    sarif-file: a11y.sarif        # optional — for GitHub code scanning
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: a11y.sarif
```

Or plain npx, next to your existing jsx-a11y ESLint step:

```yaml
- name: react-a11y — WCAG 2.2, React Native, project-wide
  run: npx @aishware/react-a11y . --fail-on serious
```

## Configuration

`react-a11y.config.json` (or a `"react-a11y"` key in package.json):

```json
{
  "platform": "web",
  "ignore": ["**/*.stories.tsx", "src/legacy/**"],
  "rules": {
    "target-size": "off",
    "color-contrast": "critical"
  }
}
```

## Rules

- **Web** — 22 rules, none of which overlap eslint-plugin-jsx-a11y.
  [Full list →](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/rules/web.md)
- **React Native** — 20 rules, including focus/reading order and project-config
  checks.
  [Full list →](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/rules/native.md)

`npx @aishware/react-a11y --coverage` reports WCAG 2.2 coverage: react-a11y
automates **25 of the 55 Level A+AA criteria (45%)** on its own, and **31/55
(56%)** when run alongside eslint-plugin-jsx-a11y; the criteria a static tool
cannot decide are listed as a manual checklist.

## Embedding

The engine is a library — use it in editor extensions, custom CI, or agents:

```ts
import { analyze } from '@aishware/react-a11y-core';
import { webRules } from '@aishware/react-a11y-rules-web';

const diagnostics = analyze({ code, filename: 'App.tsx', platform: 'web', rules: webRules });
```

Full documentation, VS Code extension, and architecture:
<https://github.com/1aishwaryasharma/react-a11y>

## License

MIT
