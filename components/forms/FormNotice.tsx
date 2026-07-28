import { View, type StyleProp, type ViewStyle } from "react-native";

import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { Brand, Palette } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

export type FormNoticeTone = "error" | "success" | "info";

export type FormNoticeProps = {
  tone: FormNoticeTone;
  message: string;
  /** Optional heading; defaults by tone when omitted. */
  title?: string;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_TITLES: Record<FormNoticeTone, string> = {
  error: "Error",
  success: "Success",
  info: "Notice",
};

/**
 * Form-level feedback (API/form messages). Theme-aware wrapper over StateNoticeCard.
 * Not a global toast system.
 */
export function FormNotice({
  tone,
  message,
  title,
  style,
}: FormNoticeProps) {
  const scheme = useColorScheme() ?? "light";
  const isDark = scheme === "dark";
  const semantic = getSemanticColors(scheme);
  const interactive = useThemeInteractive();

  const colors =
    tone === "error"
      ? {
          borderColor: interactive.danger,
          backgroundColor: interactive.dangerSoft,
          messageColor: semantic.danger,
        }
      : tone === "success"
        ? {
            borderColor: Brand.success,
            backgroundColor: isDark
              ? "rgba(29, 111, 82, 0.14)"
              : Palette.successSoft,
            messageColor: Brand.success,
          }
        : {
            borderColor: interactive.info,
            backgroundColor: interactive.infoSoft,
            messageColor: interactive.info,
          };

  return (
    <View style={style}>
      <StateNoticeCard
        title={title ?? DEFAULT_TITLES[tone]}
        message={message}
        borderColor={colors.borderColor}
        backgroundColor={colors.backgroundColor}
        messageColor={colors.messageColor}
      />
    </View>
  );
}
