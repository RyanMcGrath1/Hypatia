import Feather from "@expo/vector-icons/Feather";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { useThemeInteractive } from "@/hooks/useThemeInteractive";

export type FilterIconButtonProps = {
  onPress: () => void;
  /** e.g. include current filter value for VoiceOver */
  accessibilityLabel: string;
  disabled?: boolean;
  /** Icon size in dp (default 22). Touch target stays at least 44pt. */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function FilterIconButton({
  onPress,
  accessibilityLabel,
  disabled,
  iconSize = 22,
  style,
}: FilterIconButtonProps) {
  const interactive = useThemeInteractive();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [
        styles.hit,
        {
          opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
        },
        style,
      ]}
    >
      <Feather name="filter" size={iconSize} color={interactive.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
