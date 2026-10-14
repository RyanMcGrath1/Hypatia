import { useState, type ReactNode } from "react";
import type { LayoutChangeEvent } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useScrollReveal } from "@/components/ui/ScrollRevealContext";

const STAGGER_MS = 90;
const DURATION_MS = 420;
const LIFT_PX = 24;
/** How much of the content must be on screen before it animates in. */
const REVEAL_INSET_PX = 80;

type StaggeredEntranceProps = {
  /** Position in the sequence; content visible on first paint is staggered by this. */
  index: number;
  children: ReactNode;
};

/**
 * Fades and lifts its content into place the first time it scrolls into view. Must be a direct
 * child of the scroll content (its layout `y` is used as the scroll offset). Without a
 * `ScrollRevealContext` it animates on mount. Skipped when Reduce Motion is on.
 */
export function StaggeredEntrance({ index, children }: StaggeredEntranceProps) {
  const reveal = useScrollReveal();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const top = useSharedValue<number | null>(null);
  const [revealed, setRevealed] = useState(reduceMotion);
  const delay = index * STAGGER_MS;

  useAnimatedReaction(
    () => {
      if (revealed || top.value == null) return false;
      if (reveal == null) return true;
      return reveal.scrollY.value + reveal.viewportHeight.value > top.value + REVEAL_INSET_PX;
    },
    (visible, wasVisible) => {
      if (!visible || wasVisible) return;
      // Content already on screen at first layout keeps its stagger; later reveals play at once.
      const onFirstPaint = reveal == null || reveal.scrollY.value <= 0;
      progress.value = withDelay(
        onFirstPaint ? delay : 0,
        withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) }),
      );
      runOnJS(setRevealed)(true);
    },
    [revealed, reveal, delay],
  );

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * LIFT_PX }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    top.set(e.nativeEvent.layout.y);
  };

  return (
    <Animated.View onLayout={revealed ? undefined : onLayout} style={style}>
      {children}
    </Animated.View>
  );
}
