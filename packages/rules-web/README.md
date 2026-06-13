# @aish/react-a11y-rules-web

The web rule pack for [`@aish/react-a11y`](https://www.npmjs.com/package/@aish/react-a11y) —
the WCAG 2.2 criteria, document structure, focus visibility and project-wide
checks that [`eslint-plugin-jsx-a11y`](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y)
does **not** cover. Run jsx-a11y in your ESLint config for standard web a11y
(alt text, ARIA validity, role/element semantics); this pack covers the gaps
with no overlap, so the two run together cleanly.

Covers: color contrast, target size, label-in-name, pointer cancellation,
viewport zoom, meta-refresh, reading order, document structure (heading order,
lists, tables, fieldsets, duplicate landmarks), focus visibility, ARIA
required-context, the WCAG 2.2 form criteria (accessible authentication, error
identification, autocomplete-off), and cross-file `htmlFor` ↔ `id` label
resolution (a project-wide pass).

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
