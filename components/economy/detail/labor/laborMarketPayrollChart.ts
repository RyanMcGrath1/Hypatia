import {
  formatPayemsMomDeltaShort,
  type PayrollBarPoint,
  type PayrollChartFromFred,
} from "@/components/economy/detail/labor/payrollChartFromFred";

/** Diverging plot geometry — must match bar halves + inter-half margins in styles. */
export const PAYROLL_DIVERGE_HALF_PX = 68;
export const PAYROLL_DIVERGE_GUTTER_PX = 2;
export const PAYROLL_Y_AXIS_TRACK_H =
  PAYROLL_DIVERGE_HALF_PX + PAYROLL_DIVERGE_GUTTER_PX + PAYROLL_DIVERGE_HALF_PX;
export const PAYROLL_BARS_ROW_PAD_TOP = 8;
export const PAYROLL_GUIDE_UPPER_Y =
  PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_DIVERGE_HALF_PX / 2;
export const PAYROLL_GUIDE_LOWER_Y =
  PAYROLL_BARS_ROW_PAD_TOP +
  PAYROLL_DIVERGE_HALF_PX +
  PAYROLL_DIVERGE_GUTTER_PX +
  PAYROLL_DIVERGE_HALF_PX / 2;

const PAYROLL_Y_TICK_LAB_DY = 7;

/**
 * Estimated monthly payroll gain needed to keep pace with labor-force growth (thousands).
 * Not an official statistic; revisit as population and immigration estimates change.
 */
export const PAYROLL_BREAK_EVEN_THOUSANDS = 50;

export const PAYROLL_TREND_WINDOW_MONTHS = 3;

export type PayrollBarTone = "aboveBreakEven" | "belowBreakEven" | "loss";

export function payrollBarTone(deltaThousands: number): PayrollBarTone {
  if (deltaThousands < 0) {
    return "loss";
  }
  return deltaThousands >= PAYROLL_BREAK_EVEN_THOUSANDS
    ? "aboveBreakEven"
    : "belowBreakEven";
}

/** Trailing average per bar; `null` until a full window of consecutive months has data. */
export function payrollMovingAverage(
  bars: PayrollBarPoint[],
  windowMonths: number = PAYROLL_TREND_WINDOW_MONTHS,
): (number | null)[] {
  return bars.map((_, i) => {
    if (i + 1 < windowMonths) {
      return null;
    }
    let sum = 0;
    for (let k = i - windowMonths + 1; k <= i; k++) {
      const v = bars[k]!.momVsPriorThousands;
      if (v == null) {
        return null;
      }
      sum += v;
    }
    return sum / windowMonths;
  });
}

export type PayrollAxisTick = {
  key: string;
  label: string;
  top?: number;
  bottom?: number;
  emphasis?: boolean;
};

export type PayrollAxisModel = {
  scaleMax: number;
  rawMax: number;
  ticks: PayrollAxisTick[];
  midGuides: { top: number }[];
};

export type PayrollHeroTrend = {
  icon: "minus" | "trending-up" | "trending-down";
  color: string;
  label: string;
};

export type PayrollHeroDisplay = {
  heroMetric: string;
  periodLabel: string;
  /** e.g. "100k above break-even"; empty when the month has no data. */
  breakEvenLabel: string;
  /** e.g. "3-month average +120k"; empty until enough months are available. */
  averageLabel: string;
  /** e.g. "March 2026" — ties the headline number to its month. */
  contextLabel: string;
  /** e.g. "Mar 2026"; empty when there is no month to show. */
  monthShortLabel: string;
  trend: PayrollHeroTrend;
};

export function isAbortError(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") {
    return true;
  }
  return (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    e.name === "AbortError"
  );
}

export function payrollPeriodBannerFromIso(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return `PERIOD ${iso}`;
  }
  const month = d.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  return `PERIOD ${month} ${d.getFullYear()}`;
}

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

