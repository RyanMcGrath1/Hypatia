import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
};

export function ScreenHeader({ title, subtitle, subtitleColor }: ScreenHeaderProps) {
  return (
    <View style={styles.wrap}>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.subtitle, subtitleColor ? { color: subtitleColor } : undefined]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    lineHeight: 21,
  },
});
