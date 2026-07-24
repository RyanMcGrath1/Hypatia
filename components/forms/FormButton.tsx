import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Brand } from "@/constants/theme/Colors";
import { Radius, Spacing } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

export type FormButtonVariant = "primary" | "destructive";

export type FormButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  variant?: FormButtonVariant;
  style?: StyleProp<ViewStyle>;
};

/**
 * Primary / destructive form action button.
 * Loading blocks repeated presses; no navigation or API logic.
 */
export function FormButton({
  label,
  onPress,
  disabled = false,
  isLoading = false,
  variant = "primary",
  style,
}: FormButtonProps) {
  const scheme = useColorScheme() ?? "light";
  const interactive = useThemeInteractive();
  const isDisabled = disabled || isLoading;

  const backgroundColor =
    variant === "destructive" ? interactive.danger : interactive.primaryFill;
  const labelColor =
    variant === "destructive"
      ? scheme === "dark"
        ? Brand.darkOnError
        : Brand.white
      : interactive.onPrimaryFill;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: isDisabled ? 0.45 : pressed ? 0.88 : 1,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  label: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
  },
});
