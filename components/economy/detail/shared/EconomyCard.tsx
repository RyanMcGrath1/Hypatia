import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";

type EconomyCardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

/** Elevated dashboard card (shadow in light, hairline border in dark). */
export function EconomyCard({ children, style }: EconomyCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: semantic.cardBackground,
          borderColor: isDark ? semantic.hairline : "transparent",
          borderWidth: isDark ? 1 : 0,
        },
        semantic.cardShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
});
