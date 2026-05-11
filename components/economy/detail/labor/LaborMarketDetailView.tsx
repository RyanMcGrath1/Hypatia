import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LABOR_EMPLOYMENT_BY_SECTOR } from "@/components/economy/detail/labor/laborDetailData";
import {
  buildPayrollChartFromFredObservations,
  buildPayrollYearToDateChartWithSkeleton,
  filterPayemsObservationsByRangeKey,
  formatPayemsMomDeltaShort,
  PAYROLL_CHART_RANGE_PRESETS,
  resolvePayrollLastFullCalendarYear,
  resolvePayrollYtdCalendarYear,
  type PayrollChartRangeKey,
  type PayrollChartRangePreset,
} from "@/components/economy/detail/labor/payrollChartFromFred";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
  ECONOMY_DASHBOARD_POSITIVE_GREEN,
  EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import {
  getSemanticColors,
  Radius,
  Spacing,
} from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import {
  FredObservationsError,
  getFredObservations,
  type FredObservationRow,
} from "@/hooks/api/fredObservations";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

/** Latest N PAYEMS prints (`sort_order=desc` on FRED); enough for multi-year UI ranges. */
const PAYEMS_FETCH_LIMIT = 72;

/** Matches payroll chart banner style (`PERIOD MONTH YEAR`). */
function payrollPeriodBannerFromIso(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return `PERIOD ${iso}`;
  }
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  return `PERIOD ${month} ${d.getFullYear()}`;
}

