import Feather from "@expo/vector-icons/Feather";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const SIZE = 44;
const transition = LinearTransition.duration(240);

type DataRangeCapsuleProps = {
  /** Compact span, e.g. "Jan – Sep 2026". */
  label: string;
  /** Spoken span, e.g. "Data from January 2026 through September 2026". */
  accessibilityLabel: string;
  onPress: () => void;
  /** Icon-only and pinned to the trailing edge (e.g. while scrolling down). */
  collapsed?: boolean;
};

/** Floating scope control: states the data range for the whole screen and opens the range picker. */
export function DataRangeCapsule({
  label,
  accessibilityLabel,
  onPress,
  collapsed = false,
}: DataRangeCapsuleProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.track, { alignItems: collapsed ? "flex-end" : "center" }]}
    >
      <Animated.View layout={transition} style={styles.shadow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint="Changes the date range for every chart on this screen."
          onPress={onPress}
          hitSlop={6}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Animated.View
            layout={transition}
            style={[
              styles.capsule,
              collapsed ? styles.capsuleCollapsed : null,
              { borderColor: semantic.hairline },
            ]}
          >
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
            {collapsed ? null : (
              <Animated.View
                entering={FadeIn.duration(180).delay(80)}
                exiting={FadeOut.duration(100)}
                style={styles.expandedContent}
              >
                <ThemedText style={[styles.label, { color: theme.text }]} numberOfLines={1}>
                  {label}
                </ThemedText>
                <Feather name="chevron-down" size={16} color={semantic.mutedText} />
              </Animated.View>
            )}
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: "stretch",
    paddingHorizontal: Spacing.lg,
  },
  shadow: {
    borderRadius: SIZE / 2,
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
    minHeight: SIZE,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: SIZE / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  capsuleCollapsed: {
    width: SIZE,
    paddingHorizontal: 0,
    justifyContent: "center",
  },
  expandedContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: Fonts.bodySemiBold,
    fontVariant: ["tabular-nums"],
  },
});
