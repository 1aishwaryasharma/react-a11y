import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';

/**
 * The same problems as the inline-style screens, expressed with NativeWind /
 * Uniwind className utilities. The scanner resolves the classes (with the
 * binding's rem base and palette) so nothing here slips through.
 */
export function TailwindScreen() {
  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* ✖ touch-target-size — h-6 w-6 is 21×21 on NativeWind v4 (14px rem): below the 24px floor */}
      {/* ✖ touchable-has-label — an icon-library glyph has no accessible name */}
      <Pressable accessibilityRole="button" className="h-6 w-6" onPress={close}>
        <Ionicons name="close" size={20} />
      </Pressable>

      {/* ✖ touch-target-size — 32×32 via size-8: below the recommended 44pt */}
      <Pressable accessibilityRole="button" accessibilityLabel="More" className={cn('size-8', isOpen && 'bg-gray-100')} onPress={openMenu} />

      {/* ✖ color-contrast — gray-400 on the enclosing white background is 2.5:1 */}
      <Text className="text-sm text-gray-400">Last synced 5 minutes ago</Text>

      {/* ✖ color-contrast — passes in light mode but fails in the dark: variant (gray-700 on gray-900) */}
      <Text className="text-gray-700 dark:text-gray-700">Nightly build</Text>

      {/* ✖ color-contrast — custom theme color read from tailwind.config.js */}
      <Text className="text-brand">Brand tagline</Text>

      {/* ✖ text-fixed-height — h-6 clips the label as soon as system text is enlarged */}
      <Text className="h-6 text-gray-900 dark:text-gray-100">Fixed-height caption</Text>

      {/* ✖ text-onpress-has-role — announced as plain text, not as a link (RN < 0.84) */}
      <Text className="text-blue-700 underline dark:text-blue-300" onPress={openTerms}>Terms of service</Text>

      {/* ✖ label-not-all-caps — VoiceOver may spell out "A-D-D T-O C-A-R-T" */}
      <Pressable accessibilityRole="button" accessibilityLabel="ADD TO CART" className="h-14 rounded bg-blue-700 px-4" onPress={addToCart}>
        <Text className="text-white uppercase">Add to cart</Text>
      </Pressable>

      {/* ✖ accessibility-language-valid — not a BCP 47 tag; VoiceOver reads it with the default voice */}
      <Text accessibilityLanguage="french" className="text-gray-900 dark:text-gray-100">Bonjour</Text>

      {/* ✖ live-region-android-only — VoiceOver never hears this; no announceForAccessibility call in the file */}
      <Text accessibilityLiveRegion="polite" className="text-gray-900 dark:text-gray-100">{statusMessage}</Text>

      {/* ✖ no-nested-touchables — the TextInput is swallowed by the enclosing Pressable */}
      <Pressable accessibilityRole="button" accessibilityLabel="Search" className="h-14 flex-row" onPress={search}>
        <TextInput accessibilityLabel="Query" className="flex-1" />
      </Pressable>
    </View>
  );
}

declare const isOpen: boolean;
declare const statusMessage: string;
declare function addToCart(): void;
declare function close(): void;
declare function cn(...classes: Array<string | false | undefined>): string;
declare function openMenu(): void;
declare function openTerms(): void;
declare function search(): void;
