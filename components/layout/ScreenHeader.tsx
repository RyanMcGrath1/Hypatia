import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Spacing } from '@/constants/ThemeTokens';
import { Fonts } from '@/constants/Typography';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  /** Merged after base subtitle styles (e.g. larger `fontSize`). */
  subtitleStyle?: StyleProp<TextStyle>;
};

export function ScreenHeader({
  title,
  subtitle,
  subtitleColor,
  subtitleStyle,
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
});
