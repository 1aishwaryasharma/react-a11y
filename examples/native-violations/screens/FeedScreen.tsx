import { Image, Pressable, Text, TouchableOpacity, View } from 'react-native';

export function FeedScreen() {
  return (
    <View>
      {/* ✖ touchable-has-label + touchable-has-role — no name, no role */}
      <Pressable onPress={dismissBanner} />

      {/* ✖ image-has-label — an icon button whose only content is an unlabeled image */}
      <TouchableOpacity accessibilityRole="button" onPress={likePost}>
        <Image source={require('./heart.png')} />
      </TouchableOpacity>

      {/* ✖ no-nested-touchables — screen readers expose only one target; Share is unreachable */}
      <Pressable accessibilityRole="button" onPress={openPost}>
        <Text>Open post</Text>
        <TouchableOpacity accessibilityRole="button" onPress={sharePost}>
          <Text>Share</Text>
        </TouchableOpacity>
      </Pressable>

      {/* ✖ touch-target-size (serious) — 20pt is below WCAG 2.5.8's 24pt minimum */}
      <Pressable
        accessibilityLabel="Close"
        accessibilityRole="button"
        onPress={dismissBanner}
        style={{ height: 20, width: 20 }}
      />

      {/* ✖ touch-target-size (moderate) — 30pt is below the 44pt platform recommendation */}
      <Pressable
        accessibilityLabel="More options"
        accessibilityRole="button"
        onPress={openMenu}
        style={{ height: 30, width: 30 }}
      />
    </View>
  );
}

declare function dismissBanner(): void;
declare function likePost(): void;
declare function openMenu(): void;
declare function openPost(): void;
declare function sharePost(): void;
