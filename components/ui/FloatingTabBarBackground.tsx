import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";

import { FLOATING_TAB_BAR } from "@/constants/navigation/floatingTabBar";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function FloatingTabBarBackground() {
  const colorScheme = useColorScheme();
  const tint =
    Platform.OS === "ios"
      ? "systemChromeMaterial"
      : colorScheme === "dark"
        ? "dark"
        : "light";

  return (
    <View style={styles.container}>
      <BlurView
        tint={tint}
        intensity={Platform.OS === "ios" ? 100 : 90}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FLOATING_TAB_BAR.borderRadius,
    overflow: "hidden",
  },
});
