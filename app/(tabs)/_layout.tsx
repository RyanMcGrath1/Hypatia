import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { AnimatedTabIcon } from "@/components/navigation/AnimatedTabIcon";
import { HapticTab } from "@/components/navigation/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { Colors } from "@/constants/theme/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            position: "absolute",
          },
          default: {},
        }),
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
