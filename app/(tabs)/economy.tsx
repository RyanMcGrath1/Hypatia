import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { AppBrandBar } from "@/components/layout/AppBrandBar";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { AppRoutes } from "@/constants/app/routes";
import { TAB_SCREEN_CONTENT_INSETS } from "@/constants/navigation/tabScreenContentInsets";
import {
  US_ECONOMIC_SECTORS,
  type SectorTrend,
} from "@/constants/data/usEconomicData";
import { Colors } from "@/constants/theme/Colors";
import {
  getSemanticColors,
  getTabScreenCanvasTint,
  Radius,
  Spacing,
} from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { fetchEconomySectorDashboard } from "@/hooks/api/flaskMainApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  formatOverviewAsOfDisplay,
  isEconomySectionPayload,
  type EconomyOverviewApiResponse,
} from "@/lib/economy/economyOverviewTypes";
import { mergeEconomySectorDashboardResponses } from "@/lib/economy/mergeEconomySectorDashboardResponses";
import {
  formatObservationMonthYear,
  formatOverviewMetricValue,
  getSectorCardDisplay,
  SECTOR_ID_TO_OVERVIEW_KEY,
} from "@/lib/economy/sectorOverviewMerge";

type FeedRow = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  trend: SectorTrend;
  history: number[];
  /** ISO dates aligned with `history` when observations came from the API */
  historyDates?: string[];
  /** Section unit for formatting selected bar values */
  valueUnit?: string;
  /** True when this tile id maps to an overview `sections` key (still may have zero observations). */
  overviewSectionBound: boolean;
};

/** Matches `sections` keys from `GET /api/economy/{id}/dashboard` via {@link SECTOR_ID_TO_OVERVIEW_KEY}. */
const FEED_IDS = ["labor", "inflation", "rates", "gdp"];
const sentimentScore = 74;
const sentimentDelta = 2.4;
const sentimentStability = 68.2;

const DEVELOPMENTS = [
  "Fed Beige Book highlights modest growth and resilient labor conditions.",
  "Crude oil inventories rise more than expected, softening energy inflation risk.",
  "Initial jobless claims hold near cycle lows as hiring remains steady.",
];

const MONITORING = [
  "Unemployment claims trend",
  "Treasury curve shape",
  "Inflation expectations",
  "Bank credit conditions",
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type SentimentGaugeProps = {
  score: number;
  isDark: boolean;
  mutedTextColor: string;
  positiveAccentColor: string;
};

function SentimentGauge({
  score,
  isDark,
  mutedTextColor,
  positiveAccentColor,
}: SentimentGaugeProps) {
  const gaugeProgress = useRef(new Animated.Value(0)).current;
  const clampedScore = Math.max(0, Math.min(100, score));
  const size = 190;
  const center = size / 2;
  const radius = 66;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const trackColor = isDark ? "rgba(184, 195, 255, 0.16)" : "#f3f2fe";

  useEffect(() => {
    gaugeProgress.setValue(0);
    Animated.timing(gaugeProgress, {
      toValue: clampedScore / 100,
      duration: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedScore, gaugeProgress]);

  const strokeDashoffset = gaugeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.gaugeRoot}>
      <View style={styles.gaugeGlow}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="sentimentGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#4A6CF7" />
              <Stop
                offset="100%"
                stopColor={isDark ? positiveAccentColor : "#2e7d32"}
              />
            </LinearGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#sentimentGaugeGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        </Svg>
      </View>
      <View style={styles.gaugeCenter}>
        <ThemedText style={styles.gaugeScore}>{Math.round(clampedScore)}</ThemedText>
        <View style={styles.gaugeStatusRow}>
          <ThemedText style={[styles.gaugeStatus, { color: positiveAccentColor }]}>
            OPTIMAL
          </ThemedText>
          <Feather name="trending-up" size={12} color={positiveAccentColor} />
        </View>
        <ThemedText style={[styles.gaugeSubtleLabel, { color: mutedTextColor }]}>
          ANNUAL AVG
        </ThemedText>
      </View>
    </View>
  );
}

function trendVisual(trend: SectorTrend, isDark: boolean) {
  if (trend === "up") {
    return {
      icon: "arrow-up-right" as const,
      color: isDark ? "#4ADE80" : "#16A34A",
    };
  }
  if (trend === "down") {
    return {
      icon: "arrow-down-right" as const,
      color: "#E26D5A",
    };
  }
  return {
    icon: "arrow-right" as const,
    color: isDark ? "#FACC15" : "#CA8A04",
  };
}

function sentimentLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

function normalizeBars(values: number[]) {
  if (values.length === 0) {
    return [];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) {
    return values.map(() => 0.55);
  }
  return values.map((value) => {
    const normalized = (value - min) / range;
    // Keep bars visible even for lower points.
    return 0.28 + normalized * 0.72;
  });
}

function resolveFeedBarSelectionIndex(
  rowId: string,
  barCount: number,
  map: Record<string, number>,
): number {
  if (barCount <= 0) return 0;
  const stored = map[rowId];
  if (typeof stored === "number" && stored >= 0 && stored < barCount) {
    return stored;
  }
  return barCount - 1;
}

function formatFeedBarValue(raw: number, unit: string | undefined): string {
  if (unit) {
    return formatOverviewMetricValue(raw, unit);
  }
  return raw.toLocaleString("en-US", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  });
}

