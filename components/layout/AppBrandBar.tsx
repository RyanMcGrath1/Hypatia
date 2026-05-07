import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Fonts } from "@/constants/theme/Typography";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

type AppBrandBarProps = {
  icon: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

/** Hypatia wordmark + tab icon; layout matches across tab screens. */
export function AppBrandBar({ icon, style }: AppBrandBarProps) {
  const interactive = useThemeInteractive();

  return (
    <View style={[styles.row, style]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: interactive.primarySoft },
        ]}
      >
        <Ionicons name={icon} size={20} color={interactive.primary} />
      </View>
      <ThemedText style={[styles.title, { color: interactive.primary }]}>
        HYPATIA
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.8,
  },
});
