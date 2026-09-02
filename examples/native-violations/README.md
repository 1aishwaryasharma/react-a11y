# native-violations

An intentionally inaccessible React Native app: **every one of the 31 native
rules fires at least once**, each violation annotated with the rule it
triggers. Use it to see the scanner's full output on realistic screens:

```sh
npx @aishware/react-a11y examples/native-violations
```

| File | Rules demonstrated |
| --- | --- |
| `screens/FeedScreen.tsx` | touchable-has-label, touchable-has-role, image-has-label, no-nested-touchables, touch-target-size (both tiers) |
| `screens/SettingsScreen.tsx` | textinput-has-label, switch-has-label, accessibility-hint-has-label, role-has-required-state, accessibility-state-valid, aria-state-valid, accessibility-value-valid, no-disable-font-scaling |
| `screens/CheckoutScreen.tsx` | modal-has-request-close, valid-accessibility-role (both vocabularies), valid-accessibility-props, live-region-valid, no-hidden-interactive, accessibility-actions-handled, valid-important-for-accessibility, hidden-cross-platform |
| `screens/ProfileScreen.tsx` | accessible-grouping-hides-interactive, label-needs-accessible, color-contrast |
| `screens/TailwindScreen.tsx` | The NativeWind / Uniwind versions of touch-target-size, touchable-has-label (icon-only), color-contrast (enclosing background, `dark:` variant, theme color from `tailwind.config.js`), plus text-fixed-height, text-onpress-has-role, label-not-all-caps, accessibility-language-valid, live-region-android-only, no-nested-touchables (native control) |
| `hooks/useSpinner.ts` | animation-reduce-motion (a plain module with no JSX) |
| `app.json` | no-orientation-lock |

The test suite asserts complete coverage
(`packages/rules-native/test/violations-showcase.test.ts`), so a new rule
cannot ship without an example here.

The per-rule explanations and correct alternatives are in the
[native rules documentation](../../docs/rules/native.md).
