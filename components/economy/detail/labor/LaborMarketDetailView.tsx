import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMemo, useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { laborMarketDetailStyles as styles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
  LaborPayrollJobsCreatedCard,
  type LaborPrimaryMetric,
} from "@/components/economy/detail/labor/LaborPayrollJobsCreatedCard";
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
  type AppColorScheme,
} from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useEconomyDetail } from "@/hooks/useEconomyDetail";
import { useEconomySector } from "@/hooks/useEconomySector";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { laborPrimaryFromEconomyDetail } from "@/lib/economy/laborPrimaryFromEconomyDetail";
import { sectorRowsFromApi } from "@/lib/economy/sectorRowsFromApi";

export function LaborMarketDetailView() {
  const colorScheme = (useColorScheme() ?? "light") as AppColorScheme;
  const isDark = colorScheme === "dark";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const [sectorView, setSectorView] = useState<"bars" | "line">("bars");

  const {
    data: sectorApi,
    isLoading: sectorLoading,
    error: sectorError,
    refetch: refetchSector,
  } = useEconomySector();

  const rows = useMemo(() => {
    if (!sectorApi) {
      return [];
    }
    return sectorRowsFromApi(sectorApi);
  }, [sectorApi]);
  const sectorShowError =
    !sectorLoading && sectorError != null && rows.length === 0;
  const sectorShowEmpty =
    !sectorLoading && sectorError == null && sectorApi != null && rows.length === 0;

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

  const { data: laborEconomyDetail, isLoading: laborEconomyLoading } =
    useEconomyDetail("labor");
  const laborApiPrimary = useMemo(
    () => laborPrimaryFromEconomyDetail(laborEconomyDetail),
    [laborEconomyDetail],
  );

  const primaryMetricCard: LaborPrimaryMetric = useMemo(() => {
    const fredReady = !payrollLoading && (payrollChart?.bars?.length ?? 0) > 0;
    if (laborApiPrimary) {
      return {
        show: true,
        loading: false,
        kickerLabel: laborApiPrimary.kickerLabel,
        heroValueLabel: laborApiPrimary.heroValueLabel,
        badgeLabel: laborApiPrimary.badgeLabel,
        subtitle: laborApiPrimary.subtitle,
        netThousands: null as number | null,
      };
    }
    if (laborEconomyLoading && !fredReady) {
      return {
        show: true,
        loading: true,
        kickerLabel: "LABOR MARKET",
        heroValueLabel: undefined as string | undefined,
        badgeLabel: undefined as string | undefined,
        subtitle: undefined as string | undefined,
        netThousands: null as number | null,
      };
    }
    if (fredReady) {
      const fredSubtitle =
        yearlyTotalJobsNetThousands == null
          ? yearlyTotalJobsSubtitle
            ? `${yearlyTotalJobsSubtitle} Payroll prints in the selected window are needed to compute net change.`
            : "Payroll prints in the selected window are needed to compute net change."
          : yearlyTotalJobsSubtitle;
      return {
        show: true,
        loading: false,
        kickerLabel: "YEARLY TOTAL JOBS",
        heroValueLabel: undefined as string | undefined,
        netThousands: yearlyTotalJobsNetThousands,
        badgeLabel: yearlyTotalJobsBadgeLabel,
        subtitle: fredSubtitle,
      };
    }
    return { show: false };
  }, [
    laborApiPrimary,
    laborEconomyLoading,
    payrollLoading,
    payrollChart,
    yearlyTotalJobsNetThousands,
    yearlyTotalJobsBadgeLabel,
    yearlyTotalJobsSubtitle,
  ]);

  return (
    <EconomyDetailShell
      pageTitle="LABOR MARKET"
      floatingAction={
        payrollObservationsRaw.length > 0 ? (
          <View
            style={[
              styles.payrollFabWrap,
              {
                backgroundColor: semantic.cardBackground,
                borderColor: semantic.hairline,
                ...Platform.select({
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
              },
            ]}
          >
            <FilterIconButton
              accessibilityLabel={`Chart time range, ${payrollRangeA11yLabel}. Opens options.`}
              onPress={() => setRangeFilterOpen(true)}
              iconSize={30}
              style={styles.payrollFabHit}
            />
          </View>
        ) : null
      }
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
        payrollLoading={payrollLoading}
        payrollError={payrollError}
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
              accessibilityState={{ selected: sectorView === "bars" }}
              accessibilityLabel="Bars view"
              hitSlop={6}
              onPress={() => setSectorView("bars")}
              style={({ pressed }) => [
                styles.sectorViewSeg,
                sectorView === "bars" && {
                  backgroundColor: interactive.primary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <FontAwesome
                name="bars"
                size={11}
                color={
                  sectorView === "bars" ? theme.background : semantic.mutedText
                }
              />
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: sectorView === "line" }}
              accessibilityLabel="Line chart view"
              hitSlop={6}
              onPress={() => setSectorView("line")}
              style={({ pressed }) => [
                styles.sectorViewSeg,
                sectorView === "line" && {
                  backgroundColor: interactive.primary,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <FontAwesome
                name="line-chart"
                size={11}
                color={
                  sectorView === "line" ? theme.background : semantic.mutedText
                }
              />
            </Pressable>
          </View>
        </View>
        <View
          style={[styles.tableRule, { backgroundColor: semantic.hairline }]}
        />
        {sectorView === "line" ? (
          <View style={styles.sectorLinePlaceholder}>
            <ThemedText
              style={[styles.footerNote, { color: semantic.mutedText }]}
            >
              Line chart view coming soon.
            </ThemedText>
          </View>
        ) : (
          <>
        {sectorLoading && rows.length === 0 ? (
          <ThemedText
            style={[styles.sectorStatusText, { color: semantic.mutedText }]}
          >
            Loading sector data…
          </ThemedText>
        ) : null}
        {sectorShowError ? (
          <View style={styles.sectorStatusRow}>
            <ThemedText
              style={[styles.sectorStatusText, { color: interactive.danger }]}
            >
              {sectorError ?? "Economy data unavailable."}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading sector data"
              hitSlop={6}
              onPress={refetchSector}
              style={({ pressed }) => [
                styles.sectorRetryBtn,
                { borderColor: interactive.primary },
                pressed && { opacity: 0.75 },
              ]}
            >
              <ThemedText
                style={[
                  styles.sectorRetryText,
                  { color: interactive.primary },
                ]}
              >
                RETRY
              </ThemedText>
            </Pressable>
          </View>
        ) : null}
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
              <ThemedText style={[styles.th, { color: semantic.mutedText }]}>
                SECTOR
              </ThemedText>
              <ThemedText
                style={[styles.th, styles.thNum, { color: semantic.mutedText }]}
              >
                ADDED/LOST
              </ThemedText>
              <ThemedText
                style={[styles.th, styles.thNum, { color: semantic.mutedText }]}
              >
                GROWTH %
              </ThemedText>
              <ThemedText
                style={[styles.th, styles.thDist, { color: semantic.mutedText }]}
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
                    row.deltaPositive === false && { color: interactive.danger },
                    row.deltaPositive === null && { color: semantic.mutedText },
                  ]}
                >
                  {row.delta}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.td,
                    styles.tdNum,
                    row.growthPositive === true && { color: green },
                    row.growthPositive === false && { color: interactive.danger },
                    row.growthPositive === null && { color: semantic.mutedText },
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

      <EconomyCard>
        <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>
          AVG HOURLY EARNINGS
        </ThemedText>
        <View style={styles.inlineMetricRow}>
          <ThemedText style={[styles.midMetric, { color: theme.text }]}>
            +0.4%
          </ThemedText>
          <ThemedText style={[styles.momBadge, { color: green }]}>
            MoM
          </ThemedText>
        </View>
        <View
          style={[styles.cardDivider, { backgroundColor: semantic.hairline }]}
        />
        <ThemedText style={[styles.footerNote, { color: semantic.mutedText }]}>
          Prior: +0.3% | Est: +0.3%
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>
          PARTICIPATION RATE
        </ThemedText>
        <View style={styles.inlineMetricRow}>
          <ThemedText style={[styles.midMetric, { color: theme.text }]}>
            62.5%
          </ThemedText>
          <ThemedText style={[styles.deltaNeg, { color: interactive.danger }]}>
            -0.3%
          </ThemedText>
        </View>
        <View
          style={[styles.cardDivider, { backgroundColor: semantic.hairline }]}
        />
        <ThemedText style={[styles.footerNote, { color: semantic.mutedText }]}>
          Multi-year low in labor force entry.
        </ThemedText>
      </EconomyCard>
    </EconomyDetailShell>
  );
}
