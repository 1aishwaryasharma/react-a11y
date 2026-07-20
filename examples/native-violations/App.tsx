import { View } from 'react-native';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { FeedScreen } from './screens/FeedScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  return (
    <View>
      <FeedScreen />
      <SettingsScreen />
      <CheckoutScreen />
      <ProfileScreen />
    </View>
  );
}
