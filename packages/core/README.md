# @aishware/react-a11y-core

Platform-agnostic static-analysis engine behind
[`@aishware/react-a11y`](https://www.npmjs.com/package/@aishware/react-a11y). Parses
TSX/JSX with the TypeScript compiler API into a normalized `ElementNode` model,
runs a rule engine over it, and emits diagnostics mapped to WCAG 2.2.
Web and React Native rule packs are built on this same engine.

Use it to embed accessibility checks in editor extensions, custom CI, or agents:

```ts
import { analyze } from '@aishware/react-a11y-core';
import { webRules } from '@aishware/react-a11y-rules-web';

const diagnostics = analyze({
  code,
  filename: 'App.tsx',
  platform: 'web',
  rules: webRules,
});
```

It also exports `scanProject`, `applyFixes`, the WCAG 2.2 metadata
(`WCAG22_TOTALS`, `MANUAL_CHECKS`), color/contrast helpers, and the SARIF
reporter.

Full documentation: <https://github.com/1aishwaryasharma/react-a11y>

## License

MIT
