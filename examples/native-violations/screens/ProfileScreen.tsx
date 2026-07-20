import { Pressable, Text, View } from 'react-native';

export function ProfileScreen() {
  return (
    <View>
      {/* ✖ accessible-grouping-hides-interactive — Edit collapses into the group's single focus stop */}
      <View accessible={true}>
        <Text>Signed in as Alex</Text>
        <Pressable accessibilityRole="button" onPress={editProfile}>
          <Text>Edit</Text>
        </Pressable>
      </View>

      {/* ✖ label-needs-accessible — without accessible={true} the label is dropped
          and the five stars are read one by one */}
      <View accessibilityLabel="Rating: 4 of 5 stars">
        <Text>★★★★☆</Text>
      </View>

      {/* ✖ color-contrast — 2.3:1 fails the WCAG 1.4.3 minimum of 4.5:1 */}
      <Text style={{ backgroundColor: '#ffffff', color: '#aaaaaa' }}>Member since 2021</Text>
    </View>
  );
}

declare function editProfile(): void;
