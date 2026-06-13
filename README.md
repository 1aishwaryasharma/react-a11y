# react-a11y

A static accessibility scanner for React and React Native. It analyzes your
source and reports WCAG 2.2 issues with file:line locations — no browser, no
rendering, no configuration required.

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

- **Static and deterministic.** Parses TSX/JSX with the TypeScript compiler, so
  it works on code that doesn't build yet and is fast enough to run in CI.
- **Mapped to current guidelines.** Findings cite WCAG 2.2 success criteria
  (including 2.5.8 Target Size) and ARIA 1.2 vocabulary, with links to the W3C
  Understanding pages.
- **Conservative by design.** Spread props, dynamic expressions and unknown
  wrapper components are skipped rather than guessed at, to keep false positives
  low.
- **Shared core across platforms.** The engine is platform-agnostic; web and
  React Native are separate rule packs over the same element model.

## Usage

```sh
# audit the current project (platform auto-detected from package.json)
npx @react-a11y/cli .

# explicit platform
npx @react-a11y/cli apps/mobile --platform native

# machine-readable output
npx @react-a11y/cli . --format json
npx @react-a11y/cli . --format sarif --output a11y.sarif   # GitHub code scanning

# gate CI: exit 1 when serious or critical issues exist (default)
npx @react-a11y/cli . --fail-on serious

# apply safe mechanical fixes (ARIA casing, redundant roles, RN prop typos, …)
npx @react-a11y/cli . --fix

# scan only files changed in git — fast PR checks
npx @react-a11y/cli . --changed

# see every rule with severity + WCAG mapping
npx @react-a11y/cli --list-rules

# WCAG 2.2 success-criteria coverage report
npx @react-a11y/cli --coverage
```

Install it globally (or as a dev dependency) to get the bare `react-a11y`
command:

```sh
npm install -g @react-a11y/cli   # then: react-a11y .
```

### VS Code extension

The [`packages/vscode`](packages/vscode) extension surfaces the same rules
live as you type — squiggles with WCAG citations, clickable rule docs,
💡 quick fixes for the mechanical issues, and fix-on-save.

**Install** (not yet on the Marketplace — build the `.vsix` once):

```sh
npm install && npm run build
npm run build -w react-a11y-vscode
cd packages/vscode && npx @vscode/vsce package --no-dependencies
code --install-extension react-a11y-vscode-0.1.0.vsix
```

Or for development: open this repo in VS Code and press **F5** to launch an
Extension Development Host with the extension loaded.

**Use it:** open any React or React Native project. The platform is detected
per workspace folder (React Native/Expo → native rules), and
`react-a11y.config.json` rule overrides and ignore globs are respected.
Issues appear in the editor and the Problems panel; put the cursor on one and
press `Cmd+.` for quick fixes, or run **react-a11y: Fix all auto-fixable
issues** from the command palette. To fix on every save:

```json
// settings.json
"editor.codeActionsOnSave": { "source.fixAll.reactA11y": "explicit" }
```

| Setting | Default | Description |
| --- | --- | --- |
| `react-a11y.enable` | `true` | Toggle diagnostics. |
| `react-a11y.platform` | `auto` | Force `web` or `native` instead of auto-detection. |

### Expo / React Native projects

No setup needed — `npx @react-a11y/cli .` detects `react-native`/`expo` in
package.json and runs the native rule pack, including project-config checks
that go beyond JSX. Orientation locks (WCAG 1.3.4) are flagged wherever they
live:

```
$ npx @react-a11y/cli .

app.json
  6:5   moderate  no-orientation-lock
        Expo config locks orientation to "portrait". WCAG 1.3.4 (AA) requires content
        to work in both portrait and landscape — users with mounted devices cannot
        rotate. Use "default" to allow rotation.
            6 |     "orientation": "portrait",
```

Checked locations: `app.json`, `app.config.{js,ts,mjs,cjs}`,
`android/app/src/main/AndroidManifest.xml` (`android:screenOrientation`),
and `ios/*/Info.plist` (`UISupportedInterfaceOrientations`). If portrait
really is essential for your app (e.g. a camera viewfinder), disable it per
project:

