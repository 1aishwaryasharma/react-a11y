# react-a11y

A static accessibility scanner for **React Native and React** that catches what
your ESLint setup can't: full React Native accessibility (including focus and
reading order), the newer **WCAG 2.2** web criteria, and a WCAG conformance
report — analyzed from source with file:line precision, no browser or rendering.

It complements [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
rather than competing with it: the web pack runs only the rules jsx-a11y
*doesn't*, so there's no double-reporting. jsx-a11y owns standard web a11y;
react-a11y owns React Native and the gaps.

```
$ react-a11y apps/mobile

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
  Expo config (orientation locks) — from the same engine as web.
- **The WCAG 2.2 web criteria jsx-a11y lacks.** Color contrast, target size,
  label-in-name, pointer cancellation, viewport zoom and reading order — each
  mapped to a success criterion with a link to the W3C Understanding page.
- **Complements eslint-plugin-jsx-a11y, doesn't fight it.** The default web pack
  excludes everything jsx-a11y already does, so the two run together cleanly.
  (`--full` runs the overlap too, if you're not using jsx-a11y.)
- **Project-wide and conformance-aware.** A WCAG 2.2 coverage report plus
  cross-file checks (label resolution, duplicate landmarks) that per-file ESLint
  rules structurally can't do.
- **Static and deterministic.** Parses TSX/JSX with the TypeScript compiler —
  works on code that doesn't build yet, runs in CI in under a second, and is
  conservative about spreads and dynamic values to keep false positives low.

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

# include the web rules that overlap jsx-a11y (if you don't run jsx-a11y)
npx @react-a11y/cli . --full

# see every rule with severity + WCAG mapping
npx @react-a11y/cli --list-rules

# WCAG 2.2 success-criteria coverage report
npx @react-a11y/cli --coverage
```

### How it fits with eslint-plugin-jsx-a11y

For **web**, keep running `eslint-plugin-jsx-a11y` in your ESLint config — it's
the canonical implementation of the standard web a11y rules. react-a11y's
default web pack deliberately runs only what jsx-a11y doesn't (the WCAG 2.2
criteria, document structure, focus visibility, and project-wide checks), so the
two don't double-report. If you're *not* using jsx-a11y, pass `--full` to run
the overlapping rules here too.

For **React Native**, there's no equivalent — react-a11y is the whole story.

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
    "target-size": "off",
    "color-contrast": "critical"
  }
}
```

## Rules

- **Web** — 55 rules total, split into two presets. The **default** 21 are the
  ones jsx-a11y doesn't cover: color contrast, target size, label-in-name,
  pointer cancellation, viewport zoom, meta-refresh, reading order, document
  structure (heading order, lists, tables, fieldsets, duplicate landmarks),
  focus visibility, required-context, and the WCAG 2.2 form criteria (error
  identification, accessible authentication, autocomplete-off). The other 34
  **overlap eslint-plugin-jsx-a11y** and are off unless you pass `--full`.
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
Level A+AA criteria are checked automatically (56%)**, counting both the default
pack and the jsx-a11y-overlap rules the tool ships (the default scan defers the
overlap to jsx-a11y). The remaining 24 — things like reflow, use of color, and
consistent navigation that a static tool cannot decide — are listed as a manual
checklist, so all 55 A+AA criteria are addressed by either a rule or an explicit
verification step.

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
