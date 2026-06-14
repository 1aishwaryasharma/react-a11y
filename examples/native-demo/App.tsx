import { View, Text, Image, TextInput, Pressable, TouchableOpacity } from 'react-native';

export default function App() {
  return (
    <View>
      <Pressable onPress={() => close()} style={{ width: 20, height: 20 }} />

      <TouchableOpacity onPress={() => like()}>
        <Image source={require('./heart.png')} />
      </TouchableOpacity>

      <Pressable accessibilityRole="button" onPress={() => openCard()}>
        <Text>Open card</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => share()}>
          <Text>Share</Text>
        </TouchableOpacity>
      </Pressable>

      <TextInput placeholder="Search products" />

      <View accessibilityRole="pushbutton" accessibilitylabel="profile" />
    </View>
  );
}

declare function close(): void;
declare function like(): void;
declare function openCard(): void;
declare function share(): void;