```json
// react-a11y.config.json
{ "rules": { "no-orientation-lock": "off" } }
```

### CI (GitHub Actions)

```yaml
- run: npx @react-a11y/cli . --format sarif --output a11y.sarif --fail-on none
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

- **Web** — 55 rules covering alternative text, accessible names, ARIA 1.2
  validity (attributes, values, roles, required context, supported props),
  element/role semantics (interactive vs. non-interactive, focus support),
  document structure (headings, lists, tables, fieldsets), keyboard access and
  focus visibility, color contrast and target size, label-in-name, pointer
  cancellation, forms (labels, autofill purpose, error identification,
  accessible authentication), media, viewport zoom and document language.
  [Full list →](docs/rules/web.md)
- **React Native** — 20 rules covering touchable labels/roles, nested
  touchables, WCAG 2.5.8 touch-target size, color contrast, images, text
  inputs, switches, modal keyboard traps, live regions, state/value props,
  silent prop typos, accessibility actions, cross-platform hiding, **focus and
  reading order** (`accessible={true}` grouping that swallows interactive
  children, or descriptors dropped for lack of it), and orientation locks in
  project config (app.json, AndroidManifest, Info.plist).
  [Full list →](docs/rules/native.md)

`npx @react-a11y/cli --coverage` reports WCAG 2.2 coverage: **31 of the 55
Level A+AA criteria are checked automatically (56%)**. The remaining 24 — things
like reflow, use of color, and consistent navigation that a static tool cannot
decide — are listed as a manual checklist, so all 55 A+AA criteria are addressed
by either a rule or an explicit verification step.

## Architecture

```
packages/
  core/           @react-a11y/core — parsing (TS compiler API), normalized JSX
                  element model, rule engine, WCAG 2.2 + ARIA 1.2 metadata,
                  JSON/SARIF reporters. Platform-agnostic.
  rules-web/      @react-a11y/rules-web — WCAG-mapped rules for React DOM
  rules-native/   @react-a11y/rules-native — rules for React Native/Expo
  cli/            react-a11y — zero-config CLI, pretty/JSON/SARIF output
  vscode/         react-a11y-vscode — VS Code extension: live diagnostics,
                  quick fixes, fix-on-save (esbuild-bundled, ships as .vsix)
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

### Publishing (maintainers)

Four packages publish to npm under the `@react-a11y` scope — the engine
(`@react-a11y/core`), both rule packs, and the CLI (`@react-a11y/cli`). They
must go out in dependency order; `npm run release` builds, tests, and publishes
all four in that order. One-time setup: create a free npm org named
`react-a11y` (Settings → organizations) so the scope is yours, then `npm login`.

```sh
npm version patch --workspaces --include-workspace-root   # bump all packages in lockstep
npm run release                                           # build + test + publish core → rules → cli
```

`publishConfig.access` is set to `public` on every package, so no `--access`
flag is needed. The VS Code extension (`packages/vscode`) is `private` and
ships as a `.vsix`, not to npm.

## Roadmap

- ~~Broader rule coverage~~ ✓ 75 rules (55 web + 20 native); all 55 A+AA criteria addressed (automated + manual checklist)
- ~~Color-contrast checks for statically-known styles~~ ✓ web + native
- ~~Heading-order and landmark analysis~~ ✓
- ~~Autofixes for mechanical findings~~ ✓ `--fix` (ARIA casing, redundant roles, scope, accessKey, RN prop typos)
- ~~Cross-file label resolution (`htmlFor` ↔ `id`)~~ ✓ project-wide pass
- ~~`--changed` mode~~ ✓ scan only files changed in git
- ~~Editor integration~~ ✓ VS Code extension with quick fixes and fix-on-save
- ~~Expo/native config checks~~ ✓ orientation locks in app.json, app.config.*, AndroidManifest, Info.plist

Noted for later (not started):

- Marketplace publishing for the VS Code extension (icon, publisher account)
- LSP server for other editors (Neovim, JetBrains) on top of `analyze()`

## License

MIT
