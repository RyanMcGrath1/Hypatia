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
export const PAYROLL_ZERO_LINE_Y = PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_DIVERGE_HALF_PX;
export const PAYROLL_NEG_BAND_TOP =
  PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_DIVERGE_HALF_PX + PAYROLL_DIVERGE_GUTTER_PX;

const PAYROLL_Y_TICK_LAB_DY = 7;

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

/** Neutral fill for MoM bars until the user selects a month. */
export function payrollMomBarUnselectedFill(scheme: "light" | "dark"): string {
  return scheme === "dark" ? "#64748B" : "#CBD5E1";
}

export function payrollMomBarFillColor(
  isPositive: boolean,
  isSelected: boolean,
  scheme: "light" | "dark",
  positiveBase: string,
  negativeBase: string,
): string {
  if (!isSelected) {
    return payrollMomBarUnselectedFill(scheme);
  }
  return isPositive ? positiveBase : negativeBase;
}

function trendFromPayrollDelta(
  delta: number | null | undefined,
  mutedText: string,
  green: string,
  danger: string,
): PayrollHeroTrend {
  if (delta == null) {
    return { icon: "minus", color: mutedText, label: "Latest payroll level" };
  }
  if (delta > 0) {
    return { icon: "trending-up", color: green, label: "Jobs Created" };
  }
  if (delta < 0) {
    return { icon: "trending-down", color: danger, label: "Jobs Lost" };
  }
  return {
    icon: "minus",
    color: mutedText,
    label: "Unchanged vs prior month",
  };
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
}

export function buildPayrollHeroDisplay(
  payrollChart: PayrollChartFromFred | null,
  selectedBar: PayrollBarPoint | undefined,
  ctx: { mutedText: string; green: string; danger: string },
): PayrollHeroDisplay {
  if (payrollChart == null) {
    return {
      heroMetric: "—",
      periodLabel: "—",
      trend: trendFromPayrollDelta(null, ctx.mutedText, ctx.green, ctx.danger),
    };
  }

  const chartWideTrend = trendFromPayrollDelta(
    payrollChart.monthOverMonthThousands,
    ctx.mutedText,
    ctx.green,
    ctx.danger,
  );

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
    ? ({
        icon: "minus" as const,
        color: ctx.mutedText,
        label: "No payroll data for this month",
      } satisfies PayrollHeroTrend)
    : trendFromPayrollDelta(
        selectedBar.momVsPriorThousands,
        ctx.mutedText,
        ctx.green,
        ctx.danger,
      );

  return { heroMetric, periodLabel, trend };
}
