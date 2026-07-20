# Manual accessibility testing

Static analysis catches deterministic source-code problems, but it cannot see
the final native accessibility tree, rendered layout, device settings, runtime
state, or the experience of navigating with assistive technology. A clean
`react-a11y` report is therefore a starting point, not a certification.

Use this guide for the important checks that source analysis cannot prove.

## Screen readers and focus

Test critical journeys on both iOS VoiceOver and Android TalkBack:

- Swipe through every element and confirm the focus order matches the visual
  and task order.
- Confirm each control announces a concise name, correct role, current state,
  and a useful hint only when the action is not obvious.
- Open every modal, sheet, menu, and route. Focus must move into new content,
  remain inside modal content where appropriate, and return to a logical
  trigger when it closes.
- Confirm background content is unreachable while a modal is open.
- Activate controls with screen-reader gestures. A visually tappable control
  that cannot be activated by VoiceOver or TalkBack is still broken.
- Verify errors, confirmations, loading results, and other dynamic updates are
  announced once without unexpectedly moving focus.

Focus movement with `AccessibilityInfo.setAccessibilityFocus`, announcements
with `announceForAccessibility`, and modal focus containment depend on runtime
timing and the rendered native tree. They cannot be reliably inferred from the
presence of a JSX prop.

## Text scaling and layout

Test every important screen at the largest supported system text size:

- Text remains readable and is not clipped or hidden behind icons.
- Buttons and inputs grow or wrap instead of truncating essential labels.
- Content can scroll when it no longer fits vertically.
- Primary actions, consent controls, and navigation remain reachable.
- Landscape and small-screen layouts remain usable.

The `no-disable-font-scaling` rule catches explicit attempts to disable or cap
scaling at 100%. It cannot run Yoga layout or determine whether the scaled
screen still works.

## Visual presentation

Check all themes and interaction states on a device or rendered build:

- Text meets WCAG contrast requirements in light mode, dark mode, disabled
  states, pressed states, overlays, gradients, and images.
- Component boundaries, icons, charts, and focus indicators have sufficient
  non-text contrast.
- Color is never the only indication of an error, selection, status, or data
  category.
- Content remains understandable with increased contrast, color inversion,
  grayscale, and bold text settings.

Static contrast rules only evaluate literal foreground and background colors
available in the same JSX element. Theme tokens, opacity, image backgrounds,
native compositing, and runtime state require rendered testing.

## Touch, keyboard, and alternative input

- Measure the final hit area and spacing between adjacent targets. StyleSheet
  references, layout constraints, transforms, and parent clipping can change
  the effective target after static analysis.
- Complete each workflow with a hardware keyboard, switch control, or other
  supported alternative input.
- Ensure swipe, drag, pinch, long-press, shake, and path-based gestures have a
  simple tap or button alternative.
- Verify focus is never hidden behind a sticky header, keyboard, toast, or
  overlay.

## Motion, media, and time

- Enable Reduce Motion and confirm non-essential movement is removed or
  replaced without hiding information.
- Check flashing content stays below seizure thresholds.
- Provide captions for prerecorded and live video, transcripts for audio, and
  audio descriptions or equivalent alternatives where required.
- Ensure time limits can be extended or disabled unless an exception applies.

These checks depend on media content, animation behavior, and user settings;
they are outside a JSX scanner's reliable scope.

## Content and workflow review

- Instructions do not rely only on shape, color, size, sound, or position.
- Repeated navigation, help, and component labels remain consistent.
- Validation errors identify the affected field and explain how to fix it.
- Legal, financial, and destructive actions are reviewable, reversible, or
  confirmed before completion.
- Previously entered information is not needlessly requested again.
- Localized labels remain meaningful and layouts work with longer translations
  and right-to-left text.

## Suggested release routine

Choose at least five representative journeys: launch/onboarding, sign-in, the
main product task, a form with validation, and settings/account management.
Run each journey with:

1. VoiceOver on iOS.
2. TalkBack on Android.
3. The largest system text size.
4. Reduce Motion and increased-contrast settings.
5. A hardware keyboard or alternative input where supported.

Add semantic component tests with React Native Testing Library queries such as
`getByRole`, `getByLabelText`, and accessibility-state assertions. Use runtime
tools such as React Native AMA or axe DevTools Mobile when appropriate, but
retain real-device screen-reader testing: automated checks cannot judge whether
the experience is understandable and efficient.

## Trusted references

- [React Native accessibility documentation](https://reactnative.dev/docs/accessibility)
- [Infinite Red: React Native and Accessibility with Karly Lamm](https://infinite.red/react-native-radio/rnr-330-react-native-and-accessibility-with-karly-lamm)
- [Infinite Red / Chain React: Be a React Native A11y](https://chainreactconf.com/talks/be-a-react-native-a11y)
- [Callstack: React Native Accessibility](https://www.callstack.com/blog/react-native-accessibility)
- [React Native AMA accessibility checklist](https://commerce.nearform.com/open-source/react-native-ama/checklist/)
- [Software Mansion: Android TalkBack support in React Native Gesture Handler](https://github.com/software-mansion/react-native-gesture-handler/pull/4222)
