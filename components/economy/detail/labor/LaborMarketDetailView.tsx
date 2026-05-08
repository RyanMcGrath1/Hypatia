import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
  ECONOMY_DASHBOARD_POSITIVE_GREEN,
  EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { LABOR_EMPLOYMENT_BY_SECTOR } from "@/components/economy/detail/labor/laborDetailData";
import {
  buildPayrollChartFromFredObservations,
  buildPayrollYearToDateChartWithSkeleton,
  filterPayemsObservationsByRangeKey,
  formatPayemsLevelMillionsShort,
  formatPayemsMomDeltaShort,
  PAYROLL_CHART_RANGE_PRESETS,
  resolvePayrollLastFullCalendarYear,
  resolvePayrollYtdCalendarYear,
  type PayrollBarPoint,
  type PayrollChartFromFred,
  type PayrollChartRangeKey,
  type PayrollChartRangePreset,
} from "@/components/economy/detail/labor/payrollChartFromFred";
import {
  FredObservationsError,
  getFredObservations,
  type FredObservationRow,
} from "@/hooks/api/fredObservations";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const CHART_GRAY_LIGHT = "#E5E7EB";
const CHART_GRAY_DARK = "#475569";

/** Plot area height for relative bar fills (px). */
const PAYROLL_BAR_TRACK_PX = 88;
/** Gap between top of bar fill and callout label (px). */
const PAYROLL_CALLOUT_GAP_PX = 4;

/** Latest N PAYEMS prints (`sort_order=desc` on FRED); enough for multi-year UI ranges. */
const PAYEMS_FETCH_LIMIT = 72;
/** Render bars in a horizontal scroller when there are more than this many months. */
const PAYROLL_BAR_SCROLL_THRESHOLD = 14;

function payemsBarPeriodLabel(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") {
    return true;
  }
  return typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError";
}

function payrollRangeOptionCaption(p: PayrollChartRangePreset): string {
  if (p.mode === "ytd") {
    return "Calendar year through latest print (empty months shown)";
  }
  if (p.mode === "last_full_year") {
    return "January–December of prior full calendar year (empty months shown)";
  }
  return `Trailing ${p.months} months`;
}

function payrollRangeOptionA11y(p: PayrollChartRangePreset): string {
  if (p.mode === "ytd") {
    return "Year to date";
  }
  if (p.mode === "last_full_year") {
    return "Prior full calendar year";
  }
  return `Last ${p.label}`;
}

