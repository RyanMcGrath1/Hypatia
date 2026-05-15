import Feather from "@expo/vector-icons/Feather";
import type { Router } from "expo-router";
import { Platform, Pressable, View } from "react-native";

import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { ThemedText } from "@/components/theme/ThemedText";
import { AppRoutes } from "@/constants/app/routes";
import { Colors } from "@/constants/theme/Colors";

import type { FeedRow } from "@/lib/economy/economyTabFeed";
import {
  formatFeedBarValue,
  normalizeBars,
  resolveFeedBarSelectionIndex,
  trendVisual,
} from "@/lib/economy/economyTabFeed";
import type { EconomyOverviewApiResponse } from "@/lib/economy/economyOverviewTypes";
import { formatObservationMonthYear } from "@/lib/economy/sectorOverviewMerge";

type Semantic = {
  mutedText: string;
  cardBackground: string;
  cardBorder: string;
  cardShadow: object;
  cardSubtleBackground: string;
};

export type EconomySectorFeedListProps = {
  router: Router;
  feedRows: FeedRow[];
  semantic: Semantic;
  theme: (typeof Colors)[keyof typeof Colors];
  isDark: boolean;
  isEconomyOverviewLoading: boolean;
  economyOverview: EconomyOverviewApiResponse | null;
  selectedBarIndexBySector: Record<string, number>;
  onSelectBarIndex: (sectorId: string, index: number) => void;
};

export function EconomySectorFeedList({
  router,
  feedRows,
  semantic,
  theme,
  isDark,
  isEconomyOverviewLoading,
  economyOverview,
  selectedBarIndexBySector,
  onSelectBarIndex,
}: EconomySectorFeedListProps) {
  return (
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
                      onPress={() => onSelectBarIndex(row.id, index)}
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
  );
}
