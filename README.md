# react-a11y

[![npm](https://img.shields.io/npm/v/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![downloads](https://img.shields.io/npm/dm/@aishware/react-a11y)](https://www.npmjs.com/package/@aishware/react-a11y)
[![CI](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml/badge.svg)](https://github.com/1aishwaryasharma/react-a11y/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/npm/l/@aishware/react-a11y)](LICENSE)

A static accessibility scanner for **React Native and React** that catches what
your ESLint setup can't: a 25-rule React Native static pack (including focus
and reading order), the newer **WCAG 2.2** web criteria, and a WCAG conformance
report — analyzed from source with file:line precision, no browser or rendering.

It complements [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
rather than competing with it: the web pack runs only the rules jsx-a11y
*doesn't*, so there's no double-reporting. jsx-a11y owns standard web a11y;
react-a11y adds broader React Native, structural, and project-wide analysis.

```
$ react-a11y apps/mobile

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
  cross-platform hiding, and project-wide config that per-file linters can't
  see — orientation locks in `app.json`, `AndroidManifest.xml`, `Info.plist` —
  from the same engine as web.
- **The WCAG 2.2 web criteria jsx-a11y lacks.** Color contrast, target size,
  label-in-name, pointer cancellation, viewport zoom and reading order — each
  mapped to a success criterion with a link to the W3C Understanding page.
- **Complements eslint-plugin-jsx-a11y, doesn't fight it.** The web pack
  contains none of the rules jsx-a11y already does, so the two run together with
  no double-reporting — run both for broader automated coverage, then use the
  manual checklist for the remaining criteria.
- **Project-wide and conformance-aware.** A WCAG 2.2 coverage report plus
  cross-file label resolution and project-config checks that per-file ESLint
  rules structurally can't do.
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

# see every rule with severity + WCAG mapping
npx @aishware/react-a11y --list-rules

# WCAG 2.2 success-criteria coverage report
npx @aishware/react-a11y --coverage
```

To see every native rule fire on realistic screens, scan the
[kitchen-sink example](examples/native-violations) in this repo — each
violation is annotated with the rule it triggers:

```sh
git clone https://github.com/1aishwaryasharma/react-a11y && cd react-a11y
npx @aishware/react-a11y examples/native-violations
```

### How it fits with eslint-plugin-jsx-a11y

For **web**, keep running `eslint-plugin-jsx-a11y` in your ESLint config — it's
the canonical implementation of the standard web a11y rules. react-a11y's web
pack deliberately contains only what jsx-a11y doesn't (the WCAG 2.2 criteria,
document structure, focus visibility, and project-wide checks), so the two don't
double-report. Run **both** for broader automated coverage, then work through
the manual checklist for the criteria no static tool can decide — see the
[CI example](#ci-github-actions) below.

For **React Native**, react-a11y provides a 25-rule static pack that goes
beyond per-line linting — focus and reading order, touch targets, text scaling,
and project-config checks. If you already run
[`eslint-plugin-react-native-a11y`](https://github.com/FormidableLabs/eslint-plugin-react-native-a11y),
react-a11y covers similar per-line ground plus the structural and project-wide
checks a per-file linter can't do (a [parity test](#staying-current-with-upstream-a11y-vocabulary)
keeps our role vocabulary in sync with it). You generally don't need both
native rule packs; if you do run both, disable the overlapping per-line rules
on one side to avoid duplicate diagnostics. Static analysis of any kind
cannot reproduce a rendered app, screen reader, or device settings; use the
[manual accessibility testing guide](docs/manual-testing.md) alongside it.

Install it globally (or as a dev dependency) to get the bare `react-a11y`
command:

```sh
npm install -g @aishware/react-a11y   # then: react-a11y .
```

### VS Code extension

The [`packages/vscode`](packages/vscode) extension surfaces the same rules
live as you type — squiggles with WCAG citations, clickable rule docs,
💡 quick fixes for the mechanical issues, and fix-on-save.

**Install** (before the first Marketplace publication, build the `.vsix`):

```sh
npm install && npm run build
npm run package -w packages/vscode
code --install-extension packages/vscode/react-a11y-0.4.0.vsix
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

**Live linting is per file.** The squiggles you see as you type come from
per-file analysis, so they do **not** include the project-wide checks —
cross-file label resolution (`form-control-has-label`) and Expo config
(`no-orientation-lock`). Run **react-a11y: Scan workspace (project-wide checks)**
from the command palette to run those across the whole project and populate the
Problems panel; the CLI runs them automatically on a full scan.

| Setting | Default | Description |
| --- | --- | --- |
| `react-a11y.enable` | `true` | Toggle diagnostics. |
| `react-a11y.platform` | `auto` | Force `web` or `native` instead of auto-detection. |

### WebStorm / JetBrains plugin

The [`packages/webstorm`](packages/webstorm) plugin brings the same rules to
WebStorm and every other JetBrains IDE with the JavaScript plugin (IntelliJ
IDEA Ultimate, PhpStorm, PyCharm Professional, Rider): live diagnostics with
WCAG citations, Alt+Enter quick fixes, a fix-all-in-file intention, and
**Tools → react-a11y: Scan Project** for the project-wide checks. It shells
out to a bundled, version-pinned copy of the CLI, so it needs Node.js 20+ on
the machine. It does not start external processes until the IDE marks the
project as trusted.

**Install** (before the first Marketplace publication, build the zip):

```sh
npm install
cd packages/webstorm && ./gradlew buildPlugin
```

Then in the IDE: Settings → Plugins → ⚙ → **Install Plugin from Disk** →
`packages/webstorm/build/distributions/react-a11y-0.4.0.zip`. Configuration
lives under **Settings → Tools → react-a11y**; see the
[plugin README](packages/webstorm/README.md) for details.

### Expo / React Native projects

No setup needed — `npx @aishware/react-a11y .` detects `react-native`/`expo` in
package.json and runs the native rule pack, including project-config checks
that go beyond JSX. Orientation locks (WCAG 1.3.4) are flagged wherever they
live:

```
$ npx @aishware/react-a11y .

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

The repo ships a composite action — one `uses:` line adds the scan to any
workflow, with optional SARIF for GitHub code scanning:

```yaml
- uses: 1aishwaryasharma/react-a11y@main
  with:
    path: .                 # directory to scan (default: .)
    fail-on: serious        # gate severity (default: serious)
    sarif-file: a11y.sarif  # optional — upload with codeql-action below
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: a11y.sarif
```

Or run it by hand next to your existing `eslint-plugin-jsx-a11y` setup —
together they cover Level A+AA web a11y, and react-a11y adds React Native:

```yaml
- name: ESLint (incl. eslint-plugin-jsx-a11y) — standard web a11y
  run: npx eslint .

- name: react-a11y — WCAG 2.2, React Native, project-wide
  run: npx @aishware/react-a11y . --format sarif --output a11y.sarif --fail-on none
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: a11y.sarif
```

The matching ESLint config (`eslint-plugin-jsx-a11y` owns the web rules
react-a11y intentionally omits):

```js
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  jsxA11y.flatConfigs.recommended, // alt-text, aria-*, role semantics, …
];
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

- **Web** — 22 rules, none of which overlap eslint-plugin-jsx-a11y: color
  contrast, target size, label-in-name, pointer cancellation, viewport zoom,
  meta-refresh, reading order, document structure (heading order, lists, tables,
  fieldsets, duplicate landmarks), focus visibility, ARIA required-context, the
  WCAG 2.2 form criteria (error identification, accessible authentication,
  autocomplete-off), and a project-wide cross-file label check ESLint can't do.
  Run jsx-a11y for the standard web rules. [Full list →](docs/rules/web.md)
- **React Native** — 25 rules covering touchable labels/roles, nested
  touchables, WCAG 2.5.8 touch-target size, color contrast, images, text
  inputs, switches, text scaling, hints, modal keyboard traps, live regions,
  state/value shape and role/state consistency, silent prop typos,
  accessibility actions, cross-platform hiding, **focus and reading order**
  (`accessible={true}` grouping that swallows interactive children, or
  descriptors dropped for lack of it), and orientation locks in project config
  (app.json, AndroidManifest, Info.plist).
  [Full list →](docs/rules/native.md)

`npx @aishware/react-a11y --coverage` reports WCAG 2.2 coverage: react-a11y
automates **25 of the 55 Level A+AA criteria (45%)** on its own, and **31/55
(56%)** when run alongside eslint-plugin-jsx-a11y. The remaining 24 — things
like reflow, use of color, and consistent navigation that a static tool cannot
decide — are listed as a manual checklist, so all 55 A+AA criteria are addressed
by a rule (here or in jsx-a11y) or an explicit verification step.

### What static analysis cannot check

Focus movement after navigation, modal containment, dynamic announcements,
rendered text scaling, theme-dependent contrast, effective touch geometry,
Reduce Motion behavior, gesture alternatives, captions, and the actual
VoiceOver/TalkBack experience all depend on runtime behavior. Follow the
[manual accessibility testing guide](docs/manual-testing.md) for a practical
real-device checklist and suggested release routine.

## Architecture

```
packages/
  core/           @aishware/react-a11y-core — parsing (TS compiler API), normalized JSX
                  element model, rule engine, WCAG 2.2 metadata, JSON/SARIF
                  reporters. Platform-agnostic.
  rules-web/      @aishware/react-a11y-rules-web — the WCAG 2.2 / structure / focus rules
                  jsx-a11y doesn't cover (complement, not replacement)
  rules-native/   @aishware/react-a11y-rules-native — rules for React Native/Expo
  cli/            react-a11y — zero-config CLI, pretty/JSON/SARIF output
  vscode/         react-a11y — VS Code extension: live diagnostics,
                  quick fixes, fix-on-save (esbuild-bundled, ships as .vsix)
  webstorm/       react-a11y — JetBrains plugin (Kotlin): live diagnostics,
                  quick fixes, project scan; drives the esbuild-bundled CLI
                  over --stdin (Gradle build, ships as a plugin zip)
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
import { analyze } from '@aishware/react-a11y-core';
import { webRules } from '@aishware/react-a11y-rules-web';

const diagnostics = analyze({ code, filename: 'App.tsx', platform: 'web', rules: webRules });
```

## Development

```sh
npm install
npm run build     # tsc -b across all packages
npm test          # vitest
node packages/cli/dist/index.js examples/web-demo
node packages/cli/dist/index.js examples/native-demo
node packages/cli/dist/index.js examples/native-violations   # every native rule fires
```

### Publishing (maintainers)

Four packages publish to npm under the `@aishware` scope — the engine
(`@aishware/react-a11y-core`), both rule packs, and the CLI (`@aishware/react-a11y`). They
must go out in dependency order; `npm run release` builds, tests, and publishes
all four in that order. One-time setup: own the `@aishware` scope (it's automatic if
your npm username is `aishware`, otherwise create a free org named `aishware` under
Settings → organizations), then `npm login`. Run with nvm's node so the test
step doesn't hit the hardened-runtime addon issue.

```sh
npm version patch --workspaces --include-workspace-root   # bump all packages in lockstep
npm run release                                           # build + test + publish core → rules → cli
```

`publishConfig.access` is set to `public` on every package, so no `--access`
flag is needed. The VS Code extension (`packages/vscode`) is `private` and
ships as a `.vsix`, not to npm. See the
[VS Code publishing guide](docs/publishing-vscode.md) for its separate
Marketplace release process. The JetBrains plugin (`packages/webstorm`)
likewise ships as a plugin zip built with Gradle — see the
[JetBrains publishing guide](docs/publishing-webstorm.md).

### Staying current with upstream a11y vocabulary

Deferring standard web rules to `eslint-plugin-jsx-a11y` removed almost all of
the vocabulary this project has to keep in sync — jsx-a11y and `aria-query` now
own that surface. The one curated list that still mirrors an upstream is the
React Native `accessibilityRole` set (`RN_ROLES`). A parity test
(`packages/rules-native/test/upstream-parity.test.ts`) reads the role list out
of `eslint-plugin-react-native-a11y` (a devDependency) and fails if it accepts a
role we don't — so when React Native adds one, the test names it. Keep the
devDependency current (e.g. with Renovate) and that test is the drift signal.

## Roadmap

- ~~Broader rule coverage~~ ✓ 47 rules (22 web + 25 native), zero overlap with jsx-a11y; 31/55 A+AA automated with jsx-a11y, the remaining 24 documented as manual checks
- ~~Color-contrast checks for statically-known styles~~ ✓ web + native
- ~~Heading-order and landmark analysis~~ ✓
- ~~Autofixes for mechanical findings~~ ✓ `--fix` (e.g. miscapitalized React Native accessibility props)
- ~~Cross-file label resolution (`htmlFor` ↔ `id`)~~ ✓ project-wide pass
- ~~`--changed` mode~~ ✓ scan only files changed in git
- ~~Editor integration~~ ✓ VS Code extension with quick fixes and fix-on-save
- ~~WebStorm/JetBrains integration~~ ✓ Kotlin plugin driving the CLI over `--stdin` (live diagnostics, quick fixes, project scan)
- ~~Expo/native config checks~~ ✓ orientation locks in app.json, app.config.*, AndroidManifest, Info.plist

Noted for later (not started):

- Marketplace publishing for the VS Code extension (icon, publisher account)
  and the JetBrains plugin (vendor account on JetBrains Marketplace)
- LSP server for other editors (Neovim, Helix) on top of `analyze()` — the
  CLI's `--stdin` mode already covers simple integrations
- Rules for `experimental_accessibilityOrder` (RN 0.82+'s focus-order prop)
  once it stabilizes — e.g. referenced `nativeID`s that don't exist

## License

MIT
