import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BrandRgb, Colors } from '@/constants/theme/Colors';
import { Radius, Spacing, getSemanticColors } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

const DEFAULT_TREND = [50, 55, 60, 62, 65, 68] as const;

const BREAKDOWN = [
  { label: 'Growth', value: 80 },
  { label: 'Labor', value: 60 },
  { label: 'Inflation', value: 70 },
  { label: 'Fiscal', value: 30 },
  { label: 'Inequality', value: 40 },
  { label: 'Investment', value: 65 },
] as const;

type BreakdownItem = (typeof BREAKDOWN)[number];

type EconomicPulseChartProps = {
  score?: number;
  change?: number;
  trend?: number[];
  onBreakdownPress?: (item: BreakdownItem) => void;
};

/** Traffic-light only; everything else uses Hypatia tokens. */
const SCORE_BAD = '#ef4444';
const SCORE_MID = '#f59e0b';
const SCORE_GOOD = '#10b981';

const STROKE_WIDTH = 14;
const MAX_GAUGE_PX = 280;
const GAUGE_WIDTH_FRAC = 0.6;
const SPARKLINE_HEIGHT = 40;

function scoreIndicatorColor(score: number) {
  if (score < 40) return SCORE_BAD;
  if (score < 70) return SCORE_MID;
  return SCORE_GOOD;
}

function rgba(rgb: readonly [number, number, number], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

export default function EconomicPulseChart({
  score = 68,
  change = 2.4,
  trend = [...DEFAULT_TREND],
  onBreakdownPress,
}: EconomicPulseChartProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const isDark = colorScheme === 'dark';
  const { width: windowWidth } = useWindowDimensions();

  const size = Math.min(windowWidth * GAUGE_WIDTH_FRAC, MAX_GAUGE_PX);
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);
  const accent = scoreIndicatorColor(score);

  const gaugeTrackStroke = isDark
    ? rgba(BrandRgb.offWhite, 0.16)
    : rgba(BrandRgb.slateBlue, 0.35);

  const barTrackBg = isDark ? rgba(BrandRgb.offWhite, 0.12) : rgba(BrandRgb.charcoal, 0.1);

  const center = size / 2;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: semantic.cardBackground, borderColor: semantic.cardBorder },
      ]}>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <Circle
            stroke={gaugeTrackStroke}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={STROKE_WIDTH}
          />
          <Circle
            stroke={accent}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        </Svg>

        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: theme.text }]}>{score}</Text>
          <Text style={[styles.change, { color: change >= 0 ? SCORE_GOOD : SCORE_BAD }]}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)}
          </Text>
        </View>
      </View>

      <View style={styles.sparklineContainer}>
        {trend.map((val, i) => (
          <View
            key={`${i}-${val}`}
            style={[
              styles.sparkBar,
              { height: (val / 100) * SPARKLINE_HEIGHT, backgroundColor: accent },
            ]}
          />
        ))}
      </View>

      <View style={styles.breakdown}>
        {BREAKDOWN.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}, ${item.value} out of 100`}
            hitSlop={8}
            onPress={() => onBreakdownPress?.(item)}
            style={({ pressed }) => [
              styles.barRow,
              {
                borderColor: isDark
                  ? rgba(BrandRgb.offWhite, 0.28)
                  : rgba(BrandRgb.slateBlue, 0.28),
              },
              {
                backgroundColor: pressed
                  ? isDark
                    ? rgba(BrandRgb.offWhite, 0.08)
                    : rgba(BrandRgb.charcoal, 0.06)
                  : 'transparent',
              },
            ]}>
            <Text style={[styles.label, { color: semantic.mutedText }]}>{item.label}</Text>
            <View style={[styles.barBackground, { backgroundColor: barTrackBg }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${item.value}%`,
                    backgroundColor: scoreIndicatorColor(item.value),
                  },
                ]}
              />
            </View>
            <Text style={[styles.value, { color: theme.text }]}>{item.value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.sm,
  },
  gaugeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  score: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  change: {
    fontSize: 16,
    marginTop: Spacing.xs,
  },
  sparklineContainer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    height: SPARKLINE_HEIGHT,
    alignItems: 'flex-end',
  },
  sparkBar: {
    width: 6,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  breakdown: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  label: {
    width: 90,
    fontSize: 14,
  },
  barBackground: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: Spacing.sm,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  value: {
    width: 36,
    textAlign: 'right',
    fontSize: 14,
  },
});
