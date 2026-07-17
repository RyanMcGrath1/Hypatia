import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, useWindowDimensions, View } from "react-native";

import { laborMarketDetailStyles as styles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
    LaborPayrollJobsCreatedCard,
    type LaborPrimaryMetric,
} from "@/components/economy/detail/labor/LaborPayrollJobsCreatedCard";
import { LaborDemographicAnalysisCard } from "@/components/economy/detail/labor/LaborDemographicAnalysisCard";
import {
  LaborSectorSectionSkeleton,
  WagesInflationCardSkeleton,
} from "@/components/economy/detail/labor/LaborDetailSkeletons";
import { LaborSectorHeatmap } from "@/components/economy/detail/labor/LaborSectorHeatmap";
import { useLaborMarketPayrollSection } from "@/components/economy/detail/labor/useLaborMarketPayrollSection";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
    ECONOMY_DASHBOARD_POSITIVE_GREEN,
    EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { FilterIconButton } from "@/components/ui/FilterIconButton";
import { Colors } from "@/constants/theme/Colors";
import {
    getSemanticColors,
    Spacing,
    type AppColorScheme,
} from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyTabDashboard } from "@/hooks/useEconomyTabDashboard";
import { useEconomyLaborEarningsInflation } from "@/hooks/useEconomyLaborEarningsInflation";
import { useEconomySector } from "@/hooks/useEconomySector";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { resolveEconomyOverviewUpdatedDisplay } from "@/lib/economy/economyOverviewUpdatedDisplay";
import { laborEarningsInflationFetchWindow } from "@/lib/economy/laborEarningsInflationWindow";
import { wagesInflationCardFromApi } from "@/lib/economy/laborEarningsInflationViewModel";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";
import { sectorRowsFromApi } from "@/lib/economy/sectorRowsFromApi";

const PAYROLL_FAB_SCROLL_RANGE = 96;
const PAYROLL_FAB_MIN_SCALE = 0.72;
const PAYROLL_FAB_SIZE = 68;

