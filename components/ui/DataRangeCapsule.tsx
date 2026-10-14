import Feather from "@expo/vector-icons/Feather";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

type DataRangeCapsuleProps = {
  /** Compact span, e.g. "Jan – Sep 2026". */
  label: string;
  /** Spoken span, e.g. "Data from January 2026 through September 2026". */
  accessibilityLabel: string;
  onPress: () => void;
};

/** Floating scope control: states the data range for the whole screen and opens the range picker. */
export function DataRangeCapsule({ label, accessibilityLabel, onPress }: DataRangeCapsuleProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Changes the date range for every chart on this screen."
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.shadow,
        { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={[styles.capsule, { borderColor: semantic.hairline }]}>
        <BlurView
          tint={
            Platform.OS === "ios"
              ? "systemChromeMaterial"
              : colorScheme === "dark"
                ? "dark"
                : "light"
          }
          intensity={Platform.OS === "ios" ? 100 : 90}
          style={StyleSheet.absoluteFill}
        />
        <Feather name="calendar" size={16} color={interactive.primary} />
        <ThemedText style={[styles.label, { color: theme.text }]} numberOfLines={1}>
          {label}
        </ThemedText>
        <Feather name="chevron-down" size={16} color={semantic.mutedText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 22,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      default: { elevation: 6 },
    }),
  },
  capsule: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Fonts.bodySemiBold,
    fontVariant: ["tabular-nums"],
  },
});
