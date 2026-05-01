import Feather from "@expo/vector-icons/Feather";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { useColorScheme } from "@/hooks/useColorScheme";

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
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);
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

  const openSectorDetails = (sectorId: string) => {
    router.push({
      pathname: AppRoutes.economyDetail,
      params: { sectorId },
    });
  };

  // Per-sector tile renderer — compact “indicator card” layout (title + sparkline, value + trend, period)
  const renderSectorCard = (sector: EconomicSector) => {
    const stepDir = getLastHistoryStepDirection(sector.history);
    const feather = getFeatherTrendVisual(stepDir, isDark);
    const stepPercentLabel = formatLastStepPercentChange(sector.history);

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
          accessibilityLabel={`${sector.title}, ${sector.headlineValue}, ${stepPercentLabel} vs prior reading. Open details.`}
          hitSlop={8}
          style={({ pressed }) => [
            styles.cardInner,
            { opacity: pressed ? 0.92 : 1 },
          ]}
          onPress={() => openSectorDetails(sector.id)}
        >
          <View style={styles.cardHeader}>
            <ThemedText
              numberOfLines={2}
              style={[styles.indicatorName, { color: semantic.mutedText }]}
            >
              {sector.title}
            </ThemedText>
            <SectorSparkline
              values={sector.history}
              strokeColor={theme.tint}
              width={60}
              height={24}
            />
          </View>

          <View style={styles.cardBody}>
            <View style={styles.valueColumn}>
              <ThemedText
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.indicatorValue, { color: theme.text }]}
              >
                {sector.headlineValue}
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

          <ThemedText
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.metricCaption, { color: semantic.mutedText }]}
          >
            {sector.headlineLabel}
          </ThemedText>
          <ThemedText
            style={[styles.periodText, { color: semantic.mutedText }]}
          >
            Updated {sector.updatedAt}
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="US Economic Dashboard"
          meta={`As of ${overviewAsOf}`}
          subtitleColor={semantic.mutedText}
          metaColor={semantic.mutedText}
        />
        <EconomicPulseChart />
        <SectionCard
          backgroundColor={semantic.cardSubtleBackground}
          borderColor={semantic.cardBorder}
          style={styles.metaCard}
        >
          <ThemedText style={[styles.metaText, { color: semantic.mutedText }]}>
            Window: {timeWindow} | Source: {ECONOMY_DATA_SOURCE}
          </ThemedText>
          <ThemedText style={[styles.metaText, { color: semantic.mutedText }]}>
            Last refresh: {ECONOMY_LAST_REFRESH}
          </ThemedText>
        </SectionCard>
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

        {/* Loading + error states */}
        {isLoading && (
          <StateNoticeCard
            title="Loading"
            message="Loading economic indicators..."
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.mutedText}
          />
        )}

        {error !== null && (
          <StateNoticeCard
            title="Something went wrong"
            message={error}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
          />
        )}

        {/* Sector overview grid */}
        {!isLoading && error === null && (
          <View style={styles.gridWrap}>
            {sortedSectors.map((sector) => renderSectorCard(sector))}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

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
