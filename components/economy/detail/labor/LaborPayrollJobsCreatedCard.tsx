import Feather from "@expo/vector-icons/Feather";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";

import { laborMarketDetailStyles as styles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
  PAYROLL_BARS_ROW_PAD_TOP,
  PAYROLL_DIVERGE_HALF_PX,
  PAYROLL_NEG_BAND_TOP,
  PAYROLL_ZERO_LINE_Y,
  payrollMomBarFillColor,
  type PayrollAxisModel,
  type PayrollHeroDisplay,
} from "@/components/economy/detail/labor/laborMarketPayrollChart";
import {
  PayrollRangeFilterModal,
  type PayrollRangeCommitPayload,
  type PayrollRangeFilterCloseReason,
} from "@/components/economy/detail/labor/PayrollRangeFilterModal";
import type { PayrollChartFromFred } from "@/components/economy/detail/labor/payrollChartFromFred";
import { YearlyTotalJobsPrimaryCard } from "@/components/economy/detail/labor/YearlyTotalJobsPrimaryCard";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors, Palette, type ThemeInteractive } from "@/constants/theme/Colors";
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
  semantic: { mutedText: string; hairline: string };
  colorScheme: AppColorScheme;
  isDark: boolean;
  interactive: Pick<ThemeInteractive, "danger" | "primary" | "dangerSoft">;
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
  onSelectBarIndex: (index: number) => void;
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
  isDark,
  interactive,
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

  return (
    <EconomyCard style={styles.payrollCard}>
      <View style={styles.cardTopRow}>
        <ThemedText
          style={[styles.cardKicker, { color: semantic.mutedText }]}
        >
          JOBS CREATED/LOST
        </ThemedText>
        <ThemedText style={[styles.periodLabel, { color: theme.text }]}>
          {payrollLoading ? "—" : payrollHeroDisplay.periodLabel}
        </ThemedText>
      </View>
      {!payrollLoading && payrollChart != null ? (
        <>
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
              {payrollHeroDisplay.trend.label}
            </ThemedText>
          </View>
        </>
      ) : (
        <>
          <View style={styles.heroMetricRow}>
            <View style={styles.heroMetricWithTrend}>
              <ThemedText
                style={[styles.heroMetric, { color: theme.text }]}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
              >
                {payrollLoading ? "…" : payrollHeroDisplay.heroMetric}
              </ThemedText>
              {!payrollLoading ? (
                <Feather
                  name={payrollHeroDisplay.trend.icon}
                  size={26}
                  color={payrollHeroDisplay.trend.color}
                  style={styles.heroTrendIcon}
                />
              ) : null}
            </View>
          </View>
          {payrollLoading ? (
            <View style={styles.consensusRow}>
              <ThemedText
                style={[styles.consensusText, { color: semantic.mutedText }]}
              >
                Loading FRED data…
              </ThemedText>
            </View>
          ) : (
            <View style={styles.consensusRow}>
              <ThemedText
                style={[
                  styles.consensusText,
                  { color: payrollHeroDisplay.trend.color },
                ]}
              >
                {payrollHeroDisplay.trend.label}
              </ThemedText>
            </View>
          )}
        </>
      )}
      {payrollError != null ? (
        <ThemedText
          style={[styles.payrollError, { color: interactive.danger }]}
        >
          {payrollError}
        </ThemedText>
      ) : null}
      <View style={styles.chartArea}>
        {payrollLoading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator color={interactive.primary} />
          </View>
        ) : payrollChart?.bars?.length ? (
          <View
            style={[
              styles.chartNativeWrap,
              { borderColor: semantic.hairline },
            ]}
          >
            <View style={styles.chartPlotRow}>
              <View
                style={[
                  styles.yAxisColumn,
                  { borderRightColor: semantic.hairline },
                ]}
              >
                <View style={styles.yAxisTrack}>
                  {payrollAxis.ticks.map((t) => (
                    <ThemedText
                      key={t.key}
                      style={[
                        styles.yAxisTick,
                        t.emphasis ? styles.yAxisTickEmphasis : null,
                        t.bottom != null
                          ? { bottom: t.bottom }
                          : { top: t.top ?? 0 },
                        {
                          color: t.emphasis ? theme.text : semantic.mutedText,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </ThemedText>
                  ))}
                </View>
              </View>
              <View style={styles.chartPlotMain}>
                <View
                  pointerEvents="none"
                  style={[
                    styles.payrollPlotBand,
                    {
                      top: PAYROLL_BARS_ROW_PAD_TOP,
                      height: PAYROLL_DIVERGE_HALF_PX,
                      backgroundColor: isDark
                        ? "rgba(22, 163, 74, 0.18)"
                        : Palette.successSoft,
                      opacity: isDark ? 1 : 0.32,
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    styles.payrollPlotBand,
                    {
                      top: PAYROLL_NEG_BAND_TOP,
                      height: PAYROLL_DIVERGE_HALF_PX,
                      backgroundColor: interactive.dangerSoft,
                      opacity: isDark ? 0.12 : 0.2,
                    },
                  ]}
                />
                {payrollAxis.midGuides.map((g, idx) => (
                  <View
                    key={`guide-${idx}`}
                    pointerEvents="none"
                    style={[
                      styles.payrollGridLine,
                      {
                        top: g.top,
                        backgroundColor: semantic.hairline,
                      },
                    ]}
                  />
                ))}
                <View
                  style={[
                    styles.zeroLine,
                    {
                      top: PAYROLL_ZERO_LINE_Y,
                      backgroundColor: semantic.mutedText,
                    },
                  ]}
                />
                <View style={styles.barsRow}>
                  {payrollChart.bars.map((bar, i) => {
                    const delta = bar.momVsPriorThousands;
                    const isSelectable = delta != null;
                    const isSelected = selectedBarIndex === i;
                    const magnitude = delta == null ? 0 : Math.abs(delta);
                    const scaledHeight =
                      magnitude === 0
                        ? 0
                        : payrollAxis.scaleMax === 0
                          ? 54
                          : Math.max(
                              12,
                              Math.round(
                                (magnitude / payrollAxis.scaleMax) * 54,
                              ),
                            );
                    const isPositive = (delta ?? 0) >= 0;
                    const barFill = payrollMomBarFillColor(
                      isPositive,
                      isSelected,
                      colorScheme,
                      interactive.primary,
                      interactive.danger,
                    );
                    return (
                      <Pressable
                        key={`${bar.observationDate}-${i}`}
                        disabled={!isSelectable}
                        onPress={() => onSelectBarIndex(i)}
                        style={({ pressed }) => [
                          styles.barCol,
                          { opacity: pressed && isSelectable ? 0.86 : 1 },
                        ]}
                      >
                        <View style={styles.barHalfTop}>
                          {isSelectable && isPositive ? (
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: scaledHeight,
                                  backgroundColor: barFill,
                                },
                              ]}
                            />
                          ) : null}
                        </View>
                        <View style={styles.barHalfBottom}>
                          {isSelectable && !isPositive ? (
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: scaledHeight,
                                  backgroundColor: barFill,
                                },
                              ]}
                            />
                          ) : null}
                        </View>
                        <ThemedText
                          style={[styles.monthLabel, { color: theme.text }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.6}
                        >
                          {bar.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
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
