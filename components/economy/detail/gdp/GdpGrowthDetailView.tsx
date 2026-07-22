import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { EconomyDetailShell } from "@/components/economy/detail/shared/EconomyDetailShell";
import { laborMarketDetailStyles as laborStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyGdpGrowthHeadwinds, useEconomyGdpGrowthRate } from "@/hooks/useEconomyGdpGrowthRate";
import { useEconomyGdpSectorContribution } from "@/hooks/useEconomyGdpSectorContribution";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";
import { gdpGrowthFromApi, gdpGrowthHeadwindsFromApi } from "@/lib/economy/gdpGrowthViewModel";
import { gdpSectorContributionFromApi } from "@/lib/economy/gdpSectorContributionViewModel";

const SPARK_HEIGHT = 156;
const SPARK_LABEL_WIDTH = 40;

function curvePath(values: number[], width: number, height: number): string {
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = (1 - v) * height;
    return { x, y };
  });
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const c1x = prev.x + stepX / 2;
    const c1y = prev.y;
    const c2x = curr.x - stepX / 2;
    const c2y = curr.y;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export function GdpGrowthDetailView() {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";

  const {
    data: gdpGrowthApi,
    isLoading: gdpGrowthLoading,
    error: gdpGrowthError,
  } = useEconomyGdpGrowthRate();
  const gdpGrowth = useMemo(() => gdpGrowthFromApi(gdpGrowthApi), [gdpGrowthApi]);
  const gdpGrowthPending = isEconomyDataPending({
    isLoading: gdpGrowthLoading,
    error: gdpGrowthError,
    hasData: gdpGrowthApi != null,
  });

  const {
    data: sectorContributionApi,
    isLoading: sectorContributionLoading,
    error: sectorContributionError,
  } = useEconomyGdpSectorContribution();
  const sectorContribution = useMemo(
    () => gdpSectorContributionFromApi(sectorContributionApi, interactive.primary),
    [sectorContributionApi, interactive.primary],
  );
  const sectorContributionPending = isEconomyDataPending({
    isLoading: sectorContributionLoading,
    error: sectorContributionError,
    hasData: sectorContributionApi != null,
  });

  const {
    data: headwindsApi,
    isLoading: headwindsLoading,
    error: headwindsError,
  } = useEconomyGdpGrowthHeadwinds();
  const headwinds = useMemo(() => gdpGrowthHeadwindsFromApi(headwindsApi), [headwindsApi]);
  const headwindsPending = isEconomyDataPending({
    isLoading: headwindsLoading,
    error: headwindsError,
    hasData: headwindsApi != null,
  });

  const [chartWidth, setChartWidth] = useState(0);
  const handleChartLayout = useCallback((width: number) => {
    const next = Math.floor(width);
    if (next > 0) {
      setChartWidth((prev) => (prev === next ? prev : next));
    }
  }, []);

  const spark = useMemo(() => {
    if (chartWidth <= 0) {
      return null;
    }
    const values = gdpGrowth.sparkValues.length > 0 ? gdpGrowth.sparkValues : [0.5];
    return {
      line: curvePath(values, chartWidth, SPARK_HEIGHT),
      area: `${curvePath(values, chartWidth, SPARK_HEIGHT)} L ${chartWidth} ${SPARK_HEIGHT} L 0 ${SPARK_HEIGHT} Z`,
    };
  }, [chartWidth, gdpGrowth.sparkValues]);

  const { economyOverview } = useEconomyTabDashboard();
  const updatedDisplay = useMemo(
    () => resolveEconomyOverviewUpdatedDisplay(economyOverview?.as_of),
    [economyOverview?.as_of],
  );

  return (
    <EconomyDetailShell
      pageTitle="GDP GROWTH"
      showLiveFeed={false}
      headerLayout="sectorInline"
      inlineHeaderIcon="trending-up"
      updatedDisplay={updatedDisplay}
    >
      <EconomyCard style={styles.heroCard}>
        <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
          REAL GDP GROWTH RATE
        </ThemedText>
        <ThemedText
          style={[
            styles.heroValue,
            { color: gdpGrowthPending ? semantic.mutedText : theme.text },
          ]}
        >
          {gdpGrowthPending ? "—" : gdpGrowth.valueLabel}
        </ThemedText>
        <ThemedText style={[styles.heroSub, { color: semantic.mutedText }]}>
          {gdpGrowthPending ? "Quarter-over-Quarter" : gdpGrowth.subtitle}
        </ThemedText>
        <View style={[styles.sparkWrap, { backgroundColor: semantic.cardSubtleBackground }]}>
          <View
            style={styles.sparkChart}
            onLayout={(event) => handleChartLayout(event.nativeEvent.layout.width)}
          >
            {spark ? (
              <Svg
                width="100%"
                height={SPARK_HEIGHT}
                viewBox={`0 0 ${chartWidth} ${SPARK_HEIGHT}`}
                preserveAspectRatio="none"
              >
                <Path
                  d={spark.area}
                  fill={isDark ? "rgba(74,108,247,0.18)" : "rgba(74,108,247,0.15)"}
                />
                <Path d={spark.line} stroke={interactive.primary} strokeWidth={2.5} fill="none" />
              </Svg>
            ) : (
              <View style={{ height: SPARK_HEIGHT }} />
            )}
            <View style={[styles.sparkLabels, chartWidth > 0 ? { width: chartWidth } : null]}>
              {gdpGrowth.sparkLabels.map((item) => (
                <ThemedText
                  key={`${item.label}-${item.position}`}
                  style={[
                    styles.sparkLabel,
                    {
                      color: semantic.mutedText,
                      left: chartWidth * item.position - SPARK_LABEL_WIDTH / 2,
                    },
                  ]}
                >
                  {item.label}
                </ThemedText>
              ))}
            </View>
          </View>
        </View>
      </EconomyCard>

      <EconomyCard style={styles.forecastCard}>
        <View
          style={[
            styles.forecastGradient,
            {
              backgroundColor: isDark ? "rgba(74,108,247,0.12)" : "#EEF2FF",
            },
          ]}
        >
          <View style={styles.forecastKickerRow}>
            <Ionicons name="sparkles" size={12} color={interactive.primary} />
            <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
              AI ECONOMIC FORECAST
            </ThemedText>
          </View>
          <ThemedText style={[styles.forecastTitle, { color: theme.text }]}>
            Stable Convergence
          </ThemedText>
          <ThemedText style={[styles.forecastBody, { color: semantic.mutedText }]}>
            Predictive models suggest a 2.1% growth trajectory for Q4. Recent consumer spending data correlates
            with a cooling but resilient labor market.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.modelBtn,
              { backgroundColor: interactive.primaryFill, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText style={[styles.modelBtnText, { color: interactive.onPrimaryFill }]}>
              View Model Details
            </ThemedText>
          </Pressable>
        </View>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[laborStyles.tableTitle, { color: theme.text, marginBottom: Spacing.sm }]}>
          SECTOR CONTRIBUTION
        </ThemedText>
        {sectorContribution.observationDateLabel ? (
          <ThemedText style={[styles.sectorSub, { color: semantic.mutedText }]}>
            Share of real GDP · {sectorContribution.observationDateLabel}
          </ThemedText>
        ) : null}
        {sectorContribution.rows.map((row) => (
          <View key={row.key} style={styles.contribRow}>
            <View style={styles.contribLabelRow}>
              <ThemedText style={[styles.contribLabel, { color: theme.text }]}>{row.label}</ThemedText>
              <ThemedText
                style={[
                  styles.contribPct,
                  { color: sectorContributionPending ? semantic.mutedText : theme.text },
                ]}
              >
                {sectorContributionPending ? "—" : row.valueLabel}
              </ThemedText>
            </View>
            <View style={[styles.contribTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
              <View
                style={[
                  styles.contribFill,
                  {
                    width: sectorContributionPending ? "0%" : `${row.barWidthPct}%`,
                    backgroundColor: row.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </EconomyCard>

      <EconomyCard>
        <View style={styles.sectionHeadRow}>
          <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
            GROWTH HEADWINDS & RISKS
          </ThemedText>
        </View>
        {headwinds.map((risk) => (
          <View key={risk.key} style={[styles.riskCard, { borderColor: semantic.hairline }]}>
            <View style={styles.riskHead}>
              <Feather name={risk.icon} size={13} color={semantic.mutedText} />
              <ThemedText style={[styles.riskTitle, { color: theme.text }]}>{risk.title}</ThemedText>
            </View>
            <ThemedText style={[styles.riskBody, { color: semantic.mutedText }]}>
              {headwindsPending ? "—" : risk.body}
            </ThemedText>
            <ThemedText style={[styles.riskFlag, { color: isDark ? "#FCA5A5" : "#991B1B" }]}>
              {headwindsPending ? "—" : risk.riskLabel}
            </ThemedText>
          </View>
        ))}
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[laborStyles.tableTitle, { color: theme.text }]}>
          HISTORICAL PERFORMANCE
        </ThemedText>
        <ThemedText style={[styles.historySub, { color: semantic.mutedText }]}>
          Real vs. Nominal GDP Growth (5-Year Horizon)
        </ThemedText>
        <View style={styles.pillsRow}>
          <View style={[styles.pill, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View style={[styles.pillDot, { backgroundColor: interactive.primary }]} />
            <ThemedText style={[styles.pillText, { color: semantic.mutedText }]}>Real GDP</ThemedText>
          </View>
          <View style={[styles.pill, { backgroundColor: semantic.cardSubtleBackground }]}>
            <View style={[styles.pillDot, { backgroundColor: "#111827" }]} />
            <ThemedText style={[styles.pillText, { color: semantic.mutedText }]}>Nominal GDP</ThemedText>
          </View>
        </View>
        <View style={[styles.historyViz, { backgroundColor: semantic.cardSubtleBackground }]}>
          <Ionicons name="trending-up-outline" size={34} color={interactive.primary} />
          <ThemedText style={[styles.historyHint, { color: semantic.mutedText }]}>
            Interactive Historical Data Visualizer
          </ThemedText>
        </View>
      </EconomyCard>
    </EconomyDetailShell>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    paddingBottom: Spacing.md,
  },
  heroValue: {
    marginTop: 2,
    fontSize: 38,
    lineHeight: 42,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.6,
  },
  heroSub: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  sparkWrap: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    overflow: "hidden",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  sparkChart: {
    width: "100%",
  },
  sparkLabels: {
    marginTop: Spacing.sm,
    height: 16,
    position: "relative",
  },
  sparkLabel: {
    position: "absolute",
    width: SPARK_LABEL_WIDTH,
    textAlign: "center",
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
  },
  forecastCard: {
    padding: 0,
    overflow: "hidden",
  },
  forecastGradient: {
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: "#4A6CF7",
    gap: 8,
  },
  forecastKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  forecastTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontFamily: Fonts.displaySemibold,
  },
  forecastBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  modelBtn: {
    marginTop: Spacing.sm,
    minHeight: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modelBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  sectionHeadRow: {
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectorSub: {
    marginBottom: Spacing.sm,
    fontSize: 11,
    fontFamily: Fonts.body,
  },
  contribRow: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  contribLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contribLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyMedium,
  },
  contribPct: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  contribTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  contribFill: {
    height: "100%",
    borderRadius: 999,
  },
  riskCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  riskHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  riskTitle: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
  },
  riskBody: {
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  riskFlag: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  historySub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: Fonts.body,
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: Spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  pillText: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
  historyViz: {
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  historyHint: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
  },
});
