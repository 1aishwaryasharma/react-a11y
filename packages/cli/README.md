# @react-a11y/cli

A **static accessibility scanner** for React and React Native. It analyzes your
TSX/JSX with the TypeScript compiler and reports WCAG 2.2 issues with
`file:line` locations — no browser, no rendering, no configuration.

The installed command is **`react-a11y`**.

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

# every rule with severity + WCAG mapping, or the coverage report
npx @react-a11y/cli --list-rules
npx @react-a11y/cli --coverage
```

Install globally to get the bare `react-a11y` command:

```sh
npm install -g @react-a11y/cli
react-a11y .
```

Full documentation, rule list and configuration:
<https://github.com/1aishwaryasharma/react-a11y>

## License

MIT
