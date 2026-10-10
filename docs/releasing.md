# Releasing

All packages share one version. Pushing a `vX.Y.Z` tag runs
`.github/workflows/release.yml`, which tests the tagged commit, publishes the
four npm packages with provenance, creates the GitHub release from the
changelog, and moves the `v1` action tag. The VS Code extension and the
JetBrains plugin are published by hand: see
[publishing-vscode.md](publishing-vscode.md) and
[publishing-webstorm.md](publishing-webstorm.md).

## One-time npm setup

For each of `@aishware/react-a11y-core`, `@aishware/react-a11y-rules-web`,
`@aishware/react-a11y-rules-native` and `@aishware/react-a11y`, open the
package's settings on npmjs.com and add a trusted publisher: GitHub Actions,
repository `1aishwaryasharma/react-a11y`, workflow `release.yml`. No token is
stored.

Until that is set up, an automation token in the `NPM_TOKEN` repository secret
works instead.

## Cutting a release

1. Bump every package to the new version: the `package.json` files (including
   the `@aishware/*` dependency ranges), `packages/webstorm/build.gradle.kts`,
   the `version` default in `action.yml`, and the version shown in the READMEs
   and publishing docs. `release-versions.test.ts` fails if any of them
   disagree.
2. Move `[Unreleased]` in `CHANGELOG.md` under a dated heading for the
   version, and add entries to the VS Code and JetBrains changelogs.
3. Merge, then tag the merge commit and push the tag:

   ```sh
   git tag v0.6.0 && git push origin v0.6.0
   ```

A rerun after a partial failure skips the packages already on npm.
