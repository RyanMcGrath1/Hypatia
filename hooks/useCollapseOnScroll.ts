import { useCallback, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

/** Distance (pt) the user must travel in one direction before the state flips. */
const DIRECTION_THRESHOLD = 24;

/**
 * `collapsed` turns true while scrolling down and false as soon as the user scrolls back up
 * or reaches the top. Offsets are clamped so rubber-band bounce doesn't toggle the state.
 */
export function useCollapseOnScroll() {
  const [collapsed, setCollapsed] = useState(false);
  const state = useRef({ anchorY: 0, collapsed: false });

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    const y = Math.min(Math.max(contentOffset.y, 0), maxY);
    const s = state.current;

    let next = s.collapsed;
    if (y <= 0) {
      next = false;
      s.anchorY = 0;
    } else if (s.collapsed) {
      if (y > s.anchorY) s.anchorY = y;
      else if (s.anchorY - y > DIRECTION_THRESHOLD) next = false;
    } else {
      if (y < s.anchorY) s.anchorY = y;
      else if (y - s.anchorY > DIRECTION_THRESHOLD) next = true;
    }

    if (next !== s.collapsed) {
      s.collapsed = next;
      s.anchorY = y;
      setCollapsed(next);
    }
  }, []);

  return { collapsed, onScroll };
}
