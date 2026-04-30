import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { Brand } from '@/constants/Colors';
import { getSemanticColors } from '@/constants/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function PoliticianLineChart() {
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const chartWidth = Math.min(Dimensions.get('window').width - 72, 560);
  const isDark = colorScheme === 'dark';

  const chartConfig = {
    backgroundGradientFrom: isDark ? Brand.slate : Brand.paper,
    backgroundGradientTo: isDark ? Brand.slate : Brand.paper,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 49, 46, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark ? `rgba(255, 255, 250, ${0.35 + 0.45 * opacity})` : `rgba(81, 80, 82, ${opacity})`,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: isDark ? Brand.ink : Brand.paper,
    },
    propsForBackgroundLines: {
      stroke: isDark ? Brand.steel : Brand.slate,
      strokeDasharray: '',
    },
  };

  return (
    <View style={[styles.box, { borderColor: semantic.cardBorder }]}>
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