/** Full month name for chart descriptions, e.g. "March 2026". */
export function payrollMonthYearLabel(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Abbreviated month for compact UI, e.g. "Mar 2026". */
export function payrollMonthYearShortLabel(iso: string): string {
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Spoken/written magnitude, e.g. "150 thousand jobs" or "1.2 million jobs". */
export function payrollJobsSpoken(deltaThousands: number): string {
  const abs = Math.abs(Math.round(deltaThousands));
  if (abs >= 1000) {
    return `${(abs / 1000).toFixed(1)} million jobs`;
  }
  return `${abs} thousand jobs`;
}

export type PayrollTrendColors = {
  mutedText: string;
  green: string;
  warning: string;
  danger: string;
};

function trendFromPayrollDelta(
  delta: number | null | undefined,
  colors: PayrollTrendColors,
): PayrollHeroTrend {
  if (delta == null) {
    return { icon: "minus", color: colors.mutedText, label: "No data" };
  }
  if (delta === 0) {
    return { icon: "minus", color: colors.mutedText, label: "No change" };
  }
  const tone = payrollBarTone(delta);
  if (tone === "loss") {
    return { icon: "trending-down", color: colors.danger, label: "Jobs lost" };
  }
  return {
    icon: "trending-up",
    color: tone === "aboveBreakEven" ? colors.green : colors.warning,
    label: "Jobs added",
  };
}

function breakEvenComparison(delta: number): string {
  const diff = Math.round(delta - PAYROLL_BREAK_EVEN_THOUSANDS);
  if (diff === 0) {
    return "At break-even";
  }
  const amount = formatPayemsMomDeltaShort(Math.abs(diff)).replace(/^\+/, "");
  return `${amount} ${diff > 0 ? "above" : "below"} break-even`;
}

export function buildPayrollAxisFromChart(
  chart: PayrollChartFromFred | null | undefined,
): PayrollAxisModel {
  if (!chart?.bars?.length) {
    return {
      scaleMax: 0,
      rawMax: 0,
      ticks: [{ key: "z", label: "0", top: 62, emphasis: true }],
      midGuides: [],
    };
  }
  const values = chart.bars
    .map((b) => b.momVsPriorThousands)
    .filter((v): v is number => typeof v === "number");
  const rawMax =
    values.length > 0
      ? Math.max(
          PAYROLL_BREAK_EVEN_THOUSANDS,
          ...values.map((v) => Math.abs(v)),
        )
      : 0;
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
}

export function buildPayrollHeroDisplay(
  payrollChart: PayrollChartFromFred | null,
  selectedIndex: number | null,
  colors: PayrollTrendColors,
): PayrollHeroDisplay {
  if (payrollChart == null || payrollChart.bars.length === 0) {
    return {
      heroMetric: "—",
      periodLabel: "—",
      contextLabel: "",
      monthShortLabel: "",
      breakEvenLabel: "",
      averageLabel: "",
      trend: trendFromPayrollDelta(null, colors),
    };
  }

  const bars = payrollChart.bars;
  let index = selectedIndex;
  if (index == null || bars[index] == null) {
    index = -1;
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i]!.momVsPriorThousands != null) {
        index = i;
        break;
      }
    }
  }
  if (index < 0) {
    return {
      heroMetric: "—",
      periodLabel: payrollChart.periodLabel,
      contextLabel: "No data in this range",
      monthShortLabel: "",
      breakEvenLabel: "",
      averageLabel: "",
      trend: trendFromPayrollDelta(null, colors),
    };
  }

  const bar = bars[index]!;
  const delta = bar.momVsPriorThousands;
  const month = payrollMonthYearLabel(bar.observationDate);
  const trend = trendFromPayrollDelta(delta, colors);
  const average = payrollMovingAverage(bars)[index];

  return {
    heroMetric: delta == null ? "—" : formatPayemsMomDeltaShort(delta),
    periodLabel: payrollPeriodBannerFromIso(bar.observationDate),
    contextLabel: delta == null ? `No data for ${month}` : month,
    monthShortLabel: payrollMonthYearShortLabel(bar.observationDate),
    breakEvenLabel: delta == null ? "" : breakEvenComparison(delta),
    averageLabel:
      average == null
        ? ""
        : `${PAYROLL_TREND_WINDOW_MONTHS}-month average ${formatPayemsMomDeltaShort(average)}`,
    trend,
  };
}

const QUARTER_GROUPING_MAX_MONTHS = 12;

export type AxisGroup = { key: string; start: number; end: number; text: string };

/**
 * Up to a year of months: calendar quarters labeled by month range ("Jan–Mar").
 * Longer ranges: calendar years. Edge groups may be partial.
 */
export function groupBarsForAxis(bars: PayrollBarPoint[]): AxisGroup[] {
  const byQuarter = bars.length <= QUARTER_GROUPING_MAX_MONTHS;
  const groupKey = (iso: string) => {
    const year = iso.slice(0, 4);
    if (!byQuarter) return year;
    const month = Number(iso.slice(5, 7));
    return `${year}-Q${Math.ceil(month / 3)}`;
  };
  const groups: AxisGroup[] = [];
  bars.forEach((bar, i) => {
    const key = groupKey(bar.observationDate);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.end = i;
    } else {
      groups.push({ key, start: i, end: i, text: "" });
    }
  });
  for (const g of groups) {
    if (!byQuarter) {
      g.text = g.key;
      continue;
    }
    const first = bars[g.start]!.label;
    const last = bars[g.end]!.label;
    g.text = g.start === g.end ? first : `${first}–${last}`;
  }
  return groups;
}
