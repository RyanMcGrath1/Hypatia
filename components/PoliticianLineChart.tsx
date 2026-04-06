import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Recharts targets the DOM; native builds use this placeholder.
 * Open the Politician tab in Expo web to see the line chart.
 */
export default function PoliticianLineChart() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <View style={[styles.box, { borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}>
      <ThemedText style={[styles.caption, { color: theme.icon }]}>
        Line chart (Recharts) renders on web. Use Expo web for this screen to view the chart.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    minHeight: 120,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  caption: {
    fontSize: 13,
    textAlign: 'center',
  },
});
