import { useMemo } from "react";
import {
  Platform,
  Pressable,
  View,
} from "react-native";

import { LABOR_EMPLOYMENT_BY_SECTOR } from "@/components/economy/detail/labor/laborDetailData";
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
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { laborPrimaryFromEconomyDetail } from "@/lib/economy/laborPrimaryFromEconomyDetail";

export function LaborMarketDetailView() {
  const colorScheme = (useColorScheme() ?? "light") as AppColorScheme;
  const isDark = colorScheme === "dark";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const rows = useMemo(() => LABOR_EMPLOYMENT_BY_SECTOR, []);

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

      <EconomyCard>
        <View style={styles.tableHeaderRow}>
          <ThemedText style={[styles.tableTitle, { color: theme.text }]}>
            EMPLOYMENT BY SECTOR (EST. CHANGE)
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export CSV"
            style={({ pressed }) => [
              styles.exportBtn,
              { borderColor: interactive.primary, opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <ThemedText
              style={[styles.exportBtnText, { color: interactive.primary }]}
            >
              EXPORT CSV
            </ThemedText>
          </Pressable>
        </View>
        <View
          style={[styles.tableRule, { backgroundColor: semantic.hairline }]}
        />
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
        {rows.map((row) => (
          <View
            key={row.sector}
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
      </EconomyCard>
    </EconomyDetailShell>
  );
}