function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") {
    return true;
  }
  return (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    e.name === "AbortError"
  );
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

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  const m6 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(s);
  if (m6) {
    return {
      r: parseInt(m6[1], 16),
      g: parseInt(m6[2], 16),
      b: parseInt(m6[3], 16),
    };
  }
  const m3 = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(s);
  if (m3) {
    return {
      r: parseInt(m3[1] + m3[1], 16),
      g: parseInt(m3[2] + m3[2], 16),
      b: parseInt(m3[3] + m3[3], 16),
    };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => clampByte(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Slightly different shade for selected MoM bars (same hue as gain/loss base). */
function shadeForSelectedBar(baseHex: string, scheme: "light" | "dark"): string {
  const rgb = parseHexRgb(baseHex);
  if (!rgb) {
    return baseHex;
  }
  if (scheme === "dark") {
    const t = 0.22;
    return rgbToHex(
      rgb.r + (255 - rgb.r) * t,
      rgb.g + (255 - rgb.g) * t,
      rgb.b + (255 - rgb.b) * t,
    );
  }
  const t = 0.2;
  return rgbToHex(rgb.r * (1 - t), rgb.g * (1 - t), rgb.b * (1 - t));
}

function payrollMomBarFillColor(
  isPositive: boolean,
  isSelected: boolean,
  scheme: "light" | "dark",
  positiveBase: string,
  negativeBase: string,
): string {
  const base = isPositive ? positiveBase : negativeBase;
  if (!isSelected) {
    return base;
  }
  return shadeForSelectedBar(base, scheme);
}

export function LaborMarketDetailView() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const rows = useMemo(() => LABOR_EMPLOYMENT_BY_SECTOR, []);

  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [payrollObservationsRaw, setPayrollObservationsRaw] = useState<
    FredObservationRow[]
  >([]);
  const [chartRangeKey, setChartRangeKey] =
    useState<PayrollChartRangeKey>("ytd");
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [rangeFilterOpen, setRangeFilterOpen] = useState(false);

  const payrollChart = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return null;
    }
    if (chartRangeKey === "ytd") {
      const year = resolvePayrollYtdCalendarYear(
        payrollObservationsRaw,
        new Date(),
      );
      if (year == null) {
        return null;
      }
      return buildPayrollYearToDateChartWithSkeleton(
        year,
        payrollObservationsRaw,
      );
    }
    if (chartRangeKey === "py") {
      const year = resolvePayrollLastFullCalendarYear(
        payrollObservationsRaw,
        new Date(),
      );
      if (year == null) {
        return null;
      }
      return buildPayrollYearToDateChartWithSkeleton(
        year,
        payrollObservationsRaw,
      );
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

  const activeRangePreset =
    PAYROLL_CHART_RANGE_PRESETS.find((p) => p.key === chartRangeKey) ??
    PAYROLL_CHART_RANGE_PRESETS.find((p) => p.key === "1y")!;
  const selectedBar =
    payrollChart != null && selectedBarIndex != null
      ? payrollChart.bars[selectedBarIndex]
      : undefined;

  const payrollHeroDisplay = useMemo(() => {
    if (payrollChart == null) {
      return {
        heroMetric: "—",
        periodLabel: "—",
        trend: {
          icon: "minus" as const,
          color: semantic.mutedText,
          label: "Latest payroll level",
        },
      };
    }

    const chartWideTrend =
      payrollChart.monthOverMonthThousands == null
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

    if (selectedBar == null) {
      return {
        heroMetric: payrollChart.heroMetric,
        periodLabel: payrollChart.periodLabel,
        trend: chartWideTrend,
      };
    }

    const hasBar = selectedBar.momVsPriorThousands != null;
    const heroMetric = !hasBar
      ? "—"
      : formatPayemsMomDeltaShort(selectedBar.momVsPriorThousands!);

    const periodLabel = payrollPeriodBannerFromIso(selectedBar.observationDate);

    const trend = !hasBar
      ? {
          icon: "minus" as const,
          color: semantic.mutedText,
          label: "No payroll data for this month",
        }
      : selectedBar.momVsPriorThousands == null
        ? {
            icon: "minus" as const,
            color: semantic.mutedText,
            label: "No prior month with data to compare in this window",
          }
        : selectedBar.momVsPriorThousands > 0
          ? {
              icon: "trending-up" as const,
              color: green,
              label: "Payrolls rose vs prior month",
            }
          : selectedBar.momVsPriorThousands < 0
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

    return { heroMetric, periodLabel, trend };
  }, [
    payrollChart,
    selectedBar,
    semantic.mutedText,
    green,
    interactive.danger,
  ]);

  const payrollChartMaxAbsDelta = useMemo(() => {
    if (!payrollChart?.bars?.length) {
      return 0;
    }
    const values = payrollChart.bars
      .map((b) => b.momVsPriorThousands)
      .filter((v): v is number => typeof v === "number");
    return values.length > 0 ? Math.max(...values.map((v) => Math.abs(v))) : 0;
  }, [payrollChart]);

  return (
    <EconomyDetailShell pageTitle="LABOR MARKET">
      <EconomyCard style={styles.payrollCard}>
        <View style={styles.cardTopRow}>
          <ThemedText
            style={[styles.cardKicker, { color: semantic.mutedText }]}
          >
            JOBS CREATED
          </ThemedText>
          <ThemedText style={[styles.periodLabel, { color: theme.text }]}>
            {payrollLoading ? "—" : payrollHeroDisplay.periodLabel}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.heroMetric, { color: theme.text }]}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
        >
          {payrollLoading ? "…" : payrollHeroDisplay.heroMetric}
        </ThemedText>
        {!payrollLoading && payrollChart != null ? (
          <View style={styles.consensusRow}>
            <Feather
              name={payrollHeroDisplay.trend.icon}
              size={16}
              color={payrollHeroDisplay.trend.color}
              style={{ flexShrink: 0 }}
            />
            <ThemedText
              style={[
                styles.consensusText,
                { color: payrollHeroDisplay.trend.color },
              ]}
            >
              {payrollHeroDisplay.trend.label}
            </ThemedText>
          </View>
        ) : payrollLoading ? (
          <View style={styles.consensusRow}>
            <ThemedText
              style={[styles.consensusText, { color: semantic.mutedText }]}
            >
              Loading FRED data…
            </ThemedText>
          </View>
        ) : null}
        {payrollError != null ? (
          <ThemedText
            style={[styles.payrollError, { color: interactive.danger }]}
          >
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
              <ThemedText
                style={[styles.rangeFilterButtonLabel, { color: theme.text }]}
              >
                {activeRangePreset.label}
              </ThemedText>
              <Feather
                name="chevron-down"
                size={14}
                color={semantic.mutedText}
              />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.chartArea}>
          {payrollLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={interactive.primary} />
            </View>
          ) : payrollChart?.bars?.length ? (
            <View style={[styles.chartNativeWrap, { borderColor: semantic.hairline }]}>
              <View style={[styles.zeroLine, { backgroundColor: semantic.hairline }]} />
              <View style={styles.barsRow}>
                {payrollChart.bars.map((bar, i) => {
                  const delta = bar.momVsPriorThousands;
                  const isSelectable = delta != null;
                  const isSelected = selectedBarIndex === i;
                  const magnitude = delta == null ? 0 : Math.abs(delta);
                  const scaledHeight =
                    magnitude === 0
                      ? 0
                      : payrollChartMaxAbsDelta === 0
                        ? 54
                        : Math.max(10, Math.round((magnitude / payrollChartMaxAbsDelta) * 54));
                  const isPositive = (delta ?? 0) >= 0;
                  const barFill = payrollMomBarFillColor(
                    isPositive,
                    isSelected,
                    colorScheme,
                    green,
                    interactive.danger,
                  );
                  return (
                    <Pressable
                      key={`${bar.observationDate}-${i}`}
                      disabled={!isSelectable}
                      onPress={() => setSelectedBarIndex(i)}
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
                              styles.barFillTop,
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
                              styles.barFillBottom,
                              {
                                height: scaledHeight,
                                backgroundColor: barFill,
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                      <ThemedText
                        style={[styles.monthLabel, { color: semantic.mutedText }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.55}
                      >
                        {bar.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
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
              <ThemedText
                style={[styles.rangeModalTitle, { color: theme.text }]}
              >
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
                        backgroundColor: active
                          ? interactive.primarySoft
                          : "transparent",
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
                        style={[
                          styles.rangeModalOptionCaption,
                          { color: semantic.mutedText },
                        ]}
                      >
                        {payrollRangeOptionCaption(p)}
                      </ThemedText>
                    </View>
                    {active ? (
                      <Feather
                        name="check"
                        size={18}
                        color={interactive.primary}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Modal>
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
  chartNativeWrap: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: "hidden",
    minHeight: 170,
    position: "relative",
  },
  zeroLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 76,
    height: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 3,
    minHeight: 170,
  },
  barCol: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
  },
  barHalfTop: {
    height: 68,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "stretch",
    marginBottom: 1,
  },
  barHalfBottom: {
    height: 68,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "stretch",
    marginTop: 1,
  },
  barFill: {
    width: "100%",
  },
  barFillTop: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barFillBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  monthLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    marginTop: 8,
    width: "100%",
    textAlign: "center",
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
