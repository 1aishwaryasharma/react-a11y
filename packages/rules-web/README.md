# @aish/react-a11y-rules-web

WCAG 2.2 accessibility rules for React DOM and other React web frameworks.
A rule pack for the
[`@aish/react-a11y-core`](https://www.npmjs.com/package/@aish/react-a11y-core) engine —
covering alternative text, accessible names, ARIA 1.2 validity, document
structure, keyboard access and focus visibility, color contrast and target
size, forms, media, and document language.

```ts
import { analyze } from '@aish/react-a11y-core';
import { webRules } from '@aish/react-a11y-rules-web';

const diagnostics = analyze({ code, filename: 'App.tsx', platform: 'web', rules: webRules });
```

Most users want the CLI instead:
[`@aish/react-a11y`](https://www.npmjs.com/package/@aish/react-a11y).

Full rule list: <https://github.com/1aishwaryasharma/react-a11y/blob/main/docs/rules/web.md>

## License

MIT
