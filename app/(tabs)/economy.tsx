import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import SectorSparkline from "@/components/charts/SectorSparkline";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { AppRoutes } from "@/constants/app/routes";
import { US_ECONOMIC_SECTORS, type SectorTrend } from "@/constants/data/usEconomicData";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { fetchEconomyOverview } from "@/hooks/api/flaskMainApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getSectorCardDisplay } from "@/lib/economy/sectorOverviewMerge";
import { formatOverviewAsOfDisplay, parseEconomyOverviewResponse, type EconomyOverviewApiResponse } from "@/lib/economy/economyOverviewTypes";

type FeedRow = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  trend: SectorTrend;
  history: number[];
};

const FEED_IDS = ["labor", "inflation", "consumer", "gdp"];
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
    color: isDark ? "#9CA3AF" : "#6B7280",
  };
}

function sentimentLabel(score: number) {
  if (score >= 70) return "High";
  if (score >= 45) return "Moderate";
  return "Low";
}

export default function EconomyDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);

  const [economyOverview, setEconomyOverview] = useState<EconomyOverviewApiResponse | null>(null);
  const [isEconomyOverviewLoading, setIsEconomyOverviewLoading] = useState(true);
  const [economyOverviewError, setEconomyOverviewError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setIsEconomyOverviewLoading(true);
        setEconomyOverviewError(null);
        const data = await fetchEconomyOverview(controller.signal);
        if (!cancelled) {
          setEconomyOverview(parseEconomyOverviewResponse(data));
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

  const feedRows = useMemo<FeedRow[]>(() => {
    return FEED_IDS.map((id) => US_ECONOMIC_SECTORS.find((sector) => sector.id === id))
      .filter((sector): sector is (typeof US_ECONOMIC_SECTORS)[number] => sector != null)
      .map((sector) => {
        const display = getSectorCardDisplay(sector, economyOverview);
        return {
          id: sector.id,
          title: display.title.toUpperCase(),
          subtitle: display.headlineLabel,
          value: display.headlineValue,
          trend: sector.trend,
          history: display.history,
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

  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringProgress = ringCircumference * (1 - sentimentScore / 100);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <ThemedText type="defaultSemiBold" style={styles.pageTitle}>
            ECONOSTAT US
          </ThemedText>
          <ThemedText style={[styles.pageMeta, { color: semantic.mutedText }]}>UPDATED {displayAsOf}</ThemedText>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
          ]}
        >
          <View style={styles.ringWrap}>
            <Svg width={140} height={140}>
              <Circle cx={70} cy={70} r={ringRadius} stroke={isDark ? "#334155" : "#D1D5DB"} strokeWidth={10} fill="none" />
              <Circle
                cx={70}
                cy={70}
                r={ringRadius}
                stroke={theme.tint}
                strokeWidth={10}
                fill="none"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringProgress}
                strokeLinecap="round"
                rotation="-90"
                originX={70}
                originY={70}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <ThemedText style={styles.heroScore}>{sentimentScore}</ThemedText>
              <ThemedText style={[styles.heroScoreLabel, { color: semantic.mutedText }]}>POINTS</ThemedText>
            </View>
          </View>

          <ThemedText type="defaultSemiBold" style={styles.heroTitle}>
            Economic Sentiment Index
          </ThemedText>
          <ThemedText style={[styles.heroDescription, { color: semantic.mutedText }]}>
            Aggregate trend score across broad macro conditions and labor momentum.
          </ThemedText>

          <View style={styles.heroStatsRow}>
            <View style={[styles.heroStat, { borderColor: semantic.cardBorder }]}>
              <ThemedText style={[styles.heroStatLabel, { color: semantic.mutedText }]}>TREND</ThemedText>
              <ThemedText style={styles.heroStatValue}>{sentimentLabel(sentimentScore)}</ThemedText>
            </View>
            <View style={[styles.heroStat, { borderColor: semantic.cardBorder }]}>
              <ThemedText style={[styles.heroStatLabel, { color: semantic.mutedText }]}>VOLATILITY</ThemedText>
              <ThemedText style={styles.heroStatValue}>{sentimentDelta.toFixed(1)}%</ThemedText>
            </View>
            <View style={[styles.heroStat, { borderColor: semantic.cardBorder }]}>
              <ThemedText style={[styles.heroStatLabel, { color: semantic.mutedText }]}>STABILITY</ThemedText>
              <ThemedText style={styles.heroStatValue}>{sentimentStability.toFixed(1)}</ThemedText>
            </View>
          </View>
        </View>

        {isEconomyOverviewLoading && (
          <StateNoticeCard
            title="Loading"
            message="Fetching dashboard snapshot from the server…"
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

        <View style={styles.feed}>
          {feedRows.map((row) => {
            const trend = trendVisual(row.trend, isDark);
            return (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`${row.title}, ${row.value}. Open details.`}
                style={({ pressed }) => [
                  styles.feedCard,
                  {
                    backgroundColor: semantic.cardBackground,
                    borderColor: semantic.cardBorder,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
                onPress={() =>
                  router.push({
                    pathname: AppRoutes.economyDetail,
                    params: { sectorId: row.id },
                  })
                }
              >
                <View style={styles.feedHeader}>
                  <ThemedText style={[styles.feedTitle, { color: semantic.mutedText }]}>
                    {row.title}
                  </ThemedText>
                  <Feather name="chevron-right" size={14} color={semantic.mutedText} />
                </View>
                <View style={styles.feedValueRow}>
                  <ThemedText style={styles.feedValue}>{row.value}</ThemedText>
                  <View style={styles.feedTrend}>
                    <Feather name={trend.icon} size={12} color={trend.color} />
                    <ThemedText style={[styles.feedTrendText, { color: trend.color }]}>{row.subtitle}</ThemedText>
                  </View>
                </View>
                <View style={styles.sparklineRow}>
                  <SectorSparkline values={row.history} strokeColor={theme.tint} width={96} height={28} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
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
              <View style={[styles.bulletDot, { backgroundColor: theme.tint }]} />
              <ThemedText style={[styles.bulletText, { color: semantic.mutedText }]}>{item}</ThemedText>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: semantic.cardBackground,
              borderColor: semantic.cardBorder,
            },
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
              <ThemedText style={[styles.monitorText, { color: semantic.mutedText }]}>{item}</ThemedText>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 120,
    gap: Spacing.sm,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  pageTitle: {
    fontSize: 12,
    letterSpacing: 0.5,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedTitle: {
    fontSize: 9,
    letterSpacing: 0.4,
  },
  feedValueRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  feedValue: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  feedTrend: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "54%",
    gap: 4,
  },
  feedTrendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  sparklineRow: {
    marginTop: 6,
    alignItems: "flex-end",
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
