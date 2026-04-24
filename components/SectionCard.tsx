import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

type SectionCardProps = {
  children: ReactNode;
  backgroundColor: string;
  borderColor: string;
  style?: ViewStyle;
};

export function SectionCard({ children, backgroundColor, borderColor, style }: SectionCardProps) {
  return <View style={[styles.card, { backgroundColor, borderColor }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
});
