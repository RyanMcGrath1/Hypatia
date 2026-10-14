import { useBottomTabBarHeight } from "expo-router/tabs";

import FloatingTabBarBackground from "@/components/ui/FloatingTabBarBackground";

export default FloatingTabBarBackground;

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
