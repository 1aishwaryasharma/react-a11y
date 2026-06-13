# react-a11y

**Enterprise-grade accessibility scanner for React, Next.js and React Native.**
Statically analyzes your codebase and pinpoints WCAG 2.2 violations with
file:line precision — no browser, no rendering, no config required.

```
$ react-a11y .

react-a11y v0.1.0 — platform: web — 214 files scanned in 480ms

src/components/Hero.tsx
  12:7   critical  img-alt
         <img> is missing an alt attribute. Use alt="" only if the image is purely decorative.
            12 |       <img src="/hero.png" />
         WCAG 1.1.1 Non-text Content (Level A)

✖ 14 issues (3 critical, 10 serious, 1 moderate) in 6 files
```

## Why

- **Static, fast, deterministic.** Scans TSX/JSX with the TypeScript compiler —
  works on code that doesn't even build yet, and runs in CI in well under a second
  for most repos.
- **Latest guidelines.** Every finding is mapped to WCAG 2.2 success criteria
  (including the new 2.5.8 Target Size minimum) and ARIA 1.2 vocabulary, with
  links to the W3C Understanding pages.
- **Low false-positive design.** Spread props, dynamic expressions and unknown
  wrapper components get the benefit of the doubt — findings are meant to be
  actionable, not noise.
- **One core, every React platform.** The engine is platform-agnostic; web and
  React Native ship as separate rule packs over the same element model.

## Usage

```sh
# audit the current project (platform auto-detected from package.json)
npx react-a11y .

# explicit platform
npx react-a11y apps/mobile --platform native

# machine-readable output
npx react-a11y . --format json
npx react-a11y . --format sarif --output a11y.sarif   # GitHub code scanning

# gate CI: exit 1 when serious or critical issues exist (default)
npx react-a11y . --fail-on serious

# see every rule with severity + WCAG mapping
npx react-a11y --list-rules
```

### CI (GitHub Actions)

```yaml
- run: npx react-a11y . --format sarif --output a11y.sarif --fail-on none
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: a11y.sarif
```

### Configuration

`react-a11y.config.json` (or a `"react-a11y"` key in package.json):

```json
{
  "platform": "web",
  "ignore": ["**/*.stories.tsx", "src/legacy/**"],
  "rules": {
    "no-autofocus": "off",
    "form-control-has-label": "critical"
  }
}
```

## Rules

- **Web** — 21 rules covering alternative text, accessible names, ARIA 1.2
  validity, keyboard access, forms, media and document language.
  [Full list →](docs/rules/web.md)
- **React Native** — 8 rules covering touchable labels/roles, nested
  touchables, WCAG 2.5.8 touch-target size, images, text inputs and silent
  prop typos. [Full list →](docs/rules/native.md)

## Architecture

```
packages/
  core/           @react-a11y/core — parsing (TS compiler API), normalized JSX
                  element model, rule engine, WCAG 2.2 + ARIA 1.2 metadata,
                  JSON/SARIF reporters. Platform-agnostic.
  rules-web/      @react-a11y/rules-web — WCAG-mapped rules for React DOM/Next.js
  rules-native/   @react-a11y/rules-native — rules for React Native/Expo
  cli/            react-a11y — zero-config CLI, pretty/JSON/SARIF output
```

Rules are ~30-line pure functions over a normalized `ElementNode` (attributes
resolved to static values where possible, import sources tracked, parent/child
links intact), so adding a rule for either platform never touches the engine:

```ts
export const iframeHasTitle = defineRule(
  { id: 'iframe-has-title', description: '…', severity: 'serious', wcag: ['4.1.2'] },
  (el, ctx) => {
    if (!isDomTag(el, 'iframe') || el.hasSpread) return;
    if (attrProvidesValue(el, 'title')) return;
    ctx.report({ el, message: '<iframe> is missing a title attribute.' });
  },
);
```

Embedding the engine (editor extensions, custom CI, agents):

```ts
import { analyze } from '@react-a11y/core';
import { webRules } from '@react-a11y/rules-web';

const diagnostics = analyze({ code, filename: 'App.tsx', platform: 'web', rules: webRules });
```

## Development

```sh
npm install
npm run build     # tsc -b across all packages
npm test          # vitest
node packages/cli/dist/index.js examples/web-demo
node packages/cli/dist/index.js examples/native-demo
```

## Roadmap

- Autofixes for mechanical findings (redundant roles, casing typos)
- Cross-file label resolution (`htmlFor` ↔ `id`)
- Heading-order and landmark-structure analysis
- Color-contrast checks for statically-known styles
- `--changed` mode: scan only files in the current diff

## License

MIT
