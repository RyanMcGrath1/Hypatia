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
  computeCalendarYearPayrollNetLevelDeltaThousands,
  computePayrollSpanNetLevelDeltaThousands,
  filterPayemsObservationsByRangeKey,
  formatPayemsMomDeltaShort,
  PAYROLL_CHART_RANGE_PRESETS,
  payrollChartRangePresetDisplayLabel,
  resolvePayrollLastFullCalendarYear,
  resolvePayrollYtdCalendarYear,
  type PayrollChartRangeKey,
  type PayrollChartRangePreset,
} from "@/components/economy/detail/labor/payrollChartFromFred";
import { YearlyTotalJobsPrimaryCard } from "@/components/economy/detail/labor/YearlyTotalJobsPrimaryCard";
import { EconomyCard } from "@/components/economy/detail/shared/EconomyCard";
import {
  ECONOMY_DASHBOARD_POSITIVE_GREEN,
  EconomyDetailShell,
} from "@/components/economy/detail/shared/EconomyDetailShell";
import { ThemedText } from "@/components/theme/ThemedText";
import { FilterIconButton } from "@/components/ui/FilterIconButton";
import { Colors, Palette } from "@/constants/theme/Colors";
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

/** Diverging plot geometry — must match `barHalfTop` / `barHalfBottom` + inter-half margins. */
const PAYROLL_DIVERGE_HALF_PX = 68;
const PAYROLL_DIVERGE_GUTTER_PX = 2;
const PAYROLL_Y_AXIS_TRACK_H =
  PAYROLL_DIVERGE_HALF_PX + PAYROLL_DIVERGE_GUTTER_PX + PAYROLL_DIVERGE_HALF_PX;
const PAYROLL_BARS_ROW_PAD_TOP = 8;
/** Horizontal guides: 50% of scale within each half (px from `chartPlotMain` top). */
const PAYROLL_GUIDE_UPPER_Y =
  PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_DIVERGE_HALF_PX / 2;
const PAYROLL_GUIDE_LOWER_Y =
  PAYROLL_BARS_ROW_PAD_TOP +
  PAYROLL_DIVERGE_HALF_PX +
  PAYROLL_DIVERGE_GUTTER_PX +
  PAYROLL_DIVERGE_HALF_PX / 2;
const PAYROLL_ZERO_LINE_Y = PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_DIVERGE_HALF_PX;
/** Top of negative half plot area (after gutter), for band fill alignment. */
const PAYROLL_NEG_BAND_TOP =
  PAYROLL_BARS_ROW_PAD_TOP +
  PAYROLL_DIVERGE_HALF_PX +
  PAYROLL_DIVERGE_GUTTER_PX;

/**
 * “Nice” symmetric Y max (thousands) so axis labels are round and headroom is consistent.
 */
function niceSymmetricScaleThousands(maxAbs: number): number {
  if (!Number.isFinite(maxAbs) || maxAbs <= 0) {
    return 50;
  }
  const exp = Math.floor(Math.log10(maxAbs));
  const pow = 10 ** exp;
  const f = maxAbs / pow;
  const candidates = [1, 2, 2.5, 5, 10] as const;
  const nf = candidates.find((c) => c + 1e-9 >= f) ?? 10;
  return nf * pow;
}

type PayrollAxisTick = {
  key: string;
  label: string;
  top?: number;
  bottom?: number;
  /** Stronger color for ±scale and 0 */
  emphasis?: boolean;
};

const PAYROLL_Y_TICK_LAB_DY = 7;

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

function payrollRangeOptionCaption(
  p: PayrollChartRangePreset,
  observations: FredObservationRow[],
): string {
  if (p.mode === "ytd") {
    return "Calendar year through latest print (empty months shown)";
  }
  if (p.mode === "last_full_year") {
    const y = payrollChartRangePresetDisplayLabel(p, observations);
    return `January–December ${y} (empty months shown)`;
  }
  return `Trailing ${p.months} months`;
}

