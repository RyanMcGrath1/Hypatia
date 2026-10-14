import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

import { laborMarketDetailStyles as styles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
  PAYROLL_BREAK_EVEN_THOUSANDS,
  PAYROLL_TREND_WINDOW_MONTHS,
  payrollJobsSpoken,
  payrollMonthYearLabel,
  payrollMovingAverage,
  type PayrollAxisModel,
  type PayrollHeroDisplay,
} from "@/components/economy/detail/labor/laborMarketPayrollChart";
import {
  PayrollRangeFilterModal,
  type PayrollRangeCommitPayload,
  type PayrollRangeFilterCloseReason,
} from "@/components/economy/detail/labor/PayrollRangeFilterModal";
import type { PayrollChartFromFred } from "@/components/economy/detail/labor/payrollChartFromFred";
import { PayrollTrendBarChart } from "@/components/economy/detail/labor/PayrollTrendBarChart";
import {
  LaborPayrollChartSkeleton,
  LaborPayrollHeroSkeleton,
} from "@/components/economy/detail/labor/LaborDetailSkeletons";
import { YearlyTotalJobsPrimaryCard } from "@/components/economy/detail/labor/YearlyTotalJobsPrimaryCard";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors, type ThemeInteractive } from "@/constants/theme/Colors";
import type { AppColorScheme } from "@/constants/theme/ThemeTokens";
import type { FredObservationRow } from "@/hooks/api/fredObservations";

export type LaborPrimaryMetricClosed = { show: false };
export type LaborPrimaryMetricOpen = {
  show: true;
  loading: boolean;
  kickerLabel?: string;
  heroValueLabel?: string;
  netThousands: number | null;
  badgeLabel?: string;
  subtitle?: string;
};
export type LaborPrimaryMetric = LaborPrimaryMetricClosed | LaborPrimaryMetricOpen;

export type LaborPayrollJobsCreatedCardProps = {
  semantic: { mutedText: string; hairline: string; cardBackground: string };
  colorScheme: AppColorScheme;
  interactive: Pick<ThemeInteractive, "danger" | "warning" | "primary">;
  /** Fill for months with job gains; matches the headline trend color. */
  positiveColor: string;
  payrollLoading: boolean;
  payrollError: string | null;
  payrollObservationsRaw: FredObservationRow[];
  payrollCommittedObservationStart: string;
  payrollCommittedObservationEnd: string;
  payrollSeriesLatestMonthKey: string;
  payrollHeroDisplay: PayrollHeroDisplay;
  payrollAxis: PayrollAxisModel;
  payrollChart: PayrollChartFromFred | null;
  selectedBarIndex: number | null;
  /** `null` returns the headline to the latest month. */
  onSelectBarIndex: (index: number | null) => void;
  rangeFilterOpen: boolean;
  onRequestCloseRangeFilter: (
    reason: PayrollRangeFilterCloseReason,
    commit?: PayrollRangeCommitPayload,
  ) => void;
  primaryMetricCard: LaborPrimaryMetric;
};

