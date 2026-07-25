import { type ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import {
  Radius,
  Spacing,
  getSemanticColors,
} from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";

export type FormTextFieldProps = Omit<TextInputProps, "style" | "editable"> & {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Field-level validation message — presentation only; caller owns rules. */
  error?: string;
  helperText?: string;
  disabled?: boolean;
  /** Optional trailing control (e.g. password visibility toggle). */
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

/**
 * Labeled theme-aware text field for auth and account forms.
 * Displays validation state; does not enforce domain rules.
 */
export function FormTextField({
  label,
  value,
  onChangeText,
  error,
  helperText,
  disabled = false,
  trailing,
  containerStyle,
  inputStyle,
  placeholder,
  accessibilityLabel,
  ...textInputProps
}: FormTextFieldProps) {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];
  const semantic = getSemanticColors(scheme);

  const hasError = typeof error === "string" && error.length > 0;
  const borderColor = hasError ? semantic.danger : semantic.hairline;
  const backgroundColor = disabled
    ? semantic.cardSubtleBackground
    : semantic.cardBackground;

  const statusMessage = hasError ? error : helperText;
  const statusColor = hasError ? semantic.danger : semantic.mutedText;

  return (
    <View style={[styles.container, containerStyle]}>
      <ThemedText
        type="subtitle"
        style={[styles.label, { color: semantic.mutedText }]}
        accessibilityRole="text"
      >
        {label}
      </ThemedText>
      <View
        style={[
          styles.shell,
          {
            backgroundColor,
            borderColor,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <TextInput
          {...textInputProps}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={semantic.mutedText}
          editable={!disabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
          style={[
            styles.input,
            { color: theme.text, caretColor: theme.text },
            Platform.OS === "web"
              ? ({ outlineStyle: "none", outlineWidth: 0 } as TextStyle)
              : null,
            inputStyle,
          ]}
        />
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
      {statusMessage ? (
        <ThemedText
          style={[styles.status, { color: statusColor }]}
          accessibilityLiveRegion={hasError ? "polite" : undefined}
        >
          {statusMessage}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  shell: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 22,
  },
  trailing: {
    flexShrink: 0,
  },
  status: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
});
