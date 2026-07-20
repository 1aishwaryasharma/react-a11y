import { Pressable, Switch, Text, TextInput, View } from 'react-native';

export function SettingsScreen() {
  return (
    <View>
      {/* ✖ textinput-has-label — a placeholder is not a label; it disappears on input */}
      <TextInput placeholder="Display name" />

      {/* ✖ switch-has-label — announced as just "switch, off" */}
      <Switch onValueChange={setDarkMode} value={darkMode} />

      {/* ✖ accessibility-hint-has-label — a hint describes an outcome; it cannot name the control */}
      <Pressable accessibilityHint="Signs you out of your account" accessibilityRole="button" onPress={signOut} />

      {/* ✖ role-has-required-state — a switch role with no checked state announces type but not value */}
      <Pressable onPress={toggleEmailDigest} role="switch">
        <Text>Email digest</Text>
      </Pressable>

      {/* ✖ accessibility-state-valid — "pressed" is not a supported state key; it is silently dropped */}
      <Pressable accessibilityRole="button" accessibilityState={{ pressed: isSaving }} onPress={save}>
        <Text>Save</Text>
      </Pressable>

      {/* ✖ aria-state-valid — the string "false" is truthy in React Native: this announces as busy */}
      <Pressable accessibilityRole="button" aria-busy="false" onPress={syncNow}>
        <Text>Sync now</Text>
      </Pressable>

      {/* ✖ accessibility-value-valid — now requires both min and max */}
      <View
        accessible={true}
        accessibilityLabel="Storage used"
        accessibilityRole="progressbar"
        accessibilityValue={{ now: 80 }}
      />

      {/* ✖ no-disable-font-scaling — ignores the user's system text-size setting */}
      <Text allowFontScaling={false}>Version 3.2.1 (build 480)</Text>
    </View>
  );
}

declare const darkMode: boolean;
declare const isSaving: boolean;
declare function save(): void;
declare function setDarkMode(value: boolean): void;
declare function signOut(): void;
declare function syncNow(): void;
declare function toggleEmailDigest(): void;
