import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { ReduceMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/** A plain module (no JSX) — source-level rules still scan it. */
export function useSpinner() {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // ✖ animation-reduce-motion — loops forever with no Reduce Motion check
    Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
  }, [rotation]);
  return rotation;
}

export function usePulse() {
  const scale = useSharedValue(1);
  useEffect(() => {
    // ✖ animation-reduce-motion — explicitly opts an infinite loop out of Reduce Motion
    scale.value = withRepeat(withTiming(1.2, { duration: 600 }), -1, true, undefined, ReduceMotion.Never);
  }, [scale]);
  return scale;
}
