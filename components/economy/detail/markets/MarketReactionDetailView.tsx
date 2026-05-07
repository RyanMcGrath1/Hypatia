import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
  ECONOMY_DASHBOARD_POSITIVE_GREEN,
  EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import {
  MARKET_CALENDAR_ROWS,
  MARKET_CORRELATION_LABELS,
  MARKET_DXY_CHANGE,
  MARKET_DXY_VALUE,
  MARKET_SENTIMENT_BEAR,
  MARKET_SENTIMENT_BULL,
  MARKET_SPX_CHANGE,
  MARKET_SPX_NORM,
  MARKET_SPX_PREV,
  MARKET_SPX_VALUE,
  MARKET_US10Y_NORM,
  MARKET_UST_CHANGE,
  MARKET_UST_RANGE,
  MARKET_UST_VALUE,
  MARKET_VIX_SPARK,
  MARKET_VIX_VALUE,
  MARKET_YIELD_CURRENT,
  MARKET_YIELD_LABELS,
  MARKET_YIELD_PRIOR,
} from "@/components/economy/detail/markets/marketDetailData";
import { ThemedText } from "@/components/theme/ThemedText";
import { Brand, Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const CORR_CHART_H = 140;
const CORR_PAD_X = 8;
const CORR_PAD_TOP = 14;
const CORR_PAD_BOTTOM = 26;

const YIELD_CHART_H = 120;
const VIX_SPARK_H = 32;
const VIX_SPARK_W = 108;

const TRADING_FLOOR_IMAGE =
  "https://images.unsplash.com/photo-1611974765270-ca1258634369?w=800&q=70";

function buildPolylinePoints(norm: readonly number[], n: number, innerW: number, innerH: number): string {
  const step = innerW / Math.max(n - 1, 1);
  const segments: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = CORR_PAD_X + i * step;
    const y = CORR_PAD_TOP + (1 - norm[i]!) * innerH;
    segments.push(`${x},${y}`);
  }
  return segments.join(" ");
}