export function LaborPayrollJobsCreatedCard({
  semantic,
  colorScheme,
  interactive,
  positiveColor,
  payrollLoading,
  payrollError,
  payrollObservationsRaw,
  payrollCommittedObservationStart,
  payrollCommittedObservationEnd,
  payrollSeriesLatestMonthKey,
  payrollHeroDisplay,
  payrollAxis,
  payrollChart,
  selectedBarIndex,
  onSelectBarIndex,
  rangeFilterOpen,
  onRequestCloseRangeFilter,
  primaryMetricCard,
}: LaborPayrollJobsCreatedCardProps) {
  const theme = Colors[colorScheme];
  const hasSelection = selectedBarIndex != null;
  const chartSummary = buildPayrollChartSummary(payrollChart);

  return (
    <EconomyCard style={styles.payrollCard}>
      {payrollLoading ? (
        <LaborPayrollHeroSkeleton />
      ) : (
        <>
          <View style={styles.cardTopRow}>
            <ThemedText
              accessibilityRole="header"
              accessibilityLabel={`Jobs added or lost. ${chartSummary}`}
              style={[styles.tableTitle, { color: theme.text }]}
            >
              JOBS ADDED OR LOST
            </ThemedText>
          </View>
          <View style={styles.heroMetricRow}>
            <View style={styles.heroMetricWithTrend}>
              <ThemedText
                style={[styles.heroMetric, { color: theme.text }]}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
              >
                {payrollHeroDisplay.heroMetric}
              </ThemedText>
              <Feather
                name={payrollHeroDisplay.trend.icon}
                size={26}
                color={payrollHeroDisplay.trend.color}
                style={styles.heroTrendIcon}
              />
            </View>
          </View>
          <View style={styles.consensusRow}>
            <ThemedText
              style={[
                styles.consensusText,
                { color: payrollHeroDisplay.trend.color },
              ]}
            >
              {payrollHeroDisplay.contextLabel}
            </ThemedText>
          </View>
          {payrollHeroDisplay.breakEvenLabel || payrollHeroDisplay.averageLabel ? (
            <ThemedText style={[styles.heroSubline, { color: semantic.mutedText }]}>
              {[payrollHeroDisplay.breakEvenLabel, payrollHeroDisplay.averageLabel]
                .filter(Boolean)
                .join(" · ")}
            </ThemedText>
          ) : null}
        </>
      )}
      <View style={styles.chartArea}>
        {payrollLoading ? (
          <LaborPayrollChartSkeleton />
        ) : payrollChart?.bars?.length ? (
          <>
          <PayrollTrendBarChart
            chart={payrollChart}
            axis={payrollAxis}
            selectedIndex={selectedBarIndex}
            onSelectIndex={onSelectBarIndex}
            colors={{
              aboveBreakEven: positiveColor,
              belowBreakEven: interactive.warning,
              loss: interactive.danger,
              accent: interactive.primary,
              text: theme.text,
              mutedText: semantic.mutedText,
              hairline: semantic.hairline,
              surface: semantic.cardBackground,
            }}
          />
          <ThemedText style={[styles.chartHint, { color: semantic.mutedText }]}>
            {hasSelection
              ? "Tap the same month again to return to the latest."
              : "Tap or drag across the chart to see a month."}
          </ThemedText>
          </>
        ) : (
          <ThemedText
            style={[styles.payrollEmpty, { color: semantic.mutedText }]}
          >
            {payrollObservationsRaw.length === 0
              ? "No payroll observations available."
              : "No payroll data in this time range."}
          </ThemedText>
        )}
        {primaryMetricCard.show === true ? (
          <YearlyTotalJobsPrimaryCard
            loading={primaryMetricCard.loading}
            kickerLabel={primaryMetricCard.kickerLabel}
            heroValueLabel={primaryMetricCard.heroValueLabel}
            netThousands={primaryMetricCard.netThousands ?? null}
            badgeLabel={primaryMetricCard.badgeLabel}
            subtitle={primaryMetricCard.subtitle}
          />
        ) : null}
      </View>
      <PayrollRangeFilterModal
        visible={rangeFilterOpen}
        onClose={onRequestCloseRangeFilter}
        committedObservationStart={payrollCommittedObservationStart}
        committedObservationEnd={payrollCommittedObservationEnd}
        seriesLastMonthKey={payrollSeriesLatestMonthKey}
      />
    </EconomyCard>
  );
}

function buildPayrollChartSummary(chart: PayrollChartFromFred | null): string {
  const bars = chart?.bars ?? [];
  const withData = bars.filter((b) => b.momVsPriorThousands != null);
  if (withData.length === 0) {
    return "No data in this range.";
  }
  const first = payrollMonthYearLabel(withData[0]!.observationDate);
  const last = payrollMonthYearLabel(withData[withData.length - 1]!.observationDate);
  const above = withData.filter(
    (b) => b.momVsPriorThousands! >= PAYROLL_BREAK_EVEN_THOUSANDS,
  ).length;
  const losses = withData.filter((b) => b.momVsPriorThousands! < 0).length;
  const averages = payrollMovingAverage(bars).filter((v): v is number => v != null);
  const trend =
    averages.length >= 2
      ? ` The ${PAYROLL_TREND_WINDOW_MONTHS}-month average moved from ${averages[0]! < 0 ? "minus " : ""}${payrollJobsSpoken(averages[0]!)} to ${averages[averages.length - 1]! < 0 ? "minus " : ""}${payrollJobsSpoken(averages[averages.length - 1]!)}.`
      : "";
  return `Bar chart of monthly change in jobs, ${first} to ${last}, with a break-even line at ${payrollJobsSpoken(PAYROLL_BREAK_EVEN_THOUSANDS)}. ${above} of ${withData.length} months were at or above break-even and ${losses} lost jobs.${trend}`;
}
