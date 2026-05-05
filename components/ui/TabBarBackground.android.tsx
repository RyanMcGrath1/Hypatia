import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import FloatingTabBarBackground from "@/components/ui/FloatingTabBarBackground";

export default FloatingTabBarBackground;

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}