export function MarketReactionDetailView() {
  const { width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;
  const dangerRed = isDark ? interactive.danger : "#DC2626";

  const corrWidth = useMemo(() => Math.min(windowWidth - Spacing.lg * 2 - Spacing.lg * 2, 360), [windowWidth]);

  const { spxPoints, ustPoints } = useMemo(() => {
    const n = MARKET_CORRELATION_LABELS.length;
    const innerW = Math.max(corrWidth - CORR_PAD_X * 2, 120);
    const innerH = CORR_CHART_H - CORR_PAD_TOP - CORR_PAD_BOTTOM;
    return {
      spxPoints: buildPolylinePoints(MARKET_SPX_NORM, n, innerW, innerH),
      ustPoints: buildPolylinePoints(MARKET_US10Y_NORM, n, innerW, innerH),
    };
  }, [corrWidth]);

  const yieldChartW = corrWidth;
  const { yieldCurrentPts, yieldPriorPts } = useMemo(() => {
    const n = MARKET_YIELD_LABELS.length;
    const innerW = Math.max(yieldChartW - CORR_PAD_X * 2, 80);
    const innerH = YIELD_CHART_H - CORR_PAD_TOP - CORR_PAD_BOTTOM;
    return {
      yieldCurrentPts: buildPolylinePoints(MARKET_YIELD_CURRENT, n, innerW, innerH),
      yieldPriorPts: buildPolylinePoints(MARKET_YIELD_PRIOR, n, innerW, innerH),
    };
  }, [yieldChartW]);

  const vixSparkPoints = useMemo(() => {
    const n = MARKET_VIX_SPARK.length;
    const innerW = VIX_SPARK_W - 4;
    const innerH = VIX_SPARK_H - 6;
    const pts: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const x = 2 + (i / Math.max(n - 1, 1)) * innerW;
      const y = 2 + (1 - MARKET_VIX_SPARK[i]!) * innerH;
      pts.push(`${x},${y}`);
    }
    return pts.join(" ");
  }, []);

  return (
    <EconomyDetailShell
      pageTitle="Markets"
      showLiveFeed={false}
      headerLayout="sectorInline"
      inlineHeaderIcon="activity"
    >
      <EconomyCard>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>
          ASSET CORRELATION: S&P 500 VS US10Y
        </ThemedText>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: green }]} />
            <ThemedText style={[styles.legendText, { color: semantic.mutedText }]}>S&P 500</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDash, { borderColor: interactive.primary }]} />
            <ThemedText style={[styles.legendText, { color: semantic.mutedText }]}>US10Y YIELD</ThemedText>
          </View>
        </View>
        <Svg width={corrWidth} height={CORR_CHART_H}>
          <Polyline
            points={spxPoints}
            fill="none"
            stroke={green}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Polyline
            points={ustPoints}
            fill="none"
            stroke={interactive.primary}
            strokeWidth={2}
            strokeDasharray="6 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <View style={styles.xLabelsRow}>
          {MARKET_CORRELATION_LABELS.map((label) => (
            <ThemedText key={label} style={[styles.xLabel, { color: semantic.mutedText }]} numberOfLines={1}>
              {label}
            </ThemedText>
          ))}
        </View>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>S&P 500 INDEX</ThemedText>
        <View style={styles.metricRow}>
          <ThemedText style={[styles.heroValue, { color: theme.text }]}>{MARKET_SPX_VALUE}</ThemedText>
          <ThemedText style={[styles.deltaPos, { color: green }]}>{MARKET_SPX_CHANGE}</ThemedText>
        </View>
        <ThemedText style={[styles.subMuted, { color: semantic.mutedText }]}>
          PREV. CLOSE: {MARKET_SPX_PREV}
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>US 10-YEAR YIELD</ThemedText>
        <View style={styles.metricRow}>
          <ThemedText style={[styles.heroValue, { color: theme.text }]}>{MARKET_UST_VALUE}</ThemedText>
          <ThemedText style={[styles.deltaNeg, { color: dangerRed }]}>{MARKET_UST_CHANGE}</ThemedText>
        </View>
        <ThemedText style={[styles.subMuted, { color: semantic.mutedText }]}>
          INTRA-DAY RANGE: {MARKET_UST_RANGE}
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <View style={styles.cardTitleRow}>
          <ThemedText style={[styles.kicker, { color: semantic.mutedText, marginBottom: 0 }]}>
            YIELD CURVE INVERSION
          </ThemedText>
          <View style={[styles.invertedBadge, { backgroundColor: interactive.dangerSoft }]}>
            <ThemedText style={[styles.invertedBadgeText, { color: interactive.danger }]}>INVERTED</ThemedText>
          </View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: interactive.primary }]} />
            <ThemedText style={[styles.legendText, { color: semantic.mutedText }]}>CURRENT</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDash, { borderColor: interactive.primary }]} />
            <ThemedText style={[styles.legendText, { color: semantic.mutedText }]}>1MO AGO</ThemedText>
          </View>
        </View>
        <Svg width={yieldChartW} height={YIELD_CHART_H}>
          <Polyline
            points={yieldPriorPts}
            fill="none"
            stroke={interactive.primary}
            strokeWidth={1.75}
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.65}
          />
          <Polyline
            points={yieldCurrentPts}
            fill="none"
            stroke={interactive.primary}
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <View style={styles.yieldXRow}>
          {MARKET_YIELD_LABELS.map((label) => (
            <ThemedText key={label} style={[styles.xLabel, { color: semantic.mutedText }]}>
              {label}
            </ThemedText>
          ))}
        </View>
      </EconomyCard>

      <EconomyCard>
        <View style={styles.calHeader}>
          <ThemedText style={[styles.kicker, { color: semantic.mutedText, marginBottom: 0 }]}>
            ECONOMIC CALENDAR
          </ThemedText>
          <Ionicons name="calendar-outline" size={20} color={semantic.mutedText} />
        </View>
        <View style={[styles.tableRule, { backgroundColor: semantic.hairline }]} />
        <View style={styles.thRow}>
          <ThemedText style={[styles.th, { color: semantic.mutedText }]}>EVENT</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>TIME</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>EXP.</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>PREV.</ThemedText>
        </View>
        {MARKET_CALENDAR_ROWS.map((row) => (
          <View
            key={row.event}
            style={[
              styles.tr,
              { borderTopColor: semantic.hairline },
              row.highlight ? { backgroundColor: interactive.primarySoft, borderRadius: Radius.md } : null,
            ]}
          >
            <ThemedText
              style={[styles.tdEvent, { color: row.highlight ? interactive.primary : theme.text }]}
              numberOfLines={2}
            >
              {row.event}
            </ThemedText>
            <ThemedText style={[styles.td, { color: semantic.mutedText }]}>{row.time}</ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: theme.text }]}>{row.exp}</ThemedText>
            <ThemedText style={[styles.td, styles.tdNum, { color: theme.text }]}>{row.prev}</ThemedText>
          </View>
        ))}
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>VOLATILITY (VIX)</ThemedText>
        <View style={styles.vixRow}>
          <ThemedText style={[styles.heroValueSm, { color: theme.text }]}>{MARKET_VIX_VALUE}</ThemedText>
          <Svg width={VIX_SPARK_W} height={VIX_SPARK_H}>
            <Polyline
              points={vixSparkPoints}
              fill="none"
              stroke={green}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>DOLLAR INDEX (DXY)</ThemedText>
        <View style={styles.metricRow}>
          <ThemedText style={[styles.heroValue, { color: theme.text }]}>{MARKET_DXY_VALUE}</ThemedText>
          <ThemedText style={[styles.deltaNeg, { color: dangerRed }]}>{MARKET_DXY_CHANGE}</ThemedText>
        </View>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.kicker, { color: semantic.mutedText }]}>MARKET SENTIMENT</ThemedText>
        <View style={[styles.sentimentTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
          <View style={[styles.sentimentBull, { flex: MARKET_SENTIMENT_BULL, backgroundColor: green }]} />
          <View style={{ flex: MARKET_SENTIMENT_BEAR }} />
        </View>
        <View style={styles.sentimentLabels}>
          <ThemedText style={[styles.sentimentLabel, { color: green }]}>
            BULLISH {MARKET_SENTIMENT_BULL}%
          </ThemedText>
          <ThemedText style={[styles.sentimentLabel, { color: semantic.mutedText }]}>
            BEARISH {MARKET_SENTIMENT_BEAR}%
          </ThemedText>
        </View>
      </EconomyCard>

      <View style={styles.liveEngineWrap}>
        <Image source={{ uri: TRADING_FLOOR_IMAGE }} style={styles.liveEngineImage} contentFit="cover" />
        <View style={styles.liveEngineScrim} />
        <View style={styles.liveEngineBadge}>
          <View style={styles.liveEnginePill}>
            <Feather name="wifi" size={14} color={Brand.ink} />
            <ThemedText style={[styles.liveEngineText, { color: Brand.ink }]}>LIVE DATA ENGINE CONNECTED</ThemedText>
          </View>
        </View>
      </View>
    </EconomyDetailShell>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.45,
    marginBottom: Spacing.sm,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendDash: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderStyle: "solid",
  },
  legendText: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  xLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 2,
  },
  xLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodyMedium,
    flex: 1,
    textAlign: "center",
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  heroValue: {
    fontSize: 26,
    fontFamily: Fonts.displaySemibold,
    letterSpacing: -0.3,
  },
  heroValueSm: {
    fontSize: 24,
    fontFamily: Fonts.displaySemibold,
  },
  deltaPos: {
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
  },
  deltaNeg: {
    fontSize: 16,
    fontFamily: Fonts.bodySemiBold,
  },
  subMuted: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  invertedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  invertedBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
  yieldXRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: CORR_PAD_X,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  tableRule: {
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xs,
  },
  thRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 6,
    gap: 4,
  },
  th: {
    flex: 1.4,
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.35,
  },
  thNum: {
    flex: 0.65,
    textAlign: "right",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tdEvent: {
    flex: 1.4,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  td: {
    flex: 0.65,
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  tdNum: {
    textAlign: "right",
  },
  vixRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sentimentTrack: {
    flexDirection: "row",
    height: 12,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  sentimentBull: {
    borderTopLeftRadius: Radius.full,
    borderBottomLeftRadius: Radius.full,
  },
  sentimentLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sentimentLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
  },
  liveEngineWrap: {
    borderRadius: Radius.xl,
    overflow: "hidden",
    height: 100,
    marginTop: Spacing.xs,
  },
  liveEngineImage: {
    ...StyleSheet.absoluteFillObject,
  },
  liveEngineScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  liveEngineBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  liveEnginePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  liveEngineText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.5,
  },
});
