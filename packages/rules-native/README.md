# @aishware/react-a11y-rules-native

Accessibility rules for React Native and Expo, built on the shared
[`@aishware/react-a11y-core`](https://www.npmjs.com/package/@aishware/react-a11y-core) engine.
Covers touchable labels/roles, nested touchables, WCAG 2.5.8 touch-target size,
color contrast, images, text inputs, switches, modal keyboard traps, live
regions, accessibility state/value props, silent prop typos, accessibility
actions, cross-platform hiding (iOS vs Android), focus and reading order
(`accessible={true}` grouping), and orientation locks in project config
(`app.json`, `app.config.*`, `AndroidManifest.xml`, `Info.plist`).

```ts
import { analyze } from '@aishware/react-a11y-core';
import { nativeRules } from '@aishware/react-a11y-rules-native';

const diagnostics = analyze({ code, filename: 'App.tsx', platform: 'native', rules: nativeRules });
```

Most users want the CLI instead:
[`@aishware/react-a11y`](https://www.npmjs.com/package/@aishware/react-a11y).

Full rule list: <https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/rules/native.md>

## License

MIT