function getTrendFromSeries(
  values: number[],
  fallback: SectorTrend,
): SectorTrend {
  if (values.length < 2) {
    return fallback;
  }
  const first = values[0]!;
  const last = values[values.length - 1]!;
  if (last > first) {
    return "up";
  }
  if (last < first) {
    return "down";
  }
  return "flat";
}

export default function EconomyDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const canvasTint = getTabScreenCanvasTint(colorScheme);
  const gaugePositiveColor = isDark ? "#4ADE80" : "#2e7d32";

  const [economyOverview, setEconomyOverview] =
    useState<EconomyOverviewApiResponse | null>(null);
  const [isEconomyOverviewLoading, setIsEconomyOverviewLoading] =
    useState(true);
  const [economyOverviewError, setEconomyOverviewError] = useState<
    string | null
  >(null);
  const [selectedBarIndexBySector, setSelectedBarIndexBySector] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setIsEconomyOverviewLoading(true);
        setEconomyOverviewError(null);
        const settled = await Promise.allSettled(
          FEED_IDS.map((id) =>
            fetchEconomySectorDashboard(id, controller.signal),
          ),
        );
        if (!cancelled) {
          const merged = mergeEconomySectorDashboardResponses(settled);
          if (merged) {
            setEconomyOverview(merged);
          } else {
            setEconomyOverview(null);
            const firstRejection = settled.find(
              (r): r is PromiseRejectedResult => r.status === "rejected",
            );
            const reason =
              firstRejection?.reason instanceof Error
                ? firstRejection.reason.message
                : "Could not load economy sector dashboards.";
            setEconomyOverviewError(reason);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setEconomyOverview(null);
          const message =
            err instanceof Error && err.message.startsWith("Network error")
              ? getNewsApiNetworkErrorMessage()
              : err instanceof Error
                ? err.message
                : String(err);
          setEconomyOverviewError(message);
        }
      } finally {
        if (!cancelled) {
          setIsEconomyOverviewLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Build the high-level feed card model from base sector config + optional API overlay.
  const feedRows = useMemo<FeedRow[]>(() => {
    return FEED_IDS.map((id) =>
      US_ECONOMIC_SECTORS.find((sector) => sector.id === id),
    )
      .filter(
        (sector): sector is (typeof US_ECONOMIC_SECTORS)[number] =>
          sector != null,
      )
      .map((sector) => {
        // getSectorCardDisplay merges sector defaults with live economyOverview values.
        const display = getSectorCardDisplay(sector, economyOverview);
        const sectionKey = SECTOR_ID_TO_OVERVIEW_KEY[sector.id];
        const rawSection =
          sectionKey && economyOverview?.sections
            ? economyOverview.sections[sectionKey]
            : undefined;
        const section = isEconomySectionPayload(rawSection) ? rawSection : undefined;
        const sortedObs =
          section && section.observations.length > 0
            ? [...section.observations].sort((a, b) =>
                a.date.localeCompare(b.date),
              )
            : [];
        const history = sortedObs.map((o) => o.value);
        const historyDates =
          sortedObs.length > 0 ? sortedObs.map((o) => o.date) : undefined;
        return {
          id: sector.id,
          title: display.title.toUpperCase(),
          subtitle: display.headlineLabel,
          value: display.headlineValue,
          trend: getTrendFromSeries(history, sector.trend),
          history,
          historyDates,
          valueUnit: section?.unit,
          /** Dashboard tile has a `sections` key on the overview API (may still have zero observations). */
          overviewSectionBound: Boolean(sectionKey),
        };
      });
  }, [economyOverview]);

  const overviewAsOf = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const displayAsOf = useMemo(() => {
    const iso = economyOverview?.as_of;
    if (typeof iso === "string" && iso.trim() !== "") {
      return formatOverviewAsOfDisplay(iso);
    }
    return overviewAsOf;
  }, [economyOverview, overviewAsOf]);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: canvasTint }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1) App brand + as-of timestamp (matches politician tab) */}
        <View style={styles.topHeader}>
          <AppBrandBar icon="bar-chart" />
          <ThemedText style={[styles.pageMeta, { color: semantic.mutedText }]}>
            UPDATED {displayAsOf}
          </ThemedText>
        </View>

        {/* 2) Hero card: sentiment ring, score copy, and three summary stats */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
            semantic.cardShadow,
          ]}
        >
          <SentimentGauge
            score={sentimentScore}
            isDark={isDark}
            mutedTextColor={semantic.mutedText}
            positiveAccentColor={gaugePositiveColor}
          />

          <ThemedText type="defaultSemiBold" style={styles.heroTitle}>
            Economic Sentiment Index
          </ThemedText>
          <ThemedText
            style={[styles.heroDescription, { color: semantic.mutedText }]}
          >
            Aggregate trend score across broad macro conditions and labor
            momentum.
          </ThemedText>

          <View style={styles.heroStatsRow}>
            <View
              style={[styles.heroStat, { borderColor: semantic.cardBorder }]}
            >
              <ThemedText
                style={[styles.heroStatLabel, { color: semantic.mutedText }]}
              >
                TREND
              </ThemedText>
              <ThemedText
                style={[styles.heroStatValue, { color: gaugePositiveColor }]}
              >
                {sentimentLabel(sentimentScore)}
              </ThemedText>
            </View>
            <View
              style={[styles.heroStat, { borderColor: semantic.cardBorder }]}
            >
              <ThemedText
                style={[styles.heroStatLabel, { color: semantic.mutedText }]}
              >
                VOLATILITY
              </ThemedText>
              <ThemedText
                style={[
                  styles.heroStatValue,
                  { color: isDark ? "#FACC15" : "#A16207" },
                ]}
              >
                {sentimentDelta.toFixed(1)}%
              </ThemedText>
            </View>
            <View
              style={[styles.heroStat, { borderColor: semantic.cardBorder }]}
            >
              <ThemedText
                style={[styles.heroStatLabel, { color: semantic.mutedText }]}
              >
                STABILITY
              </ThemedText>
              <ThemedText
                style={[
                  styles.heroStatValue,
                  { color: isDark ? "#60A5FA" : "#1D4ED8" },
                ]}
              >
                {sentimentStability.toFixed(1)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* 3) Async state notices for economy overview fetch */}
        {isEconomyOverviewLoading && (
          <StateNoticeCard
            title="Loading"
            message="Fetching sector dashboards from the server…"
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.mutedText}
          />
        )}

        {economyOverviewError !== null && (
          <StateNoticeCard
            title="Something went wrong"
            message={economyOverviewError}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
          />
        )}

        {/* 4) High-level indicator feed: tap any card to open sector detail */}
        <View style={styles.feed}>
          {feedRows.map((row) => {
            const trend = trendVisual(row.trend, isDark);
            const bars = normalizeBars(row.history);
            const selectedIdx = resolveFeedBarSelectionIndex(
              row.id,
              bars.length,
              selectedBarIndexBySector,
            );
            const mutedBar = isDark ? "#334155" : "#E5E7EB";
            const rawSelected = row.history[selectedIdx];
            const openSectorDetail = () =>
              router.push({
                pathname: AppRoutes.economyDetail,
                params: { sectorId: row.id },
              });

            return (
              <View
                key={row.id}
                style={[
                  styles.feedCard,
                  {
                    backgroundColor: semantic.cardBackground,
                    borderColor: semantic.cardBorder,
                  },
                  semantic.cardShadow,
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${row.title}, ${row.value}. Open details.`}
                  onPress={openSectorDetail}
                  style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
                >
                  <View style={styles.feedHeader}>
                    <ThemedText
                      style={[styles.feedTitle, { color: semantic.mutedText }]}
                    >
                      {row.title}
                    </ThemedText>
                    <Feather name={trend.icon} size={14} color={trend.color} />
                  </View>
                  <View
                    style={[
                      styles.feedHeaderDivider,
                      { backgroundColor: semantic.cardBorder },
                    ]}
                  />
                  <ThemedText style={styles.feedValue}>{row.value}</ThemedText>
                  <View style={styles.feedTrend}>
                    <View
                      style={[styles.statusDot, { backgroundColor: trend.color }]}
                    />
                    <ThemedText
                      style={[styles.feedTrendText, { color: trend.color }]}
                    >
                      {row.trend === "up"
                        ? "STRENGTHENING"
                        : row.trend === "down"
                          ? "WEAKENING"
                          : "STABLE"}
                    </ThemedText>
                  </View>
                </Pressable>

                <View style={styles.sparklineRow}>
                  <View style={styles.miniBarsRow}>
                    {bars.map((heightPct, index) => {
                      const selected = index === selectedIdx;
                      const iso = row.historyDates?.[index];
                      const dateHint = iso
                        ? formatObservationMonthYear(iso)
                        : `Point ${index + 1}`;
                      return (
                        <Pressable
                          key={`${row.id}-${index}`}
                          accessibilityRole="button"
                          accessibilityLabel={`${row.title}: ${dateHint}, ${formatFeedBarValue(row.history[index] ?? 0, row.valueUnit)}`}
                          accessibilityState={{ selected }}
                          hitSlop={{ top: 10, bottom: 6, left: 3, right: 3 }}
                          onPress={() =>
                            setSelectedBarIndexBySector((prev) => ({
                              ...prev,
                              [row.id]: index,
                            }))
                          }
                          style={styles.miniBarHit}
                        >
                          <View
                            style={[
                              styles.miniBar,
                              {
                                height: 22 * heightPct,
                                backgroundColor: selected
                                  ? trend.color
                                  : mutedBar,
                                opacity: selected ? 1 : 0.78,
                              },
                              selected &&
                                Platform.select({
                                  ios: {
                                    shadowColor: trend.color,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.4,
                                    shadowRadius: 3,
                                  },
                                  android: { elevation: 2 },
                                  default: {},
                                }),
                            ]}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                  {bars.length > 0 && rawSelected !== undefined ? (
                    <ThemedText
                      style={[
                        styles.barSelectionMeta,
                        { color: semantic.mutedText },
                      ]}
                      accessibilityLiveRegion="polite"
                    >
                      {row.historyDates?.[selectedIdx]
                        ? `${formatObservationMonthYear(row.historyDates[selectedIdx])} · `
                        : null}
                      {formatFeedBarValue(rawSelected, row.valueUnit)}
                    </ThemedText>
                  ) : null}
                  {bars.length === 0 &&
                  !isEconomyOverviewLoading &&
                  economyOverview !== null ? (
                    <ThemedText
                      style={[
                        styles.barChartEmptyHint,
                        { color: semantic.mutedText },
                      ]}
                    >
                      {!row.overviewSectionBound
                        ? "Overview API has no mapped series for this tile yet."
                        : "No observations returned for this series."}
                    </ThemedText>
                  ) : null}
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Explore detailed analysis for ${row.title}`}
                  onPress={openSectorDetail}
                  style={({ pressed }) => [
                    styles.cardCtaRow,
                    {
                      borderTopColor: semantic.cardBorder,
                      backgroundColor: semantic.cardSubtleBackground,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.cardCtaText, { color: theme.tint }]}
                  >
                    Explore detailed analysis
                  </ThemedText>
                  <Feather name="chevron-right" size={14} color={theme.tint} />
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 5) Narrative section: latest developments snapshot */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
            semantic.cardShadow,
          ]}
        >
          <View style={styles.infoHeader}>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              LATEST DEVELOPMENTS
            </ThemedText>
            <Feather name="bell" size={13} color={semantic.mutedText} />
          </View>
          {DEVELOPMENTS.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View
                style={[styles.bulletDot, { backgroundColor: theme.tint }]}
              />
              <ThemedText
                style={[styles.bulletText, { color: semantic.mutedText }]}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* 6) Operational section: monitoring checklist signals */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
            semantic.cardShadow,
          ]}
        >
          <View style={styles.infoHeader}>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              MONITORING ITEMS
            </ThemedText>
            <Feather name="alert-circle" size={13} color={semantic.mutedText} />
          </View>
          {MONITORING.map((item) => (
            <View key={item} style={styles.monitorRow}>
              <Feather name="activity" size={12} color={semantic.mutedText} />
              <ThemedText
                style={[styles.monitorText, { color: semantic.mutedText }]}
              >
                {item}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    ...TAB_SCREEN_CONTENT_INSETS,
    paddingBottom: 120,
    gap: Spacing.sm,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  pageMeta: {
    fontSize: 10,
    textTransform: "uppercase",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  gaugeRoot: {
    width: "68%",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  gaugeGlow: {
    shadowColor: "#4A6CF7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
  },
  gaugeScore: {
    fontFamily: Fonts.displayBold,
    fontSize: 50,
    lineHeight: 54,
    letterSpacing: -0.6,
  },
  gaugeStatusRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gaugeStatus: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  gaugeSubtleLabel: {
    marginTop: 2,
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  ringWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
  },
  heroScore: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  heroScoreLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 14,
  },
  heroDescription: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  heroStatsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  heroStat: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
  heroStatLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  heroStatValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  feed: {
    gap: 8,
  },
  feedCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingTop: 10,
    overflow: "hidden",
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  feedTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  feedHeaderDivider: {
    marginTop: 8,
    marginHorizontal: 12,
    height: StyleSheet.hairlineWidth,
  },
  feedValue: {
    marginTop: 6,
    paddingHorizontal: 12,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  feedTrend: {
    marginTop: 2,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
  },
  feedTrendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  sparklineRow: {
    marginTop: 8,
    paddingHorizontal: 12,
    alignItems: "stretch",
    marginBottom: 8,
  },
  miniBarsRow: {
    width: "100%",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  miniBarHit: {
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 28,
  },
  miniBar: {
    width: "100%",
    borderRadius: 2,
    minHeight: 6,
  },
  barSelectionMeta: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.bodyMedium,
  },
  barChartEmptyHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.bodyMedium,
  },
  cardCtaRow: {
    borderTopWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardCtaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  monitorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monitorText: {
    fontSize: 11,
  },
});
