import type { NativeStackNavigationOptions } from "expo-router/native-stack";

/**
 * Stack defaults tuned for touch: back-swipe only from the leading edge,
 * not the full screen (avoids accidental back while scrolling charts/filters).
 */
export const forgivingStackScreenOptions: NativeStackNavigationOptions = {
  gestureEnabled: true,
  fullScreenGestureEnabled: false,
};
