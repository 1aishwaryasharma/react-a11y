# React Native rules

Rules for React Native and Expo apps, built on the same core engine as the web
pack. Components are matched import-aware: identifiers imported from modules
other than `react-native` / `react-native-gesture-handler` / `react-native-web`
are assumed to be design-system wrappers and skipped.

Style-dependent rules (touch-target-size, color-contrast, text-fixed-height)
read inline `style` literals **and** Tailwind utility classes — NativeWind and
Uniwind `className`, twrnc `` tw`…` `` — when a Tailwind binding is a
dependency. See [Tailwind, NativeWind and Uniwind](#tailwind-nativewind-and-uniwind).

| Rule | Severity | WCAG |
| --- | --- | --- |
| [touchable-has-label](#touchable-has-label) | critical | 1.1.1, 4.1.2 |
| [touchable-has-role](#touchable-has-role) | serious | 4.1.2 |
| [no-nested-touchables](#no-nested-touchables) | serious | 4.1.2, 2.1.1 |
| [touch-target-size](#touch-target-size) | serious/moderate | 2.5.8, 2.5.5 |
| [image-has-label](#image-has-label) | moderate | 1.1.1 |
| [textinput-has-label](#textinput-has-label) | serious | 3.3.2, 4.1.2 |
| [switch-has-label](#switch-has-label) | serious | 4.1.2, 3.3.2 |
| [accessibility-hint-has-label](#accessibility-hint-has-label) | serious | 3.3.2, 4.1.2 |
| [modal-has-request-close](#modal-has-request-close) | serious | 2.1.2 |
| [valid-accessibility-role](#valid-accessibility-role) | serious | 4.1.2 |
| [valid-accessibility-props](#valid-accessibility-props) | serious | 4.1.2 |
| [accessibility-state-valid](#accessibility-state-valid) | serious | 4.1.2 |
| [accessibility-value-valid](#accessibility-value-valid) | serious | 4.1.2 |
| [aria-state-valid](#aria-state-valid) | serious/moderate | 4.1.2 |
| [live-region-valid](#live-region-valid) | serious | 4.1.3 |
| [role-has-required-state](#role-has-required-state) | serious | 4.1.2 |
| [no-hidden-interactive](#no-hidden-interactive) | serious | 4.1.2, 1.3.1 |
| [accessibility-actions-handled](#accessibility-actions-handled) | serious | 4.1.2 |
| [valid-important-for-accessibility](#valid-important-for-accessibility) | moderate | 4.1.2, 1.3.1 |
| [hidden-cross-platform](#hidden-cross-platform) | moderate | 1.3.1, 4.1.2 |
| [accessible-grouping-hides-interactive](#accessible-grouping-hides-interactive) | serious | 2.4.3, 4.1.2 |
| [label-needs-accessible](#label-needs-accessible) | moderate | 1.3.2, 4.1.2 |
| [color-contrast](#color-contrast) | serious | 1.4.3 |
| [no-disable-font-scaling](#no-disable-font-scaling) | serious | 1.4.4 |
| [text-fixed-height](#text-fixed-height) | moderate | 1.4.4 |
| [text-onpress-has-role](#text-onpress-has-role) | serious | 4.1.2 |
| [label-not-all-caps](#label-not-all-caps) | minor | 4.1.2 |
| [accessibility-language-valid](#accessibility-language-valid) | moderate | 3.1.2 |
| [live-region-android-only](#live-region-android-only) | moderate | 4.1.3 |
| [animation-reduce-motion](#animation-reduce-motion) | moderate/serious | 2.2.2, 2.3.3 |
| [no-orientation-lock](#no-orientation-lock) | moderate | 1.3.4 |

## touchable-has-label

`Pressable`/`Touchable*` with no `accessibilityLabel` and no naming content is
announced as an unlabeled button. React Native aggregates `Text` descendants
into the accessible name, so text-like content passes — but an unlabeled
`<Image>` or a glyph from an icon library (`@expo/vector-icons`,
`react-native-vector-icons`, `lucide-react-native`, `react-native-svg`, …) is
silent, which is the classic "icon button reads as nothing" bug.

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
becomes unreachable. The same happens to a `Switch`, `TextInput`, `Button` or
pressable `Text` placed inside a touchable: the outer touchable becomes a
single accessibility element and swallows the control. Restructure so
interactive elements are siblings, or expose the inner action through
`accessibilityActions` (cards that need both a card action and inner buttons
can use a library such as `react-native-a11y-order`).

## touch-target-size

Statically-sized touchables below 24pt violate WCAG 2.5.8 (AA, new in 2.2) —
reported as **serious**. Between 24pt and 44pt is below the WCAG 2.5.5 /
Apple HIG / Material recommendation — reported as **moderate**. Sizes come
from inline literals (`style={{ width: 20 }}`, including array styles) and
from Tailwind classes (`h-6 w-6`, `size-8`, `h-[20px]`, `min-h-11`); a single
known dimension below the threshold is enough. `hitSlop` counts as
mitigation; dynamic styles are not guessed at.

Note the rem base: on NativeWind v4 `h-6` is 21pt (14px rem), on Uniwind,
NativeWind v5 and the web it is 24px.

```tsx
// ✖ 21×21 on NativeWind v4
<Pressable accessibilityRole="button" accessibilityLabel="Close" className="h-6 w-6" onPress={close} />

// ✔
<Pressable accessibilityRole="button" accessibilityLabel="Close" className="h-11 w-11" onPress={close} />
```

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

## accessibility-hint-has-label

An `accessibilityHint` explains the result of an action; it cannot identify the
element by itself. A hint therefore needs an accessible name from
`accessibilityLabel`, an ARIA label, or text content. Hints remain optional when
the action is already clear from the name.

```tsx
// ✖ announces an outcome without identifying the control
<Pressable accessibilityHint='Closes this screen' accessibilityRole='button' />

// ✔
<Pressable
  accessibilityHint='Closes this screen'
  accessibilityLabel='Close'
  accessibilityRole='button'
/>
```

## modal-has-request-close

Without `onRequestClose`, the Android hardware back button does nothing — the
modal becomes a keyboard trap for hardware-navigation users (WCAG 2.1.2).

## accessibility-state-valid

`accessibilityState` must be an object and only supports `disabled`, `selected`,
`checked`, `busy`, and `expanded`. State values are booleans, except `checked`
also accepts `"mixed"`. Invalid shapes, keys, and literal value types are
ignored or misannounced on device.

## accessibility-value-valid

`accessibilityValue` must be an object containing a string `text` value and/or
numeric `min`/`now`/`max` range information. When `now` is present, React
Native requires both `min` and `max`; `text` may coexist and overrides the
numeric announcement. The rule rejects scalar values, unknown keys, known
wrong value types, missing bounds, and statically impossible ranges where
`now` falls outside `min`/`max`. Dynamic expressions are left to runtime
testing.

```tsx
// ✖
<View accessibilityValue={{ now: 50 }} />
<View accessibilityValue={{ max: 100, min: 0, now: 150 }} />

// ✔
<View accessibilityValue={{ max: 100, min: 0, now: 50 }} />
<View accessibilityValue={{ text: 'Half full' }} />
```

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

## role-has-required-state

Custom checkboxes, radios, switches, and toggle buttons need a `checked`
state; tabs need a `selected` state. Otherwise assistive technology announces
the type of control but not its current value. The stock React Native
`<Switch>` is excluded because its native `value` supplies the state.

```tsx
// ✖
<View accessibilityLabel='Terms' role='checkbox' />

// ✔
<View
  accessibilityLabel='Terms'
  accessibilityState={{ checked }}
  role='checkbox'
/>
```

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

Computes the WCAG 1.4.3 contrast ratio for `Text` whose color is statically
known — an inline literal or a Tailwind class (`text-gray-400`) — against the
background of the `Text` itself or of the nearest enclosing `View` with a
known background (React Native paints the parent behind the text). Tailwind
`dark:` variants and conditional class sets from `cn()` / `clsx()` are checked
separately, so a pair that passes in light mode but fails in dark mode is
reported. `disabled:` and `placeholder:` text is exempt. `StyleSheet.create`
references, dynamic styles, translucent colors (`bg-black/50`) and unknown
theme colors are skipped — *partial* coverage by design. Theme colors are read
from `tailwind.config.*`, CSS `@theme` blocks, or the `tailwind.colors` config.

```tsx
// ✖ 2.5:1 against the white parent; ✖ dark: gray-700 on gray-900
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-400 dark:text-gray-700">Last synced 5 minutes ago</Text>
</View>

// ✔
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-600 dark:text-gray-300">Last synced 5 minutes ago</Text>
</View>
```

## no-disable-font-scaling

Flags `allowFontScaling={false}` and positive `maxFontSizeMultiplier` values at
or below `1` on stock `Text` and `TextInput`. Both prevent users' system text
size preference from enlarging content. `maxFontSizeMultiplier={0}` is valid:
React Native defines zero as unlimited scaling.

This rule can verify that scaling is not disabled, but it cannot prove that the
resulting layout remains usable at large sizes. Test that separately using the
[manual accessibility testing guide](../manual-testing.md#text-scaling-and-layout).

## no-orientation-lock

A project-level check (not a JSX rule): flags orientation locks wherever they
are declared — Expo `app.json` / `app.config.{js,ts}` (`orientation:
"portrait"`/`"landscape"`), `AndroidManifest.xml`
(`android:screenOrientation`), and iOS `Info.plist`
(`UISupportedInterfaceOrientations` listing a single orientation family).
WCAG 1.3.4 (AA) requires both orientations unless one is essential — users
with wheelchair-mounted devices cannot rotate. Runtime locks via
`expo-screen-orientation` are out of static reach, hence *partial*.

## text-fixed-height

A fixed `height` (or `maxHeight`) on a `Text` clips the glyphs as soon as the
user enlarges system text; WCAG 1.4.4 requires 200% without loss of content.
Read from inline literals and Tailwind classes (`h-6`). Use `minHeight` or let
the container grow instead.

```tsx
// ✖
<Text className="h-6">Fixed-height caption</Text>

// ✔
<Text className="min-h-6">Fixed-height caption</Text>
```

## text-onpress-has-role

A `<Text onPress>` is announced as plain text, so screen reader users never
learn it is actionable. Add `accessibilityRole="link"` (or `"button"`). React
Native 0.84 assigns `link` automatically; the rule is skipped when
`package.json` pins `react-native` at 0.84 or later.

## label-not-all-caps

VoiceOver treats all-caps strings as abbreviations and may spell them out
letter by letter ("SAVE" → "S-A-V-E"). Keep `accessibilityLabel`,
`aria-label` and `accessibilityHint` in sentence case and uppercase the visible
text with `textTransform` instead. Consonant-only acronyms (`PDF`, `HTML`) are
not flagged.

## accessibility-language-valid

`accessibilityLanguage` (iOS) selects the VoiceOver voice for the label, value
and hint and must be a BCP 47 tag (`"fr"`, `"pt-BR"`). Anything else is
ignored and the text is read with the default voice (WCAG 3.1.2).

## live-region-android-only

`accessibilityLiveRegion` / `aria-live` only work on Android — on iOS the prop
silently does nothing, so validation errors, toasts and status text that rely
on it are never announced by VoiceOver (WCAG 4.1.3). The rule is satisfied when
the same file also calls `AccessibilityInfo.announceForAccessibility`.

```tsx
// ✖ VoiceOver never hears this
<Text accessibilityLiveRegion="polite">{status}</Text>

// ✔
useEffect(() => { if (status) AccessibilityInfo.announceForAccessibility(status); }, [status]);
<Text accessibilityLiveRegion="polite">{status}</Text>
```

## animation-reduce-motion

WCAG 2.2.2 (A) requires that moving content lasting more than five seconds can
be paused, and WCAG 2.3.3 (AAA) plus the iOS and Android *Reduce Motion*
settings ask that non-essential motion be dropped on request. This is a
source-level rule — it also scans plain modules with no JSX — and flags:

- `Animated.loop(…)` (React Native's core API has no reduce-motion awareness)
  in a file that never consults the setting (`AccessibilityInfo.isReduceMotionEnabled`,
  `useReducedMotion`, …). Loops with a finite `iterations` are fine.
- Reanimated `withRepeat(…, -1, …, ReduceMotion.Never)` — an infinite loop
  that explicitly opts out of the setting Reanimated honours by default.
- `<ReducedMotionConfig mode={ReduceMotion.Never}>`, which disables Reduce
  Motion app-wide (reported as **serious**).

```tsx
// ✖
Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })).start();

// ✔
const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
if (!reduceMotion) Animated.loop(…).start();
```

## Tailwind, NativeWind and Uniwind

When `tailwindcss`, `nativewind`, `uniwind`, `twrnc` or `react-native-css` is a
dependency, the scanner resolves utility classes into the style properties the
rules above need — sizes, text and background colors, font size and weight —
so a NativeWind or Uniwind codebase gets the same touch-target, contrast and
text-height coverage as an inline-styled one. Specifically:

- `className` strings, template literals, and `cn()` / `clsx()` / `twMerge()`
  calls (string arguments, `cond && '…'`, ternaries, `{ 'text-red-500': cond }`
  maps) are read; twrnc's `` style={tw`…`} `` too.
- Variants (`dark:`, `ios:`, `sm:`, `active:`) and each conditional set are
  resolved as separate layers and checked individually.
- Inline `style` literals win over classes, as at runtime. A `StyleSheet`
  reference or other dynamic style makes earlier values unknown.
- The default palette is chosen from the installed `tailwindcss` (v3 vs v4
  colors differ) and the rem base from the binding (NativeWind v4: 14px;
  Uniwind, NativeWind v5, web: 16px). Custom theme colors are read statically
  from `tailwind.config.*` (`theme.colors`, `theme.extend.colors`) and from CSS
  `@theme { --color-*: … }` blocks.
- Unknown utilities and colors are never guessed: a `text-primary` the scanner
  cannot resolve simply disables the contrast check for that element.

Tune or disable resolution in `react-a11y.config.json`:

```json
{
  "tailwind": {
    "preset": "v3",
    "rem": 14,
    "colors": { "brand": "#0055ff", "brand-500": "#0055ff" }
  }
}
```

Set `"tailwind": false` to turn it off, or `"tailwind": {}` to enable it in a
project whose binding is not detected.
