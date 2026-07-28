import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import {
  FormTextField,
  type FormTextFieldProps,
} from "@/components/forms/FormTextField";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

export type PasswordFieldProps = Omit<
  FormTextFieldProps,
  "secureTextEntry" | "trailing" | "label"
> & {
  label?: string;
  /**
   * When true (default), text is obscured until the user toggles visibility.
   * Does not alter the password value.
   */
  initiallySecure?: boolean;
};

/**
 * Password input on the shared form field chrome.
 * Callers supply `textContentType` / `autoComplete` for login vs new-password.
 * Does not validate password policy or mutate the typed value.
 */
export function PasswordField({
  initiallySecure = true,
  label = "Password",
  accessibilityLabel,
  ...rest
}: PasswordFieldProps) {
  const interactive = useThemeInteractive();
  const [secure, setSecure] = useState(initiallySecure);
  const toggleLabel = secure ? "Show password" : "Hide password";

  return (
    <FormTextField
      {...rest}
      label={label}
      accessibilityLabel={accessibilityLabel ?? label}
      secureTextEntry={secure}
      autoCorrect={rest.autoCorrect ?? false}
      autoCapitalize={rest.autoCapitalize ?? "none"}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toggleLabel}
          hitSlop={10}
          onPress={() => setSecure((prev) => !prev)}
          style={({ pressed }) => [
            styles.toggle,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Feather
            name={secure ? "eye" : "eye-off"}
            size={20}
            color={interactive.primary}
          />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
