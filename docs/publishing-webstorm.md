# Publishing the JetBrains plugin

The plugin lives in `packages/webstorm` and is published independently from
the npm packages, to the
[JetBrains Marketplace](https://plugins.jetbrains.com/). Its plugin ID is
`com.aishware.react-a11y`.

## Prerequisites

- JDK 17+ (the Gradle build uses a Java 17 toolchain).
- Node.js and npm on PATH — the Gradle `bundleCli` task runs `npm run build`
  in `packages/webstorm` to esbuild-bundle the CLI into the plugin resources.
- `npm install` run at the repository root (registers the workspace and its
  esbuild devDependency).

## First publication

1. Create a JetBrains Marketplace vendor account and add the `aishwaryasharma`
   vendor at the [vendor portal](https://plugins.jetbrains.com/author/me).
2. Run the release checks:

   ```sh
   npm ci && npm run build && npm test
   cd packages/webstorm
   ./gradlew buildPlugin verifyPlugin
   ```

3. Smoke-test the built plugin in a sandboxed IDE (`./gradlew runIde`), or
   install `build/distributions/react-a11y-0.5.0.zip` into WebStorm via
   Settings → Plugins → ⚙ → Install Plugin from Disk. Check a web and a React
   Native project: live squiggles, Alt+Enter quick fixes, and
   **Tools → react-a11y: Scan Project**.
4. Upload the zip through the vendor portal (Upload plugin). The first upload
   creates the Marketplace listing and goes through JetBrains moderation
   (typically 1–2 business days).

## Subsequent releases

1. Update `version` in `packages/webstorm/build.gradle.kts` (keep it in
   lockstep with the monorepo version).
2. Add the release notes to `packages/webstorm/CHANGELOG.md`.
3. Run the checks above and test the generated zip.
4. Upload the zip, or publish from Gradle with a
   [permanent token](https://plugins.jetbrains.com/docs/marketplace/plugin-upload.html):

   ```sh
   PUBLISH_TOKEN=… ./gradlew publishPlugin
   ```

   (`publishPlugin` reads the token from the `PUBLISH_TOKEN` environment
   variable by default in the IntelliJ Platform Gradle Plugin.)

Do not pass a publishing token on the command line or commit it to this
repository.

## Compatibility notes

- `since-build` is 241 (2024.1). Raising it drops users on older IDEs; the
  build has no `until-build`, so new IDE releases keep working until an API
  actually breaks.
- The plugin declares `<depends>JavaScript</depends>`, so the Marketplace
  lists it for WebStorm, IntelliJ IDEA Ultimate, PhpStorm, PyCharm
  Professional, Rider, etc. — not Community editions, which lack the
  JavaScript plugin.
- `verifyPlugin` runs the JetBrains Plugin Verifier against WebStorm 2024.1
  (the oldest supported release) and the latest WebStorm release; treat
  compatibility failures as release blockers.
