# react-a11y for WebStorm (and other JetBrains IDEs)

Inline WCAG 2.2 accessibility diagnostics for React and React Native,
powered by the [react-a11y](https://github.com/1aishwaryasharma/react-a11y)
static analyzer. No browser or application build is required, and analysis
runs locally as you type.

Works in every JetBrains IDE that ships the JavaScript plugin: WebStorm,
IntelliJ IDEA Ultimate, PhpStorm, PyCharm Professional, Rider, and more.

## Features

- **Live diagnostics** in JS/JSX/TS/TSX with severity mapped to the IDE
  (critical/serious → error, moderate → warning, minor → weak warning).
  Every finding cites its WCAG success criteria and links to the rule docs
  from the tooltip.
- **Quick fixes (Alt+Enter)** for mechanically-safe issues — e.g.
  miscapitalized React Native `accessibility*` props — plus a
  *Fix all react-a11y issues in file* intention.
- **Platform auto-detection** (React Native/Expo → native rule pack), and
  full support for `react-a11y.config.json` rule overrides and ignore globs.
- **Project-wide checks** through **Tools → react-a11y: Scan Project**,
  which also runs the cross-file passes (label resolution, Expo config)
  and lists results in a console with clickable locations.

The plugin uses its bundled, version-pinned react-a11y CLI, so nothing needs
to be installed in your project. It does not start Node or any other external
process until the IDE marks the project as trusted. Node.js 20+ must be
available on your machine.

Static analysis cannot reproduce a rendered app, assistive technology, or
device settings; use the
[manual accessibility testing guide](https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/manual-testing.md)
alongside it.

## Settings

**Settings → Tools → react-a11y**

| Setting | Default | Description |
| --- | --- | --- |
| Enable diagnostics | on | Toggle live analysis. |
| Rule pack | `auto` | `web`, `native`, or auto-detect from package.json. |
| Node.js executable | blank | Auto-detected from PATH, Homebrew, nvm, volta, fnm. |
| CLI script | blank | Bundled copy. A custom path is an explicit local override. |

## Privacy

Analysis runs entirely on your machine. The plugin does not upload source
code or require an account.

## Issues

Report bugs and false positives on
[GitHub](https://github.com/1aishwaryasharma/react-a11y/issues).

## Development

The Kotlin plugin shells out to the react-a11y CLI (bundled into its
resources with esbuild) over `--stdin`/`--format json`.

```sh
npm install                            # at the repo root
cd packages/webstorm
./gradlew buildPlugin                  # produces build/distributions/react-a11y-<version>.zip
./gradlew runIde                       # launches a sandboxed IDE with the plugin
```

The Gradle build regenerates the bundled CLI from the sibling workspaces
automatically (the `bundleCli` task runs `npm run build` in this package).
Install the zip in an IDE via Settings → Plugins → ⚙ → Install Plugin from
Disk.
