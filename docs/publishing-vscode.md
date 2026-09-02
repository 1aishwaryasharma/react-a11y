# Publishing the VS Code extension

The extension lives in `packages/vscode` and is published independently from
the npm packages. Its Marketplace identifier is
`aishwaryasharma.react-a11y`.

## First publication

1. Create the `aishwaryasharma` publisher at the
   [Visual Studio Marketplace publisher portal](https://marketplace.visualstudio.com/manage/publishers/).
   The publisher ID must exactly match `publisher` in the extension manifest.
2. Run the release checks from the repository root:

   ```sh
   npm ci
   npm test
   npm run typecheck -w packages/vscode
   npm run package -w packages/vscode
   ```

3. Install the generated package and smoke-test it in web and React Native
   projects:

   ```sh
   code --install-extension packages/vscode/react-a11y-0.5.0.vsix
   ```

4. Upload that tested VSIX through the publisher portal. Manual upload is the
   simplest first-release path and does not require storing a publishing
   credential.

## Subsequent releases

1. Update `version` in `packages/vscode/package.json`.
2. Add the release notes to `packages/vscode/CHANGELOG.md`.
3. Run the checks above and test the generated VSIX.
4. Upload the VSIX or publish it from `packages/vscode`:

   ```sh
   npx vsce publish --no-dependencies
   ```

Microsoft recommends Microsoft Entra ID for automated publishing. Azure DevOps
global personal access tokens are scheduled for retirement on December 1,
2026. See the
[official publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
before adding release automation.

Do not pass a publishing token on the command line or commit it to this
repository.
