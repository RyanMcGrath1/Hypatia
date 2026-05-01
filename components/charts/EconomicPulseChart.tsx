import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useMemo, useState } from 'react';

import { ThemedText } from '@/components/theme/ThemedText';
import { Brand, Colors } from '@/constants/theme/Colors';
import { Radius, Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { ECONOMIC_PULSE_MONTH_LABELS, ECONOMIC_PULSE_SERIES } from '@/constants/data/usEconomicData';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function EconomicPulseChart() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const chartWidth = Math.min(Dimensions.get('window').width - 72, 560);
  const isDark = colorScheme === 'dark';
  const [visibleSeriesLabels, setVisibleSeriesLabels] = useState<string[]>(
    ECONOMIC_PULSE_SERIES.map((series) => series.label),
  );

  const activeSeries = useMemo(
    () =>
      ECONOMIC_PULSE_SERIES.filter((series) =>
        visibleSeriesLabels.includes(series.label),
      ),
    [visibleSeriesLabels],
  );

  const chartSeries = activeSeries.length > 0 ? activeSeries : ECONOMIC_PULSE_SERIES;

  const toggleSeriesVisibility = (label: string) => {
    setVisibleSeriesLabels((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  };

  const chartConfig = {
    backgroundGradientFrom: isDark ? Brand.slate : Brand.paper,
    backgroundGradientTo: isDark ? Brand.slate : Brand.paper,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 49, 46, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark ? `rgba(255, 255, 250, ${0.35 + 0.45 * opacity})` : `rgba(81, 80, 82, ${opacity})`,
    propsForDots: {
      r: '3',
      strokeWidth: '1.5',
      stroke: isDark ? Brand.ink : Brand.paper,
    },
    propsForBackgroundLines: {
      stroke: isDark ? Brand.steel : Brand.slate,
      strokeDasharray: '',
    },
    propsForLabels: {
      fontSize: 11,
    },
  };

  return (
    <View style={[styles.wrap, { borderColor: semantic.cardBorder }]}>
      <ThemedText type="defaultSemiBold">US Economic Pulse</ThemedText>
      <ThemedText style={[styles.caption, { color: theme.icon }]}>
        Indexed trend view (Nov=100) to compare macro direction.
      </ThemedText>

      <LineChart
        data={{
          labels: ECONOMIC_PULSE_MONTH_LABELS,
          datasets: chartSeries.map((series) => ({
            data: series.values,
            color: (opacity = 1) => {
              const hex = series.color;
              const r = Number.parseInt(hex.slice(1, 3), 16);
              const g = Number.parseInt(hex.slice(3, 5), 16);
              const b = Number.parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${opacity})`;
            },
            strokeWidth: 2,
          })),
          legend: chartSeries.map((series) => series.label),
        }}
        width={chartWidth}
        height={220}
        chartConfig={chartConfig}
        bezier
        withInnerLines
        withOuterLines={false}
        withShadow={false}
        fromZero={false}
        yLabelsOffset={8}
        style={styles.chart}
      />
      <View style={styles.legendWrap}>
        {ECONOMIC_PULSE_SERIES.map((series) => {
          const isEnabled = visibleSeriesLabels.includes(series.label);
          return (
            <Pressable
              key={series.label}
              accessibilityRole="button"
              accessibilityLabel={`Toggle ${series.label} trend line`}
              hitSlop={8}
              style={({ pressed }) => [
                styles.legendChip,
                {
                  borderColor: isEnabled ? series.color : semantic.cardBorder,
                  backgroundColor: isEnabled
                    ? isDark
                      ? Brand.ink
                      : semantic.cardSubtleBackground
                    : 'transparent',
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              onPress={() => toggleSeriesVisibility(series.label)}>
              <View style={[styles.legendDot, { backgroundColor: series.color }]} />
              <ThemedText style={{ color: isEnabled ? theme.text : semantic.mutedText, fontSize: 12 }}>
                {series.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    marginBottom: 14,
    paddingTop: 12,
    paddingBottom: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
  caption: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  chart: {
    borderRadius: 12,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: 8,
  },
  legendChip: {
    minHeight: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});