export function LaborMarketDetailView() {
  const { width: windowWidth } = useWindowDimensions();
  const sectorChartWidth = useMemo(
    () => Math.max(windowWidth - Spacing.lg * 4, 280),
    [windowWidth],
  );
  const colorScheme = (useColorScheme() ?? "light") as AppColorScheme;
  const isDark = colorScheme === "dark";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const { economyOverview } = useEconomyTabDashboard();
  const updatedDisplay = useMemo(
    () => resolveEconomyOverviewUpdatedDisplay(economyOverview?.as_of),
    [economyOverview?.as_of],
  );

  const [sectorView, setSectorView] = useState<"heatmap" | "list">("heatmap");
  const scrollY = useRef(new Animated.Value(0)).current;

  const fabScale = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, PAYROLL_FAB_SCROLL_RANGE],
        outputRange: [1, PAYROLL_FAB_MIN_SCALE],
        extrapolate: "clamp",
      }),
    [scrollY],
  );

  const fabCornerNudge = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, PAYROLL_FAB_SCROLL_RANGE],
        outputRange: [0, (PAYROLL_FAB_SIZE * (1 - PAYROLL_FAB_MIN_SCALE)) / 2],
        extrapolate: "clamp",
      }),
    [scrollY],
  );

  const onPayrollFabScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const {
    payrollLoading,
    payrollError,
    payrollObservationsRaw,
    payrollFetchWindow,
    payrollSeriesLatestMonthKey,
    onPayrollRangeFilterModalClose,
    payrollRangeA11yLabel,
    payrollChart,
    selectedBarIndex,
    setSelectedBarIndex,
    rangeFilterOpen,
    setRangeFilterOpen,
    payrollHeroDisplay,
    payrollAxis,
    yearlyTotalJobsNetThousands,
    yearlyTotalJobsSubtitle,
    yearlyTotalJobsBadgeLabel,
  } = useLaborMarketPayrollSection({
    mutedText: semantic.mutedText,
    green,
    danger: interactive.danger,
  });

  const {
    data: sectorApi,
    isLoading: sectorLoading,
    error: sectorError,
  } = useEconomySector({
    observationStart: payrollFetchWindow.observationStart,
    observationEnd: payrollFetchWindow.observationEnd,
  });

  const earningsInflationFetchWindow = useMemo(
    () => laborEarningsInflationFetchWindow(payrollFetchWindow),
    [payrollFetchWindow.observationStart, payrollFetchWindow.observationEnd],
  );

  const {
    data: earningsInflationApi,
    isLoading: earningsInflationLoading,
    error: earningsInflationError,
  } = useEconomyLaborEarningsInflation(earningsInflationFetchWindow);

  const wagesInflationCard = useMemo(
    () => wagesInflationCardFromApi(earningsInflationApi, payrollFetchWindow),
    [
      earningsInflationApi,
      payrollFetchWindow.observationStart,
      payrollFetchWindow.observationEnd,
    ],
  );

  const payrollHasChart = (payrollChart?.bars?.length ?? 0) > 0;
  const payrollPending = isEconomyDataPending({
    isLoading: payrollLoading,
    error: payrollError,
    hasData: payrollHasChart,
  });

  const sectorPending = isEconomyDataPending({
    isLoading: sectorLoading,
    error: sectorError,
    hasData: sectorApi != null,
  });

  const wagesInflationPending = isEconomyDataPending({
    isLoading: earningsInflationLoading,
    error: earningsInflationError,
    hasData: earningsInflationApi != null,
  });

  const rows = useMemo(() => {
    if (!sectorApi) {
      return [];
    }
    return sectorRowsFromApi(sectorApi);
  }, [sectorApi]);
  const sectorShowEmpty =
    !sectorPending && sectorApi != null && rows.length === 0;

  const primaryMetricCard: LaborPrimaryMetric = useMemo(() => {
    if (payrollPending) {
      return {
        show: true,
        loading: true,
        kickerLabel: "TOTAL JOBS",
        netThousands: null,
      };
    }
    if (!payrollHasChart) {
      return { show: false };
    }
    return {
      show: true,
      loading: false,
      kickerLabel: "TOTAL JOBS",
      netThousands: yearlyTotalJobsNetThousands,
      badgeLabel: yearlyTotalJobsBadgeLabel,
      subtitle: yearlyTotalJobsSubtitle,
    };
  }, [
    payrollPending,
    payrollHasChart,
    yearlyTotalJobsNetThousands,
    yearlyTotalJobsBadgeLabel,
    yearlyTotalJobsSubtitle,
  ]);

  const payrollFabShadow = useMemo(
    () =>
      Platform.select({
        ios: {
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
        },
        default: {
          elevation: 8,
        },
      }),
    [],
  );

  const floatingAction = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return null;
    }
    return (
      <Animated.View
        style={[
          styles.payrollFabWrap,
          {
            backgroundColor: semantic.cardBackground,
            borderColor: semantic.hairline,
            transform: [
              { translateX: fabCornerNudge },
              { translateY: fabCornerNudge },
              { scale: fabScale },
            ],
            ...payrollFabShadow,
          },
        ]}
      >
        <FilterIconButton
          accessibilityLabel={`Chart time range, ${payrollRangeA11yLabel}. Opens options.`}
          onPress={() => setRangeFilterOpen(true)}
          iconSize={30}
          style={styles.payrollFabHit}
        />
      </Animated.View>
    );
  }, [
    payrollObservationsRaw.length,
    semantic.cardBackground,
    semantic.hairline,
    fabScale,
    fabCornerNudge,
    payrollFabShadow,
    payrollRangeA11yLabel,
    setRangeFilterOpen,
  ]);

  return (
    <EconomyDetailShell
      pageTitle="LABOR MARKET"
      showLiveFeed={false}
      headerLayout="sectorInline"
      inlineHeaderIcon="users"
      updatedDisplay={updatedDisplay}
      onScroll={onPayrollFabScroll}
      floatingAction={floatingAction}
    >
      <LaborPayrollJobsCreatedCard
        semantic={semantic}
        colorScheme={colorScheme}
        isDark={isDark}
        interactive={{
          danger: interactive.danger,
          primary: interactive.primary,
          dangerSoft: interactive.dangerSoft,
        }}
        payrollLoading={payrollPending}
        payrollError={null}
        payrollObservationsRaw={payrollObservationsRaw}
        payrollCommittedObservationStart={payrollFetchWindow.observationStart}
        payrollCommittedObservationEnd={payrollFetchWindow.observationEnd}
        payrollSeriesLatestMonthKey={payrollSeriesLatestMonthKey}
        payrollHeroDisplay={payrollHeroDisplay}
        payrollAxis={payrollAxis}
        payrollChart={payrollChart}
        selectedBarIndex={selectedBarIndex}
        onSelectBarIndex={setSelectedBarIndex}
        rangeFilterOpen={rangeFilterOpen}
        onRequestCloseRangeFilter={onPayrollRangeFilterModalClose}
        primaryMetricCard={primaryMetricCard}
      />

      <EconomyCard>
        <View style={styles.tableHeaderRow}>
          <ThemedText style={[styles.tableTitle, { color: theme.text }]}>
            EMPLOYMENT BY SECTOR (EST. CHANGE)
          </ThemedText>
          <View
            accessibilityRole="tablist"
            style={[
              styles.sectorViewToggle,
              {
                backgroundColor: semantic.cardSubtleBackground,
                borderColor: semantic.hairline,
              },
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sectorView === "heatmap" }}
              accessibilityLabel="Heatmap view"
              hitSlop={6}
              onPress={() => setSectorView("heatmap")}
              style={({ pressed }) => [
                styles.sectorViewSeg,
                sectorView === "heatmap" && {
                  backgroundColor: interactive.primary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <FontAwesome
                name="th"
                size={11}
                color={
                  sectorView === "heatmap" ? theme.background : semantic.mutedText
                }
              />
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sectorView === "list" }}
              accessibilityLabel="List view"
              hitSlop={6}
              onPress={() => setSectorView("list")}
              style={({ pressed }) => [
                styles.sectorViewSeg,
                sectorView === "list" && {
                  backgroundColor: interactive.primary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <FontAwesome
                name="bars"
                size={11}
                color={
                  sectorView === "list" ? theme.background : semantic.mutedText
                }
              />
            </Pressable>
          </View>
        </View>
        <View
          style={[styles.tableRule, { backgroundColor: semantic.hairline }]}
        />
        {sectorPending ? (
          <LaborSectorSectionSkeleton
            mode={sectorView === "heatmap" ? "heatmap" : "list"}
            width={sectorChartWidth}
          />
        ) : null}
        {sectorView === "heatmap" ? (
          sectorApi != null ? (
            <LaborSectorHeatmap data={sectorApi} width={sectorChartWidth} />
          ) : null
        ) : (
          <>
            {sectorShowEmpty ? (
              <ThemedText
                style={[styles.sectorStatusText, { color: semantic.mutedText }]}
              >
                No sector data in this window.
              </ThemedText>
            ) : null}
            {rows.length > 0 ? (
              <>
                <View style={styles.tableHead}>
                  <ThemedText
                    style={[styles.th, { color: semantic.mutedText }]}
                  >
                    SECTOR
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.th,
                      styles.thNum,
                      { color: semantic.mutedText },
                    ]}
                  >
                    ADDED/LOST
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.th,
                      styles.thNum,
                      { color: semantic.mutedText },
                    ]}
                  >
                    GROWTH %
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.th,
                      styles.thDist,
                      { color: semantic.mutedText },
                    ]}
                    numberOfLines={1}
                  >
                    DISTRIBUTION
                  </ThemedText>
                </View>
                {rows.map((row, index) => (
                  <View
                    key={`${row.sector}-${index}`}
                    style={[styles.tr, { borderTopColor: semantic.hairline }]}
                  >
                    <ThemedText
                      style={[styles.td, { color: theme.text }]}
                      numberOfLines={2}
                    >
                      {row.sector}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.td,
                        styles.tdNum,
                        row.deltaPositive === true && { color: green },
                        row.deltaPositive === false && {
                          color: interactive.danger,
                        },
                        row.deltaPositive === null && {
                          color: semantic.mutedText,
                        },
                      ]}
                    >
                      {row.delta}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.td,
                        styles.tdNum,
                        row.growthPositive === true && { color: green },
                        row.growthPositive === false && {
                          color: interactive.danger,
                        },
                        row.growthPositive === null && {
                          color: semantic.mutedText,
                        },
                      ]}
                    >
                      {row.growth}
                    </ThemedText>
                    <View style={styles.distCell}>
                      <View
                        style={[
                          styles.distTrack,
                          { backgroundColor: semantic.cardSubtleBackground },
                        ]}
                      >
                        <View
                          style={[
                            styles.distFill,
                            {
                              width: `${Math.round(row.barFill * 100)}%`,
                              backgroundColor: row.barNegative
                                ? interactive.danger
                                : green,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </EconomyCard>

      <EconomyCard style={styles.metricTileCard}>
        {wagesInflationPending ? (
          <WagesInflationCardSkeleton />
        ) : (
          <>
            <View style={styles.cardTopRow}>
              <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>
                WAGES VS. INFLATION
              </ThemedText>
              <ThemedText style={[styles.periodLabel, { color: theme.text }]}>
                {wagesInflationCard.periodLabel}
              </ThemedText>
            </View>
            <View style={styles.splitMetricRow}>
              <View style={styles.splitMetricSection}>
                <ThemedText
                  style={[styles.splitMetricKicker, { color: semantic.mutedText }]}
                >
                  WAGES
                </ThemedText>
                <View style={styles.inlineMetricRow}>
                  <ThemedText
                    style={[styles.splitMidMetric, { color: theme.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {wagesInflationCard.wages.valueLabel}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.momBadge,
                      {
                        color: wagesInflationCard.wages.unavailable
                          ? semantic.mutedText
                          : wagesInflationCard.wages.deltaPositive === true
                            ? green
                            : wagesInflationCard.wages.deltaPositive === false
                              ? interactive.danger
                              : semantic.mutedText,
                      },
                    ]}
                  >
                    Period
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.splitMetricDivider,
                  { backgroundColor: semantic.hairline },
                ]}
              />
              <View style={styles.splitMetricSection}>
                <ThemedText
                  style={[styles.splitMetricKicker, { color: semantic.mutedText }]}
                >
                  INFLATION
                </ThemedText>
                <View style={styles.inlineMetricRow}>
                  <ThemedText
                    style={[styles.splitMidMetric, { color: theme.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {wagesInflationCard.inflation.valueLabel}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.momBadge,
                      {
                        color: wagesInflationCard.inflation.unavailable
                          ? semantic.mutedText
                          : wagesInflationCard.inflation.deltaPositive === true
                            ? interactive.danger
                            : wagesInflationCard.inflation.deltaPositive === false
                              ? green
                              : semantic.mutedText,
                      },
                    ]}
                  >
                    Period
                  </ThemedText>
                </View>
              </View>
            </View>
            <View
              style={[styles.cardDivider, { backgroundColor: semantic.hairline }]}
            />
            <ThemedText style={[styles.footerNote, { color: semantic.mutedText }]}>
              {wagesInflationCard.footerNote}
            </ThemedText>
          </>
        )}
      </EconomyCard>

      <LaborDemographicAnalysisCard
        colorScheme={colorScheme}
        semantic={semantic}
        interactive={{
          primary: interactive.primary,
          danger: interactive.danger,
        }}
        payrollFetchWindow={payrollFetchWindow}
      />
    </EconomyDetailShell>
  );
}
