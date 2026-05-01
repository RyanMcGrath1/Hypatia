import { type ReactNode, useEffect, useRef } from 'react';
import { Animated } from 'react-native';

type AnimatedTabIconProps = {
  focused: boolean;
  children: ReactNode;
};

/**
 * Brief scale “pop” when the tab becomes active.
 * Uses RN Animated (not Reanimated) so transforms compose reliably inside the tab bar.
 */
export function AnimatedTabIcon({ focused, children }: AnimatedTabIconProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.stopAnimation();

    if (focused) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.12,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, scale]);

  return (
    <Animated.View
      collapsable={false}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale }],
      }}>
      {children}
    </Animated.View>
  );
}
