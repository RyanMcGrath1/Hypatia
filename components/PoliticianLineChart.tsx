import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PoliticianLineChart() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const chartWidth = Math.min(Dimensions.get('window').width - 72, 560);
  const isDark = colorScheme === 'dark';

  const chartConfig = {
    backgroundGradientFrom: isDark ? '#111827' : '#ffffff',
    backgroundGradientTo: isDark ? '#111827' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) =>
      isDark ? `rgba(96, 165, 250, ${opacity})` : `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark ? `rgba(156, 163, 175, ${opacity})` : `rgba(75, 85, 99, ${opacity})`,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: isDark ? '#1f2937' : '#ffffff',
    },
    propsForBackgroundLines: {
      stroke: isDark ? '#1f2937' : '#e5e7eb',
      strokeDasharray: '',
    },
  };

  return (
    <View style={[styles.box, { borderColor: isDark ? '#374151' : '#e5e7eb' }]}>
      <LineChart
        data={{
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{ data: [45, 51, 48, 55, 58, 62] }],
        }}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        withInnerLines
        withOuterLines={false}
        withShadow={false}
        fromZero
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginBottom: 8,
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 12,
  },
});
