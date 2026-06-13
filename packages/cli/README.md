# @aish/react-a11y

A **static accessibility scanner** for React and React Native. It analyzes your
TSX/JSX with the TypeScript compiler and reports WCAG 2.2 issues with
`file:line` locations — no browser, no rendering, no configuration.

The installed command is **`react-a11y`**.

```sh
# audit the current project (platform auto-detected from package.json)
npx @aish/react-a11y .

# explicit platform
npx @aish/react-a11y apps/mobile --platform native

# machine-readable output
npx @aish/react-a11y . --format json
npx @aish/react-a11y . --format sarif --output a11y.sarif   # GitHub code scanning

# gate CI: exit 1 when serious or critical issues exist (default)
npx @aish/react-a11y . --fail-on serious

# apply safe mechanical fixes (ARIA casing, redundant roles, RN prop typos, …)
npx @aish/react-a11y . --fix

# scan only files changed in git — fast PR checks
npx @aish/react-a11y . --changed

# every rule with severity + WCAG mapping, or the coverage report
npx @aish/react-a11y --list-rules
npx @aish/react-a11y --coverage
```

Install globally to get the bare `react-a11y` command:

```sh
npm install -g @aish/react-a11y
react-a11y .
```

Full documentation, rule list and configuration:
<https://github.com/1aishwaryasharma/react-a11y>

## License

MIT
