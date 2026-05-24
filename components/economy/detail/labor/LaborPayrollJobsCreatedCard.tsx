import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import {
  laborMarketDetailStyles as styles,
  PAYROLL_BARS_ROW_GAP,
  PAYROLL_BARS_ROW_PAD_H,
} from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
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
import { PAYROLL_CHART_VIEWPORT_MONTH_COUNT } from "@/components/economy/detail/labor/payrollChartFromFred";
import {
  LaborPayrollChartSkeleton,
  LaborPayrollHeroSkeleton,
} from "@/components/economy/detail/labor/LaborDetailSkeletons";
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
  const [plotWidth, setPlotWidth] = useState(0);
  const barsScrollRef = useRef<ScrollView>(null);
  const barCount = payrollChart?.bars.length ?? 0;
  const plotInnerWidth = Math.max(0, plotWidth - PAYROLL_BARS_ROW_PAD_H * 2);
  const barSlotWidth =
    plotInnerWidth > 0
      ? (plotInnerWidth -
          PAYROLL_BARS_ROW_GAP * (PAYROLL_CHART_VIEWPORT_MONTH_COUNT - 1)) /
        PAYROLL_CHART_VIEWPORT_MONTH_COUNT
      : 0;
  const barsContentWidth =
    barCount > 0 && barSlotWidth > 0
      ? PAYROLL_BARS_ROW_PAD_H * 2 +
        barCount * barSlotWidth +
        PAYROLL_BARS_ROW_GAP * Math.max(0, barCount - 1)
      : 0;
  const barsScrollable = barCount > PAYROLL_CHART_VIEWPORT_MONTH_COUNT;
  const maxBarsScrollX = Math.max(0, barsContentWidth - plotWidth);
  const isYtdCalendarChart = payrollChart?.calendarContextYear != null;
  const initialBarsScrollX = isYtdCalendarChart ? 0 : maxBarsScrollX;

  useEffect(() => {
    if (!barsScrollable || barCount === 0) {
      return;
    }
    if (!isYtdCalendarChart && maxBarsScrollX <= 0) {
      return;
    }
    const id = requestAnimationFrame(() => {
      barsScrollRef.current?.scrollTo({ x: initialBarsScrollX, animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [
    barsScrollable,
    barCount,
    initialBarsScrollX,
    isYtdCalendarChart,
    maxBarsScrollX,
    payrollChart?.bars,
  ]);

  const renderPayrollBars = () => {
    if (!payrollChart?.bars.length) {
      return null;
    }
    return payrollChart.bars.map((bar, i) => {
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
                Math.round((magnitude / payrollAxis.scaleMax) * 54),
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
            barSlotWidth > 0 && { width: barSlotWidth, flex: 0 },
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
    });
  };

  return (
    <EconomyCard style={styles.payrollCard}>
      {payrollLoading ? (
        <LaborPayrollHeroSkeleton />
      ) : (
        <>
          <View style={styles.cardTopRow}>
            <ThemedText
              style={[styles.cardKicker, { color: semantic.mutedText }]}
            >
              JOBS CREATED/LOST
            </ThemedText>
            <ThemedText style={[styles.periodLabel, { color: theme.text }]}>
              {payrollHeroDisplay.periodLabel}
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
              {payrollHeroDisplay.trend.label}
            </ThemedText>
          </View>
        </>
      )}
      <View style={styles.chartArea}>
        {payrollLoading ? (
          <LaborPayrollChartSkeleton />
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
              <View
                style={styles.chartPlotMain}
                onLayout={(e) => {
                  const w = e.nativeEvent.layout.width;
                  if (w > 0 && w !== plotWidth) {
                    setPlotWidth(w);
                  }
                }}
              >
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
                {barSlotWidth > 0 && barsScrollable ? (
                  <ScrollView
                    ref={barsScrollRef}
                    horizontal
                    nestedScrollEnabled
                    directionalLockEnabled
                    showsHorizontalScrollIndicator
                    scrollEventThrottle={16}
                    contentContainerStyle={[
                      styles.barsRow,
                      barsContentWidth > 0 ? { width: barsContentWidth } : null,
                    ]}
                    style={styles.barsScroll}
                  >
                    {renderPayrollBars()}
                  </ScrollView>
                ) : (
                  <View style={styles.barsRow}>{renderPayrollBars()}</View>
                )}
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
