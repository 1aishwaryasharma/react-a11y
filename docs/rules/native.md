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
| [switch-has-label](#switch-has-label) | serious | 4.1.2, 3.3.2 |
| [modal-has-request-close](#modal-has-request-close) | serious | 2.1.2 |
| [valid-accessibility-role](#valid-accessibility-role) | serious | 4.1.2 |
| [valid-accessibility-props](#valid-accessibility-props) | serious | 4.1.2 |
| [accessibility-state-valid](#accessibility-state-valid) | serious | 4.1.2 |
| [live-region-valid](#live-region-valid) | serious | 4.1.3 |
| [no-hidden-interactive](#no-hidden-interactive) | serious | 4.1.2, 1.3.1 |
| [color-contrast](#color-contrast) | serious | 1.4.3 |
| [no-orientation-lock](#no-orientation-lock) | moderate | 1.3.4 |

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

## switch-has-label

An unlabeled `<Switch>` is announced as just "switch, off" with no indication
of what it controls.

## modal-has-request-close

Without `onRequestClose`, the Android hardware back button does nothing — the
modal becomes a keyboard trap for hardware-navigation users (WCAG 2.1.2).

## accessibility-state-valid

`accessibilityState` only supports `disabled`, `selected`, `checked`, `busy`,
`expanded`; `accessibilityValue` only `min`, `max`, `now`, `text`. Unknown
keys are silently dropped on device.

## live-region-valid

`accessibilityLiveRegion` (none/polite/assertive) and `aria-live`
(off/polite/assertive) with invalid values mean status changes are never
announced (WCAG 4.1.3).

## no-hidden-interactive

A touchable or `TextInput` hidden from assistive technology
(`accessibilityElementsHidden`, `importantForAccessibility="no"`, …) is still
tappable — a control screen reader users cannot even discover.

## color-contrast

Computes the WCAG 1.4.3 contrast ratio when `color` and `backgroundColor` are
inline literals on the same element. `StyleSheet.create` references and
dynamic styles are skipped — *partial* coverage by design.

## no-orientation-lock

A project-level check (not a JSX rule): flags orientation locks wherever they
are declared — Expo `app.json` / `app.config.{js,ts}` (`orientation:
"portrait"`/`"landscape"`), `AndroidManifest.xml`
(`android:screenOrientation`), and iOS `Info.plist`
(`UISupportedInterfaceOrientations` listing a single orientation family).
WCAG 1.3.4 (AA) requires both orientations unless one is essential — users
with wheelchair-mounted devices cannot rotate. Runtime locks via
`expo-screen-orientation` are out of static reach, hence *partial*.
