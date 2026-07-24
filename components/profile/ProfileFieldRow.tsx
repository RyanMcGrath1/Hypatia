import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/theme/ThemedText';
import { Colors } from '@/constants/theme/Colors';
import { Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { Fonts } from '@/constants/theme/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ProfileFieldRowProps = {
  label: string;
  value: string;
  /** Optional override for the value text color (e.g. TOTP Enabled). */
  valueColor?: string;
  testID?: string;
};

/**
 * Presentation-only label + value row for Profile sections.
 * Stacked layout so long values (email) wrap without overlapping the label.
 */
export function ProfileFieldRow({
  label,
  value,
  valueColor,
  testID,
}: ProfileFieldRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
      testID={testID}
    >
      <ThemedText
        style={[styles.label, { color: semantic.mutedText }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </ThemedText>
      <ThemedText
        style={[styles.value, { color: valueColor ?? theme.text }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.15,
  },
  value: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
  },
});
