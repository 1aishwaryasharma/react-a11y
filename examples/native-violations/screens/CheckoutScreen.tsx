import { Modal, Pressable, Text, View } from 'react-native';

export function CheckoutScreen() {
  return (
    <View>
      {/* ✖ modal-has-request-close — without onRequestClose the Android back button is a trap */}
      <Modal visible={isCheckoutOpen}>
        <Text>Checkout</Text>
      </Modal>

      {/* ✖ valid-accessibility-role — "pushbutton" is not a React Native role */}
      <View accessibilityRole="pushbutton" />

      {/* ✖ valid-accessibility-role — the role prop takes ARIA names: it's role="heading" */}
      <Text role="header">Order summary</Text>

      {/* ✖ valid-accessibility-props — miscapitalized and misspelled props fail silently */}
      <View accessibilitylabel="Order total" />
      <Pressable accessibilityRole="button" aria-labeledby="order-total" onPress={payNow}>
        <Text>Pay now</Text>
      </Pressable>

      {/* ✖ live-region-valid — "rude" is not a live-region value; updates are never announced */}
      <Text accessibilityLiveRegion="rude">Coupon applied</Text>

      {/* ✖ no-hidden-interactive — hidden from assistive technology but still tappable */}
      <Pressable accessibilityLabel="Apply coupon" importantForAccessibility="no" onPress={applyCoupon}>
        <Text>Apply coupon</Text>
      </Pressable>

      {/* ✖ accessibility-actions-handled — declared actions with no handler are a silent no-op */}
      <View
        accessible={true}
        accessibilityLabel="Cart item: wool socks"
        accessibilityActions={[{ name: 'delete', label: 'Remove from cart' }]}
      />

      {/* ✖ valid-important-for-accessibility — "nope" is silently ignored on Android */}
      <View importantForAccessibility="nope">
        <Text>Free shipping over $40</Text>
      </View>

      {/* ✖ hidden-cross-platform — hidden from VoiceOver only; TalkBack still reads it */}
      <View accessibilityElementsHidden={true}>
        <Text>Decorative divider</Text>
      </View>
    </View>
  );
}

declare const isCheckoutOpen: boolean;
declare function applyCoupon(): void;
declare function payNow(): void;
