# React Native rules

Rules for React Native and Expo apps, built on the same core engine as the web
pack. Components are matched import-aware: identifiers imported from modules
other than `react-native` / `react-native-gesture-handler` / `react-native-web`
are assumed to be design-system wrappers and skipped.

| Rule | Severity | WCAG |
| --- | --- | --- |
| [touchable-has-label](#touchable-has-label) | critical | 1.1.1, 4.1.2 |
| [touchable-has-role](#touchable-has-role) | serious | 4.1.2 |
| [no-nested-touchables](#no-nested-touchables) | serious | 4.1.2, 2.1.1 |
| [touch-target-size](#touch-target-size) | serious/moderate | 2.5.8, 2.5.5 |
| [image-has-label](#image-has-label) | moderate | 1.1.1 |
| [textinput-has-label](#textinput-has-label) | serious | 3.3.2, 4.1.2 |
| [valid-accessibility-role](#valid-accessibility-role) | serious | 4.1.2 |
| [valid-accessibility-props](#valid-accessibility-props) | serious | 4.1.2 |

## touchable-has-label

`Pressable`/`Touchable*` with no `accessibilityLabel` and no children is
announced as an unlabeled button. React Native aggregates `Text` descendants
into the accessible name, so any child content passes.

```tsx
// ✖
<Pressable onPress={close} />

// ✔
<Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} />
<Pressable accessibilityRole="button" onPress={save}><Text>Save</Text></Pressable>
```

## touchable-has-role

Without `accessibilityRole="button"`, VoiceOver and TalkBack announce the
content but not that it is actionable.

## no-nested-touchables

Screen readers expose only one target when touchables nest — the inner action
becomes unreachable. Restructure so touch targets are siblings.

## touch-target-size

Statically-sized touchables below 24pt violate WCAG 2.5.8 (AA, new in 2.2) —
reported as **serious**. Between 24pt and 44pt is below the WCAG 2.5.5 /
Apple HIG / Material recommendation — reported as **moderate**. `hitSlop`
counts as mitigation; dynamic styles are not guessed at.

## image-has-label

Make intent explicit: `alt`/`accessibilityLabel` for informative images,
`accessible={false}` or `alt=""` for decorative ones.

## textinput-has-label

`placeholder` disappears once the user types and is not reliably announced —
use `accessibilityLabel`.

## valid-accessibility-role

`accessibilityRole` values React Native does not recognize are silently
ignored on device.

## valid-accessibility-props

Misspelled props (`accessibilitylabel`, `accessibiltyLabel`, …) fail silently
at runtime. Catches casing mistakes and unknown `accessibility*` props, with a
suggestion when one is close.
