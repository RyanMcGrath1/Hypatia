import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import EconomicPulseChart from "@/components/charts/EconomicPulseChart";
import SectorSparkline from "@/components/charts/SectorSparkline";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { SectionCard } from "@/components/surfaces/SectionCard";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { AppRoutes } from "@/constants/app/routes";
import {
  ECONOMY_DATA_SOURCE,
  ECONOMY_KPIS,
  ECONOMY_LAST_REFRESH,
  US_ECONOMIC_SECTORS,
  type EconomicSector,
  type SectorTrend,
} from "@/constants/data/usEconomicData";
import { Brand, Colors } from "@/constants/theme/Colors";
import {
  Radius,
  Spacing,
  getSemanticColors,
} from "@/constants/theme/ThemeTokens";
import { fetchEconomyOverview } from "@/hooks/api/flaskMainApi";
import { getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getSectorCardDisplay } from "@/lib/economy/sectorOverviewMerge";
import {
  formatOverviewAsOfDisplay,
  parseEconomyOverviewResponse,
  type EconomyOverviewApiResponse,
} from "@/lib/economy/economyOverviewTypes";

type TimeWindow = "1M" | "3M" | "6M" | "1Y";
type SectorSort = "trend" | "recency" | "name";

const TIME_WINDOWS: TimeWindow[] = ["1M", "3M", "6M", "1Y"];
const SORT_OPTIONS: { id: SectorSort; label: string }[] = [
  { id: "trend", label: "Trend" },
  { id: "recency", label: "Recent" },
  { id: "name", label: "A-Z" },
];

function getTrendRank(trend: SectorTrend) {
  if (trend === "up") {
    return 0;
  }
  if (trend === "flat") {
    return 1;
  }
  return 2;
}

/**
 * Percent change from the second-to-last → last history point (same basis as the arrow).
 * Uses relative change: ((last − prev) / prev) × 100.
 */
function formatLastStepPercentChange(values: number[]): string {
  if (values.length < 2) {
    return "—";
  }
  const prev = values[values.length - 2]!;
  const last = values[values.length - 1]!;
  if (prev === 0) {
    return last === 0 ? "0%" : "—";
  }
  const pct = ((last - prev) / prev) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return "0%";
  }
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

/** Change from second-to-last → last point in the tile history series (mock months). */
function getLastHistoryStepDirection(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) {
    return "flat";
  }
  const prev = values[values.length - 2]!;
  const last = values[values.length - 1]!;
  if (last > prev) {
    return "up";
  }
  if (last < prev) {
    return "down";
  }
  return "flat";
}

/** Feather icons + colors for last history step (matches compact tile reference pattern). */
function getFeatherTrendVisual(
  direction: "up" | "down" | "flat",
  isDark: boolean,
) {
  if (direction === "up") {
    return {
      name: "arrow-up-right" as const,
      color: isDark ? "#4ADE80" : "#16A34A",
    };
  }
  if (direction === "down") {
    return {
      name: "arrow-down-right" as const,
      color: Brand.coral,
    };
  }
  return {
    name: "arrow-right" as const,
    color: Brand.steel,
  };
}

function getRecencyRank(updatedAt: string) {
  const normalized = updatedAt.trim().toLowerCase();
  if (normalized.includes("apr")) {
    return 0;
  }
  if (normalized.includes("mar")) {
    return 1;
  }
  if (normalized.includes("q1")) {
    return 2;
  }
  return 3;
}

