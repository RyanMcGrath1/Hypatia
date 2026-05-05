import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedTabIcon } from "@/components/navigation/AnimatedTabIcon";
import { HapticTab } from "@/components/navigation/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { FLOATING_TAB_BAR } from "@/constants/navigation/floatingTabBar";
import { Colors } from "@/constants/theme/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  const tabBarStyle = useMemo(
    () => ({
      position: "absolute" as const,
      left: insets.left + FLOATING_TAB_BAR.horizontalGutter,
      right: insets.right + FLOATING_TAB_BAR.horizontalGutter,
      bottom: insets.bottom + FLOATING_TAB_BAR.bottomOffset,
      height: FLOATING_TAB_BAR.height,
      borderRadius: FLOATING_TAB_BAR.borderRadius,
      overflow: "hidden" as const,
      borderTopWidth: 0,
      backgroundColor: "transparent",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
        },
        android: {
          elevation: 14,
        },
        default: {},
      }),
    }),
    [insets.bottom, insets.left, insets.right],
  );

  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "News",
          tabBarAccessibilityLabel: "News tab",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons
                name={focused ? "newspaper" : "newspaper-outline"}
                size={26}
                color={color}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="economy"
        options={{
          title: "Economy",
          tabBarAccessibilityLabel: "Economy tab",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons
                name={focused ? "bar-chart" : "bar-chart-outline"}
                size={26}
                color={color}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="politician"
        options={{
          title: "Politician",
          tabBarAccessibilityLabel: "Politician tab",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons
                name={focused ? "school" : "school-outline"}
                size={26}
                color={color}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarAccessibilityLabel: "Explore tab",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <Ionicons
                name={focused ? "search" : "search-outline"}
                size={26}
                color={color}
              />
            </AnimatedTabIcon>
          ),
        }}
      />
    </Tabs>
  );
}
