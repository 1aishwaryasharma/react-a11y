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
| [aria-state-valid](#aria-state-valid) | serious/moderate | 4.1.2 |
| [live-region-valid](#live-region-valid) | serious | 4.1.3 |
| [no-hidden-interactive](#no-hidden-interactive) | serious | 4.1.2, 1.3.1 |
| [accessibility-actions-handled](#accessibility-actions-handled) | serious | 4.1.2 |
| [valid-important-for-accessibility](#valid-important-for-accessibility) | moderate | 4.1.2, 1.3.1 |
| [hidden-cross-platform](#hidden-cross-platform) | moderate | 1.3.1, 4.1.2 |
| [accessible-grouping-hides-interactive](#accessible-grouping-hides-interactive) | serious | 2.4.3, 4.1.2 |
| [label-needs-accessible](#label-needs-accessible) | moderate | 1.3.2, 4.1.2 |
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

`accessibilityRole` and `role` values React Native does not recognize are
silently ignored on device. The two props use different vocabularies — `role`
(the recommended spelling since RN 0.71) takes ARIA names, so it's
`role="heading"` but `accessibilityRole="header"`, `role="img"` but
`accessibilityRole="image"`. When a value from one vocabulary is used with the
other prop, the message names the correct equivalent.

## valid-accessibility-props

Misspelled props (`accessibilitylabel`, `aria-labeledby`, `aria-Label`, …)
fail silently at runtime. Catches casing mistakes and misspellings in both the
`accessibility*` and `aria-*` prop families, with a rename fix when the
intended prop is clear. Unknown `aria-*` props with no close match are left
alone — react-native-web forwards them, so they may be intentional.

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

## aria-state-valid

Flags string values on the boolean `aria-*` state props (`aria-checked`,
`aria-selected`, `aria-disabled`, …): unlike the DOM, React Native treats
these as plain JS values, so `aria-checked="false"` is a truthy string and
screen readers announce the checkbox as **checked**. Use
`aria-checked={false}` (booleans, or `"mixed"` for tri-state checkboxes).
String `"true"` values work by accident and are reported at moderate severity.

## live-region-valid

`accessibilityLiveRegion` (none/polite/assertive) and `aria-live`
(off/polite/assertive) with invalid values mean status changes are never
announced (WCAG 4.1.3).

## no-hidden-interactive

A touchable or `TextInput` hidden from assistive technology
(`accessibilityElementsHidden`, `importantForAccessibility="no"`, …) is still
tappable — a control screen reader users cannot even discover.

## accessibility-actions-handled

`accessibilityActions` declares custom actions; `onAccessibilityAction` handles
them. One without the other is a silent no-op — declared actions that are never
reachable, or a handler that never receives anything.

## valid-important-for-accessibility

`importantForAccessibility` (Android) only accepts `auto`, `yes`, `no` and
`no-hide-descendants`. Any other value is silently ignored.

## hidden-cross-platform

`accessibilityElementsHidden` hides a subtree from VoiceOver on **iOS only**;
`importantForAccessibility="no-hide-descendants"` hides it from TalkBack on
**Android only**. Using one without the other (and without the unified
`aria-hidden`) leaves the content exposed on the other platform.

## Focus and reading order

React Native decides screen-reader focus order from `accessible={true}`
grouping: a view marked `accessible` collapses itself **and all its children**
into a single focus stop and concatenates their labels. The docs note a
component "cannot be both an accessibility element and an accessibility
container", so the two rules below catch the deterministic ends of that rule.

## accessible-grouping-hides-interactive

`accessible={true}` on a `View` (or `SafeAreaView`) that contains a touchable,
`TextInput`, `Switch`, or any element marked `accessible` collapses them into
one focus stop — the inner control is no longer separately focusable and the
reading order silently changes. Group only non-interactive content; keep
interactive children outside the grouped container.

```tsx
// ✖ the Pressable is swallowed and unreachable
<View accessible={true}>
  <Text>Profile</Text>
  <Pressable accessibilityRole="button" onPress={edit}><Text>Edit</Text></Pressable>
</View>

// ✔ group only the label content
<View>
  <View accessible={true}><Text>Profile</Text></View>
  <Pressable accessibilityRole="button" accessibilityLabel="Edit" onPress={edit}><Text>Edit</Text></Pressable>
</View>
```

## label-needs-accessible

`accessibilityLabel`, `accessibilityHint`, `accessibilityValue` and
`accessibilityState` describe an accessibility element, but a plain `View` is
not one unless `accessible={true}` is set. Without it the descriptor is dropped
and the screen reader reads each child in source order instead of the intended
grouped label — a common cause of wrong or overly verbose reading order. A
dynamic `accessible={…}` is given the benefit of the doubt.

```tsx
// ✖ label dropped; the four stars are read one by one
<View accessibilityLabel="Rating: 4 of 5"><Star /><Star /><Star /><Star /><Star /></View>

// ✔
<View accessible={true} accessibilityLabel="Rating: 4 of 5"><Star /><Star /><Star /><Star /><Star /></View>
```

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