export default function EconomyDashboardScreen() {
  // Router + view state
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [economyOverview, setEconomyOverview] =
    useState<EconomyOverviewApiResponse | null>(null);
  const [isEconomyOverviewLoading, setIsEconomyOverviewLoading] =
    useState(true);
  const [economyOverviewError, setEconomyOverviewError] = useState<
    string | null
  >(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("6M");
  const [sortBy, setSortBy] = useState<SectorSort>("trend");

  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  /** Single column on very narrow viewports; two-up ~47% style columns otherwise (reference layout). */
  const narrowBreakpoint = 400;
  const gridGap = 16;
  const cardWidth = useMemo(() => {
    const horizontalPadding = Spacing.lg * 2;
    const available = width - horizontalPadding;
    if (width < narrowBreakpoint) {
      return available;
    }
    return (available - gridGap) / 2;
  }, [width]);

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

  const sortedSectors = useMemo(() => {
    const copy = [...US_ECONOMIC_SECTORS];
    if (sortBy === "name") {
      return copy.sort((left, right) => left.title.localeCompare(right.title));
    }
    if (sortBy === "recency") {
      return copy.sort(
        (left, right) =>
          getRecencyRank(left.updatedAt) - getRecencyRank(right.updatedAt),
      );
    }
    return copy.sort(
      (left, right) => getTrendRank(left.trend) - getTrendRank(right.trend),
    );
  }, [sortBy]);

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

  const openSectorDetails = (sectorId: string) => {
    router.push({
      pathname: AppRoutes.economyDetail,
      params: { sectorId },
    });
  };

  /**
   * Sector tile: base route + sort keys come from mock `US_ECONOMIC_SECTORS`;
   * numbers, labels, sparkline, and “Updated …” overlay from `economyOverview` when present
   * (`SECTOR_ID_TO_OVERVIEW_KEY` in `sectorOverviewMerge.ts`).
   */
  const renderSectorCard = (sector: EconomicSector) => {
    const display = getSectorCardDisplay(sector, economyOverview);
    const stepDir = getLastHistoryStepDirection(display.history);
    const feather = getFeatherTrendVisual(stepDir, isDark);
    const stepPercentLabel = formatLastStepPercentChange(display.history);

    return (
      <View
        key={sector.id}
        style={[
          styles.card,
          {
            width: cardWidth,
            backgroundColor: semantic.cardBackground,
            borderColor: semantic.cardBorder,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${display.title}, ${display.headlineValue}, ${stepPercentLabel} vs prior reading. Open details.`}
          hitSlop={8}
          style={({ pressed }) => [
            styles.cardInner,
            { opacity: pressed ? 0.92 : 1 },
          ]}
          onPress={() => openSectorDetails(sector.id)}
        >
          {/* Header: sector name + mini sparkline */}
          <View style={styles.cardHeader}>
            <ThemedText
              numberOfLines={2}
              style={[styles.indicatorName, { color: semantic.mutedText }]}
            >
              {display.title}
            </ThemedText>
            <SectorSparkline
              values={display.history}
              strokeColor={theme.tint}
              width={60}
              height={24}
            />
          </View>

          {/* Body: primary figure vs step change */}
          <View style={styles.cardBody}>
            <View style={styles.valueColumn}>
              <ThemedText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.indicatorValue, { color: theme.text }]}
              >
                {display.headlineValue}
              </ThemedText>
            </View>
            <View style={styles.trendContainer}>
              <Feather
                name={feather.name}
                size={16}
                color={feather.color}
                accessible={false}
              />
              <ThemedText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.changeText, { color: feather.color }]}
              >
                {stepPercentLabel}
              </ThemedText>
            </View>
          </View>

          {/* Metric description line */}
          <ThemedText
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.metricCaption, { color: semantic.mutedText }]}
          >
            {display.headlineLabel}
          </ThemedText>
          {/* Last updated: API observation date when overview loaded */}
          <ThemedText
            style={[styles.periodText, { color: semantic.mutedText }]}
          >
            Updated {display.updatedAt}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      {/*
        Screen anatomy (top → bottom, all inside ScrollView):
        1. ScreenHeader     — title + “As of …” (from API `as_of` when loaded)
        2. EconomicPulseChart — gauge + sparkline + “Drivers” (still mock data)
        3. Meta SectionCard — data window, static source, last refresh, __DEV__ API preview
        4. controlsWrap     — time-window chips, then sort chips (mock grid only)
        5. kpiRow           — three KPI cards from ECONOMY_KPIS (mock)
        6. StateNoticeCard  — optional loading / error from GET /api/economy/overview
        7. gridWrap         — sector tiles (mock list); see renderSectorCard
      */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1) Title + as-of line */}
        <ScreenHeader
          title="US Economic Dashboard"
          meta={`As of ${displayAsOf}`}
          subtitleColor={semantic.mutedText}
          metaColor={semantic.mutedText}
        />
        {/* 2) National pulse (chart component owns its own internal layout) */}
        <EconomicPulseChart />
        {/* 3) Provenance / dev: window, source, refresh; optional raw JSON preview */}
        <SectionCard
          backgroundColor={semantic.cardSubtleBackground}
          borderColor={semantic.cardBorder}
          style={styles.metaCard}
        >
          <ThemedText style={[styles.metaText, { color: semantic.mutedText }]}>
            Window: {timeWindow} | Source: {ECONOMY_DATA_SOURCE}
          </ThemedText>
          <ThemedText style={[styles.metaText, { color: semantic.mutedText }]}>
            Last refresh:{" "}
            {isEconomyOverviewLoading ? "…" : ECONOMY_LAST_REFRESH}
          </ThemedText>
          {__DEV__ && economyOverview !== null && (
            <ThemedText
              style={[styles.metaText, { color: semantic.mutedText }]}
              numberOfLines={3}
            >
              API payload received (dev):{" "}
              {JSON.stringify(economyOverview).slice(0, 120)}
              …
            </ThemedText>
          )}
        </SectionCard>
        {/* 4) Controls: (a) 1M/3M/6M/1Y (b) sort — affect mock sector list only today */}
        <View style={styles.controlsWrap}>
          <View style={styles.controlsRow}>
            {TIME_WINDOWS.map((option) => {
              const isSelected = option === timeWindow;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Set time window ${option}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.controlChip,
                    {
                      borderColor: isSelected
                        ? theme.tint
                        : semantic.cardBorder,
                      backgroundColor: isSelected
                        ? semantic.cardSubtleBackground
                        : semantic.cardBackground,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                  onPress={() => setTimeWindow(option)}
                >
                  <ThemedText
                    style={{
                      color: isSelected ? theme.tint : semantic.mutedText,
                      fontSize: 12,
                    }}
                  >
                    {option}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.controlsRow}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = option.id === sortBy;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort sectors by ${option.label}`}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.controlChip,
                    {
                      borderColor: isSelected
                        ? theme.tint
                        : semantic.cardBorder,
                      backgroundColor: isSelected
                        ? semantic.cardSubtleBackground
                        : semantic.cardBackground,
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                  onPress={() => setSortBy(option.id)}
                >
                  <ThemedText
                    style={{
                      color: isSelected ? theme.tint : semantic.mutedText,
                      fontSize: 12,
                    }}
                  >
                    Sort: {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
        {/* 5) Static KPI strip (inflation / jobs / rates copy) */}
        <View style={styles.kpiRow}>
          {ECONOMY_KPIS.map((kpi) => (
            <SectionCard
              key={kpi.id}
              backgroundColor={semantic.cardSubtleBackground}
              borderColor={semantic.cardBorder}
              style={styles.kpiCard}
            >
              <ThemedText
                style={[styles.kpiLabel, { color: semantic.mutedText }]}
              >
                {kpi.label}
              </ThemedText>
              <ThemedText type="defaultSemiBold">{kpi.value}</ThemedText>
              <ThemedText
                style={[styles.kpiContext, { color: semantic.mutedText }]}
              >
                {kpi.context}
              </ThemedText>
            </SectionCard>
          ))}
        </View>

        {/* 6) Overview fetch status — does not hide tiles below */}
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

        {/* 7) Sector grid: responsive 1- or 2-column wrap; each tile = renderSectorCard */}
        <View style={styles.gridWrap}>
          {sortedSectors.map((sector) => renderSectorCard(sector))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// Layout styles: `screen` / `scrollContent` = shell; `gridWrap`+`card*` = sector tiles; `kpi*` = KPI row; `control*` = chips.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },
  kpiRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  metaCard: {
    marginBottom: Spacing.sm,
    gap: 3,
  },
  metaText: {
    fontSize: 12,
  },
  controlsWrap: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  controlsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  controlChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  kpiLabel: {
    fontSize: 12,
  },
  kpiContext: {
    fontSize: 12,
  },
  gridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardInner: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  indicatorName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    paddingRight: 8,
    lineHeight: 16,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: 8,
  },
  valueColumn: {
    flex: 1,
    minWidth: 0,
  },
  indicatorValue: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    maxWidth: "46%",
    gap: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  metricCaption: {
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
    marginBottom: 2,
  },
  periodText: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
});
