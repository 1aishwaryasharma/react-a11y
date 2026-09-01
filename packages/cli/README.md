# @aishware/react-a11y

[![npm](https://img.shields.io/npm/v/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![downloads](https://img.shields.io/npm/dm/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![CI](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml/badge.svg)](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/@aishware/react-a11y)](https://github.com/1aishwaryasharma/react-a11y/blob/main/LICENSE)

A static accessibility scanner for **React Native and React** that catches what
your ESLint setup can't: a 25-rule React Native static pack (including focus
and reading order), the newer **WCAG 2.2** web criteria, and a WCAG conformance
report — analyzed from source with file:line precision, no browser or rendering.

```
$ npx @aishware/react-a11y apps/mobile

react-a11y v0.4.0 — platform: native — 92 files scanned in 210ms

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

- **Broader React Native coverage than lint rules alone.** Beyond per-line
  basics, react-a11y checks focus and reading order (`accessible={true}`
  grouping), touch-target size, text scaling, role/state consistency,
  cross-platform hiding, and project-wide config per-file linters can't see
  (orientation locks in `app.json`, `AndroidManifest.xml`, `Info.plist`),
  plus the platform asymmetries other linters miss — Android-only live
  regions, Reduce Motion, icon-only buttons, pressable Text — 31 rules, from
  the same engine as web.
- **Tailwind, NativeWind and Uniwind aware.** Touch-target, contrast and
  text-height rules resolve `className` utilities (`h-6 w-6`, `text-gray-400`,
  `dark:` variants, `cn()` calls, twrnc `` tw`…` ``) with the right palette
  and rem base, so utility-styled apps are not a blind spot.
- **The WCAG 2.2 web criteria jsx-a11y lacks.** Color contrast, target size,
  label-in-name, pointer cancellation, viewport zoom and reading order — 22
  rules, each mapped to a success criterion with a link to the W3C
  Understanding page.
- **Complements [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y), doesn't fight it.**
  The web pack contains none of the rules jsx-a11y already does, so the two run
  together with no double-reporting — run both for broader automated coverage,
  then use the manual checklist for the remaining criteria. For React Native,
  react-a11y supplies a 25-rule static pack that overlaps
  [eslint-plugin-react-native-a11y](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y)
  on per-line basics and adds structural and project-wide analysis — you
  generally don't need both native packs; if you run both, disable the
  overlapping rules on one side. Rendered and real-device behavior still needs
  [manual testing](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/manual-testing.md).
- **Project-wide and conformance-aware.** A WCAG 2.2 coverage report plus
  cross-file label resolution and project-config checks that per-file
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

# lint one buffer from stdin — editor integrations (config still read from the path)
cat src/App.tsx | npx @aishware/react-a11y . --stdin --stdin-filename src/App.tsx --format json

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
  },
  "tailwind": { "rem": 14, "colors": { "brand": "#0055ff" } }
}
```

The `tailwind` key tunes Tailwind / NativeWind / Uniwind class resolution
(auto-detected from dependencies; `false` disables it).

## Rules

- **Web** — 22 rules, none of which overlap eslint-plugin-jsx-a11y.
  [Full list →](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/rules/web.md)
- **React Native** — 31 rules, including focus/reading order, Tailwind class
  resolution, and project-config checks.
  [Full list →](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/rules/native.md)

`npx @aishware/react-a11y --coverage` reports WCAG 2.2 coverage: react-a11y
automates **27 of the 55 Level A+AA criteria (49%)** on its own, and **31/55
(56%)** when run alongside eslint-plugin-jsx-a11y; the criteria a static tool
cannot decide are listed as a manual checklist.

For focus movement, dynamic announcements, rendered text scaling, effective
touch geometry, Reduce Motion, and VoiceOver/TalkBack behavior, follow the
[manual accessibility testing guide](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/manual-testing.md).

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