export function LaborMarketDetailView() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";
  const chartMuted = isDark ? CHART_GRAY_DARK : CHART_GRAY_LIGHT;
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const rows = useMemo(() => LABOR_EMPLOYMENT_BY_SECTOR, []);

  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [payrollObservationsRaw, setPayrollObservationsRaw] = useState<FredObservationRow[]>([]);
  const [chartRangeKey, setChartRangeKey] = useState<PayrollChartRangeKey>("ytd");
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [rangeFilterOpen, setRangeFilterOpen] = useState(false);

  const payrollChart = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return null;
    }
    if (chartRangeKey === "ytd") {
      const year = resolvePayrollYtdCalendarYear(payrollObservationsRaw, new Date());
      if (year == null) {
        return null;
      }
      return buildPayrollYearToDateChartWithSkeleton(year, payrollObservationsRaw);
    }
    if (chartRangeKey === "py") {
      const year = resolvePayrollLastFullCalendarYear(payrollObservationsRaw, new Date());
      if (year == null) {
        return null;
      }
      return buildPayrollYearToDateChartWithSkeleton(year, payrollObservationsRaw);
    }
    const filtered = filterPayemsObservationsByRangeKey(
      payrollObservationsRaw,
      chartRangeKey,
    );
    if (filtered.length === 0) {
      return null;
    }
    return buildPayrollChartFromFredObservations(filtered, filtered.length);
  }, [payrollObservationsRaw, chartRangeKey]);

  useEffect(() => {
    if (!payrollChart?.bars?.length) {
      setSelectedBarIndex(null);
      return;
    }
    const withData = payrollChart.bars
      .map((b, i) => (b.hasObservation ? i : -1))
      .filter((i) => i >= 0);
    const lastIdx = withData.length > 0 ? withData[withData.length - 1]! : null;
    setSelectedBarIndex(lastIdx);
  }, [payrollChart]);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function loadPayems() {
      setPayrollLoading(true);
      setPayrollError(null);
      try {
        const data = await getFredObservations(
          {
            seriesId: "PAYEMS",
            limit: PAYEMS_FETCH_LIMIT,
            sortOrder: "desc",
          },
          ac.signal,
        );
        if (cancelled) {
          return;
        }
        // FRED returns newest-first; rest of payroll helpers expect oldest-first.
        const obs = [...(data.observations ?? [])].reverse();
        setPayrollObservationsRaw(obs);
      } catch (e) {
        if (cancelled || isAbortError(e)) {
          return;
        }
        if (e instanceof FredObservationsError) {
          setPayrollError(e.userMessage());
        } else {
          const msg = e instanceof Error ? e.message : String(e);
          setPayrollError(msg);
        }
        setPayrollObservationsRaw([]);
      } finally {
        if (!cancelled) {
          setPayrollLoading(false);
        }
      }
    }

    void loadPayems();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  const trendMeta =
    payrollChart?.monthOverMonthThousands == null
      ? {
          icon: "minus" as const,
          color: semantic.mutedText,
          label: "Latest payroll level",
        }
      : payrollChart.monthOverMonthThousands > 0
        ? {
            icon: "trending-up" as const,
            color: green,
            label: "Payrolls rose vs prior month",
          }
          : payrollChart.monthOverMonthThousands < 0
          ? {
              icon: "trending-down" as const,
              color: interactive.danger,
              label: "Payrolls fell vs prior month",
            }
          : {
              icon: "minus" as const,
              color: semantic.mutedText,
              label: "Unchanged vs prior month",
            };

  const activeRangePreset =
    PAYROLL_CHART_RANGE_PRESETS.find((p) => p.key === chartRangeKey) ??
    PAYROLL_CHART_RANGE_PRESETS.find((p) => p.key === "1y")!;
  const selectedBar =
    payrollChart != null && selectedBarIndex != null
      ? payrollChart.bars[selectedBarIndex]
      : undefined;

  function renderPayrollBar(
    chart: PayrollChartFromFred,
    bar: PayrollBarPoint,
    i: number,
    useScrollLayout: boolean,
  ) {
    const ytdNonDataMonth = chartRangeKey === "ytd" && !bar.hasObservation;
    const isSelected = i === selectedBarIndex && !ytdNonDataMonth;
    const hasBar = bar.hasObservation && bar.levelThousands != null;
    const fillPx = hasBar
      ? Math.max(10, Math.round(bar.relativeHeight * PAYROLL_BAR_TRACK_PX))
      : 0;
    const isLatestInPayload =
      hasBar &&
      chart.latestObservationDate.length > 0 &&
      bar.observationDate === chart.latestObservationDate;
    const level = bar.levelThousands;
    const barCalloutPrimary = !hasBar
      ? "—"
      : isLatestInPayload && bar.momVsPriorThousands != null
        ? formatPayemsMomDeltaShort(bar.momVsPriorThousands)
        : formatPayemsLevelMillionsShort(level!);
    return (
      <Pressable
        key={`${bar.observationDate}-${i}`}
        disabled={ytdNonDataMonth}
        accessibilityRole="button"
        accessibilityState={{ disabled: ytdNonDataMonth }}
        accessibilityHint={
          ytdNonDataMonth
            ? "This month has no payroll print in year-to-date view."
            : "Shows payroll level and change vs the prior month in this chart."
        }
        accessibilityLabel={
          ytdNonDataMonth
            ? `${payemsBarPeriodLabel(bar.observationDate)}, no payroll data, not selectable`
            : !hasBar
              ? `${payemsBarPeriodLabel(bar.observationDate)}, no payroll data yet`
              : isLatestInPayload && bar.momVsPriorThousands != null
                ? `${payemsBarPeriodLabel(bar.observationDate)}, month over month change ${formatPayemsMomDeltaShort(bar.momVsPriorThousands)} thousand`
                : `${payemsBarPeriodLabel(bar.observationDate)}, ${formatPayemsLevelMillionsShort(level!)} million jobs`
        }
        onPress={() => setSelectedBarIndex(i)}
        style={({ pressed }) => [
          useScrollLayout ? styles.barColScroll : styles.barCol,
          Platform.OS === "web"
            ? ({ cursor: ytdNonDataMonth ? "auto" : "pointer" } as const)
            : null,
          { opacity: pressed && !ytdNonDataMonth ? 0.88 : 1 },
        ]}
      >
        <View style={styles.barTrack}>
          {isSelected ? (
            <View
              pointerEvents="none"
              style={[
                styles.barCalloutAnchor,
                { bottom: Math.max(fillPx + PAYROLL_CALLOUT_GAP_PX, PAYROLL_CALLOUT_GAP_PX) },
              ]}
            >
              <ThemedText
                style={[styles.barCallout, { color: interactive.primary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {barCalloutPrimary}
              </ThemedText>
            </View>
          ) : null}
          {hasBar ? (
            <View
              style={[
                styles.barFill,
                {
                  height: fillPx,
                  backgroundColor: isSelected ? interactive.primary : chartMuted,
                },
              ]}
            />
          ) : null}
        </View>
        <ThemedText
          style={[styles.monthLabel, { color: isSelected ? theme.text : semantic.mutedText }]}
        >
          {bar.label}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <EconomyDetailShell pageTitle="LABOR MARKET">
      <EconomyCard style={styles.payrollCard}>
        <View style={styles.cardTopRow}>
          <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>NON-FARM PAYROLLS</ThemedText>
          <ThemedText style={[styles.periodLabel, { color: theme.text }]}>
            {payrollChart?.periodLabel ?? "—"}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.heroMetric, { color: theme.text }]}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
        >
          {payrollLoading ? "…" : payrollChart?.heroMetric ?? "—"}
        </ThemedText>
        {!payrollLoading && payrollChart != null ? (
          <View style={styles.consensusRow}>
            <Feather name={trendMeta.icon} size={16} color={trendMeta.color} style={{ flexShrink: 0 }} />
            <ThemedText style={[styles.consensusText, { color: trendMeta.color }]}>
              {trendMeta.label}
            </ThemedText>
          </View>
        ) : payrollLoading ? (
          <View style={styles.consensusRow}>
            <ThemedText style={[styles.consensusText, { color: semantic.mutedText }]}>
              Loading FRED data…
            </ThemedText>
          </View>
        ) : null}
        {payrollError != null ? (
          <ThemedText style={[styles.payrollError, { color: interactive.danger }]}>
            {payrollError}
          </ThemedText>
        ) : null}
        {!payrollLoading && payrollObservationsRaw.length > 0 ? (
          <View style={styles.chartFilterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open chart time range. Current ${activeRangePreset.label}.`}
              onPress={() => setRangeFilterOpen(true)}
              style={({ pressed }) => [
                styles.rangeFilterButton,
                {
                  borderColor: semantic.hairline,
                  backgroundColor: semantic.cardSubtleBackground,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Feather name="filter" size={14} color={interactive.primary} />
              <ThemedText style={[styles.rangeFilterButtonLabel, { color: theme.text }]}>
                {activeRangePreset.label}
              </ThemedText>
              <Feather name="chevron-down" size={14} color={semantic.mutedText} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.chartArea}>
          {payrollLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={interactive.primary} />
            </View>
          ) : payrollChart?.bars?.length ? (
            <>
              <View style={[styles.dottedRule, { borderColor: semantic.hairline }]} />
              {payrollChart.bars.length > PAYROLL_BAR_SCROLL_THRESHOLD ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={payrollChart.bars.length > 20}
                  style={styles.barsScrollView}
                  contentContainerStyle={styles.barsScrollContent}
                >
                  {payrollChart.bars.map((bar, i) =>
                    renderPayrollBar(payrollChart, bar, i, true),
                  )}
                </ScrollView>
              ) : (
                <View style={styles.barsRow}>
                  {payrollChart.bars.map((bar, i) =>
                    renderPayrollBar(payrollChart, bar, i, false),
                  )}
                </View>
              )}
              {selectedBar != null ? (
                <View style={styles.chartDetail}>
                  {selectedBar.hasObservation && selectedBar.levelThousands != null ? (
                    <>
                      <ThemedText style={[styles.chartDetailPrimary, { color: theme.text }]}>
                        {payemsBarPeriodLabel(selectedBar.observationDate)} ·{" "}
                        {formatPayemsLevelMillionsShort(selectedBar.levelThousands)} jobs
                      </ThemedText>
                      {selectedBar.momVsPriorThousands != null ? (
                        <ThemedText
                          style={[styles.chartDetailSecondary, { color: semantic.mutedText }]}
                        >
                          vs prior month (this window):{" "}
                          {formatPayemsMomDeltaShort(selectedBar.momVsPriorThousands)} thousand
                        </ThemedText>
                      ) : (
                        <ThemedText
                          style={[styles.chartDetailSecondary, { color: semantic.mutedText }]}
                        >
                          No prior month with data to compare (gap or first month of year).
                        </ThemedText>
                      )}
                    </>
                  ) : (
                    <>
                      <ThemedText style={[styles.chartDetailPrimary, { color: theme.text }]}>
                        {payemsBarPeriodLabel(selectedBar.observationDate)}
                      </ThemedText>
                      <ThemedText style={[styles.chartDetailSecondary, { color: semantic.mutedText }]}>
                        No payroll data for this month yet — placeholder in the year timeline.
                      </ThemedText>
                    </>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <ThemedText style={[styles.payrollEmpty, { color: semantic.mutedText }]}>
              {payrollObservationsRaw.length === 0
                ? "No payroll observations available."
                : "No payroll data in this time range."}
            </ThemedText>
          )}
        </View>
        <Modal
          visible={rangeFilterOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setRangeFilterOpen(false)}
        >
          <View style={styles.rangeModalRoot} pointerEvents="box-none">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss time range picker"
              style={styles.rangeModalScrim}
              onPress={() => setRangeFilterOpen(false)}
            />
            <View
              style={[
                styles.rangeModalSheet,
                {
                  paddingBottom: insets.bottom + Spacing.md,
                  backgroundColor: semantic.cardBackground,
                  borderTopColor: semantic.hairline,
                },
              ]}
            >
              <ThemedText style={[styles.rangeModalTitle, { color: theme.text }]}>
                Chart time range
              </ThemedText>
              {PAYROLL_CHART_RANGE_PRESETS.map((p) => {
                const active = chartRangeKey === p.key;
                return (
                  <Pressable
                    key={p.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={payrollRangeOptionA11y(p)}
                    onPress={() => {
                      setChartRangeKey(p.key);
                      setRangeFilterOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.rangeModalOption,
                      {
                        borderColor: semantic.hairline,
                        backgroundColor: active ? interactive.primarySoft : "transparent",
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View style={styles.rangeModalOptionTextCol}>
                      <ThemedText
                        style={[
                          styles.rangeModalOptionLabel,
                          { color: active ? interactive.primary : theme.text },
                        ]}
                      >
                        {p.label}
                      </ThemedText>
                      <ThemedText
                        style={[styles.rangeModalOptionCaption, { color: semantic.mutedText }]}
                      >
                        {payrollRangeOptionCaption(p)}
                      </ThemedText>
                    </View>
                    {active ? (
                      <Feather name="check" size={18} color={interactive.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>AVG HOURLY EARNINGS</ThemedText>
        <View style={styles.inlineMetricRow}>
          <ThemedText style={[styles.midMetric, { color: theme.text }]}>+0.4%</ThemedText>
          <ThemedText style={[styles.momBadge, { color: green }]}>MoM</ThemedText>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: semantic.hairline }]} />
        <ThemedText style={[styles.footerNote, { color: semantic.mutedText }]}>
          Prior: +0.3% | Est: +0.3%
        </ThemedText>
      </EconomyCard>

      <EconomyCard>
        <ThemedText style={[styles.cardKicker, { color: semantic.mutedText }]}>PARTICIPATION RATE</ThemedText>
        <View style={styles.inlineMetricRow}>
          <ThemedText style={[styles.midMetric, { color: theme.text }]}>62.5%</ThemedText>
          <ThemedText style={[styles.deltaNeg, { color: interactive.danger }]}>-0.3%</ThemedText>
        </View>
        <View style={[styles.cardDivider, { backgroundColor: semantic.hairline }]} />
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
            <ThemedText style={[styles.exportBtnText, { color: interactive.primary }]}>EXPORT CSV</ThemedText>
          </Pressable>
        </View>
        <View style={[styles.tableRule, { backgroundColor: semantic.hairline }]} />
        <View style={styles.tableHead}>
          <ThemedText style={[styles.th, { color: semantic.mutedText }]}>SECTOR</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>ADDED/LOST</ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>GROWTH %</ThemedText>
          <ThemedText style={[styles.th, styles.thDist, { color: semantic.mutedText }]} numberOfLines={1}>
            DISTRIBUTION
          </ThemedText>
        </View>
        {rows.map((row) => (
          <View key={row.sector} style={[styles.tr, { borderTopColor: semantic.hairline }]}>
            <ThemedText style={[styles.td, { color: theme.text }]} numberOfLines={2}>
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
              <View style={[styles.distTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
                <View
                  style={[
                    styles.distFill,
                    {
                      width: `${Math.round(row.barFill * 100)}%`,
                      backgroundColor: row.barNegative ? interactive.danger : green,
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

const styles = StyleSheet.create({
  payrollCard: {
    overflow: "visible",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    rowGap: 6,
    columnGap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  cardKicker: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.5,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  periodLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.2,
    textAlign: "right",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  heroMetric: {
    fontSize: 32,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.5,
    marginBottom: 6,
    lineHeight: 40,
    alignSelf: "stretch",
    maxWidth: "100%",
  },
  consensusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: Spacing.md,
  },
  consensusText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    flex: 1,
    minWidth: 0,
  },
  chartArea: {
    marginTop: Spacing.sm,
    position: "relative",
    minHeight: 120,
    overflow: "visible",
  },
  chartLoading: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  payrollError: {
    fontSize: 13,
    fontFamily: Fonts.bodyMedium,
    lineHeight: 18,
    marginBottom: Spacing.sm,
    alignSelf: "stretch",
    flexShrink: 1,
  },
  chartFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  rangeFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  rangeFilterButtonLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3,
  },
  rangeModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  rangeModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  rangeModalSheet: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    maxHeight: "55%",
  },
  rangeModalTitle: {
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
  },
  rangeModalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: 8,
  },
  rangeModalOptionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rangeModalOptionLabel: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
  },
  rangeModalOptionCaption: {
    fontSize: 12,
    fontFamily: Fonts.body,
    marginTop: 2,
    lineHeight: 16,
  },
  payrollEmpty: {
    fontSize: 13,
    fontFamily: Fonts.body,
    paddingVertical: Spacing.md,
  },
  dottedRule: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 72,
    borderTopWidth: 1,
    borderStyle: "dashed",
    opacity: 0.7,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
    minHeight: 120,
    paddingTop: 28,
    overflow: "visible",
  },
  barsScrollView: {
    flexGrow: 0,
    overflow: "visible",
    minHeight: 120,
  },
  barsScrollContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingTop: 28,
    minHeight: 120,
    paddingRight: Spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
    overflow: "visible",
  },
  barColScroll: {
    width: 36,
    minWidth: 36,
    maxWidth: 36,
    alignItems: "center",
    overflow: "visible",
  },
  barCallout: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    textAlign: "center",
    lineHeight: 14,
    width: "100%",
    paddingHorizontal: 1,
  },
  barCalloutAnchor: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  barTrack: {
    width: "100%",
    height: PAYROLL_BAR_TRACK_PX,
    justifyContent: "flex-end",
    alignItems: "stretch",
    position: "relative",
    overflow: "visible",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
    minHeight: 8,
  },
  monthLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 8,
  },
  chartDetail: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    gap: 4,
    alignSelf: "stretch",
    width: "100%",
  },
  chartDetailPrimary: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 18,
    flexShrink: 1,
    width: "100%",
  },
  chartDetailSecondary: {
    fontSize: 12,
    fontFamily: Fonts.body,
    lineHeight: 17,
    flexShrink: 1,
    width: "100%",
  },
  inlineMetricRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  midMetric: {
    fontSize: 28,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.3,
  },
  momBadge: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
  },
  deltaNeg: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  footerNote: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.body,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tableTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3,
  },
  exportBtn: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exportBtnText: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
  tableRule: {
    height: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: 4,
  },
  th: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.2,
    flex: 1.15,
  },
  thNum: {
    flex: 0.75,
    textAlign: "right",
  },
  thDist: {
    flex: 1.1,
    textAlign: "right",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: 4,
  },
  td: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    flex: 1.15,
  },
  tdNum: {
    flex: 0.75,
    textAlign: "right",
    fontFamily: Fonts.bodySemiBold,
  },
  distCell: {
    flex: 1.1,
    justifyContent: "center",
  },
  distTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  distFill: {
    height: "100%",
    borderRadius: 4,
  },
});