function payrollRangeOptionA11y(
  p: PayrollChartRangePreset,
  observations: FredObservationRow[],
): string {
  if (p.mode === "ytd") {
    return "Year to date";
  }
  if (p.mode === "last_full_year") {
    return `Prior full calendar year ${payrollChartRangePresetDisplayLabel(p, observations)}`;
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
function shadeForSelectedBar(
  baseHex: string,
  scheme: "light" | "dark",
): string {
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
  const isDark = colorScheme === "dark";
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
              label: "Jobs Created",
            }
          : payrollChart.monthOverMonthThousands < 0
            ? {
                icon: "trending-down" as const,
                color: interactive.danger,
                label: "Jobs Lost",
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
              label: "Jobs Created",
            }
          : selectedBar.momVsPriorThousands < 0
            ? {
                icon: "trending-down" as const,
                color: interactive.danger,
                label: "Jobs Lost",
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

  /** Nice symmetric scale, contextual ticks, and guide positions for the diverging chart. */
  const payrollAxis = useMemo(() => {
    if (!payrollChart?.bars?.length) {
      return {
        scaleMax: 0,
        rawMax: 0,
        ticks: [
          { key: "z", label: "0", top: 62, emphasis: true },
        ] as PayrollAxisTick[],
        midGuides: [] as { top: number }[],
      };
    }
    const values = payrollChart.bars
      .map((b) => b.momVsPriorThousands)
      .filter((v): v is number => typeof v === "number");
    const rawMax =
      values.length > 0 ? Math.max(...values.map((v) => Math.abs(v))) : 0;
    if (rawMax <= 0) {
      return {
        scaleMax: 0,
        rawMax: 0,
        ticks: [{ key: "z", label: "0", top: 62, emphasis: true }],
        midGuides: [],
      };
    }
    const scaleMax = niceSymmetricScaleThousands(rawMax);
    const half = scaleMax / 2;
    const topLabel = formatPayemsMomDeltaShort(scaleMax);
    const halfPosLabel = formatPayemsMomDeltaShort(half);
    const halfNegLabel = formatPayemsMomDeltaShort(-half);
    const bottomLabel = formatPayemsMomDeltaShort(-scaleMax);
    const halfLabelsDistinct =
      halfPosLabel !== topLabel && halfNegLabel !== bottomLabel;

    const ticks: PayrollAxisTick[] = [
      { key: "max", label: topLabel, top: 0, emphasis: true },
    ];
    if (halfLabelsDistinct) {
      ticks.push({
        key: "half+",
        label: halfPosLabel,
        top: PAYROLL_DIVERGE_HALF_PX / 2 - PAYROLL_Y_TICK_LAB_DY,
      });
    }
    ticks.push({
      key: "zero",
      label: "0",
      top:
        PAYROLL_DIVERGE_HALF_PX +
        PAYROLL_DIVERGE_GUTTER_PX / 2 -
        PAYROLL_Y_TICK_LAB_DY,
      emphasis: true,
    });
    if (halfLabelsDistinct) {
      ticks.push({
        key: "half-",
        label: halfNegLabel,
        top:
          PAYROLL_DIVERGE_HALF_PX +
          PAYROLL_DIVERGE_GUTTER_PX +
          PAYROLL_DIVERGE_HALF_PX / 2 -
          PAYROLL_Y_TICK_LAB_DY,
      });
    }
    ticks.push({ key: "min", label: bottomLabel, bottom: 0, emphasis: true });

    const midGuides =
      halfLabelsDistinct && scaleMax > 0
        ? [{ top: PAYROLL_GUIDE_UPPER_Y }, { top: PAYROLL_GUIDE_LOWER_Y }]
        : [];

    return { scaleMax, rawMax, ticks, midGuides };
  }, [payrollChart]);

  const yearlyTotalJobsNetThousands = useMemo(() => {
    if (
      payrollLoading ||
      payrollObservationsRaw.length === 0 ||
      !payrollChart
    ) {
      return null;
    }
    if (payrollChart.calendarContextYear != null) {
      return computeCalendarYearPayrollNetLevelDeltaThousands(
        payrollObservationsRaw,
        payrollChart.calendarContextYear,
      );
    }
    const filtered = filterPayemsObservationsByRangeKey(
      payrollObservationsRaw,
      chartRangeKey,
    );
    return computePayrollSpanNetLevelDeltaThousands(filtered);
  }, [payrollLoading, payrollObservationsRaw, payrollChart, chartRangeKey]);

  const yearlyTotalJobsSubtitle = useMemo(() => {
    if (!payrollChart) {
      return undefined;
    }
    if (payrollChart.calendarContextYear != null) {
      const y = payrollChart.calendarContextYear;
      if (chartRangeKey === "ytd") {
        return `Accumulated growth from first through latest payroll print in ${y}.`;
      }
      return `Accumulated growth over calendar year ${y}.`;
    }
    const preset = PAYROLL_CHART_RANGE_PRESETS.find(
      (p) => p.key === chartRangeKey,
    );
    if (preset?.mode === "trailing" && preset.months != null) {
      return `Accumulated growth over trailing ${preset.months} months.`;
    }
    const rangeLabel = preset?.label ?? chartRangeKey;
    return `Accumulated growth over selected window (${rangeLabel}).`;
  }, [payrollChart, chartRangeKey]);

  const yearlyTotalJobsBadgeLabel = useMemo(() => {
    if (
      payrollLoading ||
      !payrollChart ||
      yearlyTotalJobsNetThousands == null ||
      payrollChart.calendarContextYear == null
    ) {
      return undefined;
    }
    const y = payrollChart.calendarContextYear;
    const prevNet = computeCalendarYearPayrollNetLevelDeltaThousands(
      payrollObservationsRaw,
      y - 1,
    );
    if (prevNet == null || Math.abs(prevNet) < 1) {
      return undefined;
    }
    const curr = yearlyTotalJobsNetThousands;
    const pct = ((curr - prevNet) / Math.abs(prevNet)) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}% YoY`;
  }, [
    payrollLoading,
    payrollChart,
    yearlyTotalJobsNetThousands,
    payrollObservationsRaw,
  ]);

  return (
    <EconomyDetailShell pageTitle="LABOR MARKET">
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
              {payrollObservationsRaw.length > 0 ? (
                <FilterIconButton
                  accessibilityLabel={`Chart time range, ${payrollChartRangePresetDisplayLabel(activeRangePreset, payrollObservationsRaw)}. Opens options.`}
                  onPress={() => setRangeFilterOpen(true)}
                  style={styles.heroMetricFilter}
                />
              ) : null}
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
              {!payrollLoading && payrollObservationsRaw.length > 0 ? (
                <FilterIconButton
                  accessibilityLabel={`Chart time range, ${payrollChartRangePresetDisplayLabel(activeRangePreset, payrollObservationsRaw)}. Opens options.`}
                  onPress={() => setRangeFilterOpen(true)}
                  style={styles.heroMetricFilter}
                />
              ) : null}
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
          {!payrollLoading && payrollChart?.bars?.length ? (
            <YearlyTotalJobsPrimaryCard
              netThousands={yearlyTotalJobsNetThousands}
              badgeLabel={yearlyTotalJobsBadgeLabel}
              subtitle={
                yearlyTotalJobsNetThousands == null
                  ? yearlyTotalJobsSubtitle
                    ? `${yearlyTotalJobsSubtitle} At least two months with data are needed to compute net change.`
                    : "At least two months with data are needed to compute net change."
                  : yearlyTotalJobsSubtitle
              }
            />
          ) : null}
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
                    accessibilityLabel={payrollRangeOptionA11y(
                      p,
                      payrollObservationsRaw,
                    )}
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
                        {payrollChartRangePresetDisplayLabel(
                          p,
                          payrollObservationsRaw,
                        )}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.rangeModalOptionCaption,
                          { color: semantic.mutedText },
                        ]}
                      >
                        {payrollRangeOptionCaption(p, payrollObservationsRaw)}
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
  heroMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    minHeight: 44,
  },
  heroMetricWithTrend: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 0,
    gap: 3,
  },
  heroMetric: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 32,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroTrendIcon: {
    flexShrink: 0,
  },
  heroMetricFilter: {
    flexShrink: 0,
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
  chartPlotRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  /** Width fits stacked MoM ticks (nice scale, ±half when shown). */
  yAxisColumn: {
    width: 64,
    flexShrink: 0,
    paddingLeft: 6,
    paddingRight: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  /** Aligns with bars: two halves + gutter (see PAYROLL_Y_AXIS_TRACK_H). */
  yAxisTrack: {
    marginTop: PAYROLL_BARS_ROW_PAD_TOP,
    height: PAYROLL_Y_AXIS_TRACK_H,
    position: "relative",
  },
  yAxisTick: {
    position: "absolute",
    left: 0,
    right: 0,
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 14,
    textAlign: "right",
  },
  yAxisTickEmphasis: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.bodyBold,
  },
  chartPlotMain: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  payrollPlotBand: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 0,
  },
  payrollGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.52,
    zIndex: 0,
  },
  zeroLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    zIndex: 1,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    paddingHorizontal: 8,
    paddingTop: PAYROLL_BARS_ROW_PAD_TOP,
    paddingBottom: 10,
    gap: 4,
    minHeight: 170,
    zIndex: 2,
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
  monthLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 14,
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
    overflow: "hidden",
  },
  distFill: {
    height: "100%",
  },
});
