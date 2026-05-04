import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

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

const STROKE_WIDTH = 34;
const MAX_GAUGE_PX = 280;
const GAUGE_WIDTH_FRAC = 0.6;
const SPARKLINE_HEIGHT = 40;
const GAUGE_ANIMATION_MS = 900;
const ROW_STAGGER_MS = 70;
const SPARK_TICKS = ['N', 'D', 'J', 'F', 'M', 'A'] as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function scoreIndicatorColor(score: number) {
  if (score < 40) return SCORE_BAD;
  if (score < 70) return SCORE_MID;
  return SCORE_GOOD;
}

function rgba(rgb: readonly [number, number, number], alpha: number) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function scoreStatus(score: number) {
  if (score < 40) return 'At Risk';
  if (score < 70) return 'Mixed';
  return 'Healthy';
}

function trendDirection(value: number): 'up' | 'flat' | 'down' {
  if (value >= 70) return 'up';
  if (value <= 45) return 'down';
  return 'flat';
}

function trendGlyph(direction: 'up' | 'flat' | 'down') {
  if (direction === 'up') return '↗';
  if (direction === 'down') return '↘';
  return '→';
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
  const targetDashOffset = circumference * (1 - score / 100);
  const accent = scoreIndicatorColor(score);

  // Keep non-state UI on a single neutral tone family.
  const neutralLine = isDark ? rgba(BrandRgb.offWhite, 0.22) : rgba(BrandRgb.charcoal, 0.22);
  const neutralLineStrong = isDark ? rgba(BrandRgb.offWhite, 0.3) : rgba(BrandRgb.charcoal, 0.3);
  const neutralFill = isDark ? rgba(BrandRgb.offWhite, 0.08) : rgba(BrandRgb.charcoal, 0.06);
  const neutralFillPressed = isDark ? rgba(BrandRgb.offWhite, 0.14) : rgba(BrandRgb.charcoal, 0.11);

  const gaugeTrackStroke = neutralLine;
  const barTrackBg = neutralFill;

  const center = size / 2;
  const animatedDashOffset = useRef(new Animated.Value(circumference)).current;
  const animatedScoreValue = useRef(new Animated.Value(0)).current;
  const rowAnims = useRef(BREAKDOWN.map(() => new Animated.Value(0))).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    animatedDashOffset.setValue(circumference);
    animatedScoreValue.setValue(0);
    rowAnims.forEach((anim) => anim.setValue(0));

    const ringAnimation = Animated.timing(animatedDashOffset, {
      toValue: targetDashOffset,
      duration: GAUGE_ANIMATION_MS,
      useNativeDriver: false,
    });
    const scoreAnimation = Animated.timing(animatedScoreValue, {
      toValue: score,
      duration: GAUGE_ANIMATION_MS,
      useNativeDriver: false,
    });
    const rowsAnimation = Animated.stagger(
      ROW_STAGGER_MS,
      rowAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ),
    );

    Animated.parallel([ringAnimation, scoreAnimation, rowsAnimation]).start();

    const sub = animatedScoreValue.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    return () => {
      ringAnimation.stop();
      scoreAnimation.stop();
      rowsAnimation.stop();
      animatedScoreValue.removeListener(sub);
    };
  }, [animatedDashOffset, animatedScoreValue, circumference, rowAnims, score, targetDashOffset]);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: semantic.cardBackground, borderColor: semantic.cardBorder },
      ]}>
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="gaugeProgressGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={SCORE_BAD} />
              <Stop offset="100%" stopColor={SCORE_MID} />
            </LinearGradient>
          </Defs>
          <Circle
            stroke={gaugeTrackStroke}
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
          />
          <AnimatedCircle
            stroke="url(#gaugeProgressGradient)"
            fill="none"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={circumference}
            strokeDashoffset={animatedDashOffset}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        </Svg>

        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: theme.text }]}>{displayScore}</Text>
          <Text style={[styles.status, { color: semantic.mutedText }]}>{scoreStatus(score)}</Text>
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
      <View style={styles.sparklineTicksWrap}>
        <View style={[styles.sparklineBaseline, { backgroundColor: neutralLine }]} />
        <View style={styles.sparkDotsRow}>
          {SPARK_TICKS.map((tick, idx) => (
            <View key={tick} style={styles.sparkTickItem}>
              <View
                style={[
                  styles.sparkDot,
                  { backgroundColor: idx === SPARK_TICKS.length - 1 ? accent : neutralLineStrong },
                ]}
              />
              <Text style={[styles.sparkTickLabel, { color: semantic.mutedText }]}>{tick}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.sectionDivider, { backgroundColor: neutralLine }]} />
      <Text style={[styles.sectionTitle, { color: semantic.mutedText }]}>Drivers</Text>

      <View style={styles.breakdown}>
        {BREAKDOWN.map((item, index) => (
          <Animated.View
            key={item.label}
            style={{
              opacity: rowAnims[index],
              transform: [
                {
                  translateY: rowAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${item.value} out of 100`}
              hitSlop={8}
              onPress={() => onBreakdownPress?.(item)}
              style={({ pressed }) => [
                styles.barRow,
                {
                  borderColor: neutralLine,
                },
                {
                  backgroundColor: pressed
                    ? neutralFillPressed
                    : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}>
              <View style={styles.labelWrap}>
                <Text style={[styles.label, { color: semantic.mutedText }]}>{item.label}</Text>
                <Text style={[styles.trendIcon, { color: semantic.mutedText }]}>
                  {trendGlyph(trendDirection(item.value))}
                </Text>
              </View>
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
          </Animated.View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 4,
    paddingBottom: Spacing.xl + 2,
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
  status: {
    fontSize: 12,
    marginTop: 2,
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
  sparklineTicksWrap: {
    width: '100%',
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  sparklineBaseline: {
    width: 170,
    height: StyleSheet.hairlineWidth,
  },
  sparkDotsRow: {
    width: 170,
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sparkTickItem: {
    alignItems: 'center',
    width: 20,
  },
  sparkDot: {
    width: 4,
    height: 4,
    borderRadius: 3,
    marginBottom: 3,
  },
  sparkTickLabel: {
    fontSize: 10,
  },
  sectionDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  breakdown: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs + 2,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  label: {
    flex: 1,
    fontSize: 13,
  },
  labelWrap: {
    width: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  trendIcon: {
    width: 14,
    textAlign: 'center',
    fontSize: 12,
    marginLeft: 4,
  },
  value: {
    width: 34,
    textAlign: 'right',
    fontSize: 13,
  },
});
