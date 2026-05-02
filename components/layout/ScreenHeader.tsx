import { StyleSheet, View, type StyleProp, type TextStyle } from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Spacing } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  /** Merged after base subtitle styles (e.g. larger `fontSize`). */
  subtitleStyle?: StyleProp<TextStyle>;
  /** Smaller line under the subtitle (e.g. “As of …”, provenance). */
  meta?: string;
  metaColor?: string;
  metaStyle?: StyleProp<TextStyle>;
};

export function ScreenHeader({
  title,
  subtitle,
  subtitleColor,
  subtitleStyle,
  meta,
  metaColor,
  metaStyle,
}: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText
          style={[
            styles.subtitle,
            subtitleColor ? { color: subtitleColor } : undefined,
            subtitleStyle,
          ]}
        >
          {subtitle}
        </ThemedText>
      ) : null}
      {meta ? (
        <ThemedText
          style={[
            styles.meta,
            metaColor ? { color: metaColor } : undefined,
            metaStyle,
          ]}
        >
          {meta}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.md,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  meta: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.xs,
    letterSpacing: 0.15,
  },
});
