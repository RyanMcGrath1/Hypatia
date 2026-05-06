import { type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";

type SectionCardProps = {
  children: ReactNode;
  backgroundColor: string;
  borderColor: string;
  /** When set, overrides default (no outline in light, 1px in dark) — use for semantic / notice cards */
  outlineWidth?: number;
  style?: ViewStyle;
};

export function SectionCard({
  children,
  backgroundColor,
  borderColor,
  outlineWidth,
  style,
}: SectionCardProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const borderW = outlineWidth ?? semantic.cardOutlineWidth;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor, borderWidth: borderW },
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
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
});
