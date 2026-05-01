import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

type SectionCardProps = {
  children: ReactNode;
  backgroundColor: string;
  borderColor: string;
  style?: ViewStyle;
};

export function SectionCard({ children, backgroundColor, borderColor, style }: SectionCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor },
        semantic.cardShadow,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 14,
    gap: 10,
  },
});
