import type { LaborAgeMetricsMetric } from "@/lib/economy/laborAgeMetricsParse";

export const LABOR_DEMOGRAPHIC_AGE_ORDER = [
  "16-19",
  "20-24",
  "25-54",
  "55+",
] as const;

export const LABOR_DEMOGRAPHIC_AGE_COLORS: Record<string, string> = {
  "16-19": "#EF4444",
  "20-24": "#F59E0B",
  "25-54": "#3B82F6",
  "55+": "#14B8A6",
};

export type LaborDemographicComparisonLine = {
  id: string;
  label: string;
  color: string;
  polylinePoints: string;
  latestValue: number | null;
  endDot: { cx: number; cy: number } | null;
};

export type LaborDemographicComparisonYTick = {
  value: number;
  label: string;
  y: number;
  emphasis?: boolean;
};

export type LaborDemographicComparisonXTick = {
  label: string;
  x: number;
};

export type LaborDemographicComparisonChartModel = {
  chartHeight: number;
  yAxisWidth: number;
  plotSvgWidth: number;
  padX: number;
  padTop: number;
  padBottom: number;
  innerH: number;
  innerW: number;
  yMin: number;
  yMax: number;
  yTicks: LaborDemographicComparisonYTick[];
  gridLineYs: number[];
  lines: LaborDemographicComparisonLine[];
  xTicks: LaborDemographicComparisonXTick[];
  chartSubtitle: string;
};

const CHART_H = 196;
const Y_AXIS_W = 40;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 6;
const Y_PAD_RATIO = 0.1;
const Y_PAD_MIN = 0.4;

function ageGroupLabel(ageGroup: string): string {
  return `${ageGroup} Years`;
}

function formatMonthShort(isoDate: string): string {
  const d = new Date(`${isoDate.trim().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return isoDate;
  }
  return d.toLocaleDateString("en-US", { month: "short" });
}

function formatPctTick(value: number): string {
  const rounded =
    Math.abs(value - Math.round(value)) < 0.05
      ? value.toFixed(0)
      : value.toFixed(1);
  return `${rounded}%`;
}

function valueToY(
  value: number,
  yMin: number,
  yMax: number,
  padTop: number,
  innerH: number,
): number {
  const span = yMax - yMin;
  if (span <= 0) {
    return padTop + innerH / 2;
  }
  const t = (value - yMin) / span;
  return padTop + (1 - t) * innerH;
}

function paddedYRange(values: number[]): { yMin: number; yMax: number } {
  if (values.length === 0) {
    return { yMin: 0, yMax: 10 };
  }
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const span = Math.max(dataMax - dataMin, 0.1);
  const pad = Math.max(span * Y_PAD_RATIO, Y_PAD_MIN);
  return { yMin: dataMin - pad, yMax: dataMax + pad };
}

function buildPolylinePoints(
  points: { x: number; y: number }[],
): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

function pickXTicks(
  dates: string[],
  dateToX: Map<string, number>,
): LaborDemographicComparisonXTick[] {
  if (dates.length === 0) {
    return [];
  }
  if (dates.length === 1) {
    const date = dates[0]!;
    return [{ label: formatMonthShort(date), x: dateToX.get(date) ?? 0 }];
  }
  const indices =
    dates.length <= 4
      ? dates.map((_, i) => i)
      : [0, Math.floor((dates.length - 1) / 2), dates.length - 1];
  const unique = [...new Set(indices)];
  return unique.map((i) => {
    const date = dates[i]!;
    return {
      label: formatMonthShort(date),
      x: dateToX.get(date) ?? 0,
    };
  });
}

export function buildLaborDemographicComparisonChartModel(
  metric: LaborAgeMetricsMetric,
  totalWidth: number,
): LaborDemographicComparisonChartModel | null {
  const seriesByAge = new Map(
    metric.series.map((s) => [s.ageGroup, s] as const),
  );

  const orderedSeries = LABOR_DEMOGRAPHIC_AGE_ORDER.flatMap((age) => {
    const series = seriesByAge.get(age);
    return series ? [series] : [];
  });

  if (orderedSeries.length === 0) {
    return null;
  }

  const dateSet = new Set<string>();
  for (const series of orderedSeries) {
    for (const obs of series.observations) {
      if (obs.value != null) {
        dateSet.add(obs.date);
      }
    }
  }

  const dates = [...dateSet].sort((a, b) => a.localeCompare(b));
  if (dates.length < 2) {
    return null;
  }

  const allValues = orderedSeries.flatMap((series) =>
    series.observations
      .map((o) => o.value)
      .filter((v): v is number => v != null),
  );
  if (allValues.length === 0) {
    return null;
  }

  const { yMin, yMax } = paddedYRange(allValues);
  const plotSvgWidth = Math.max(totalWidth - Y_AXIS_W, 120);
  const innerW = plotSvgWidth - PAD_X * 2;
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;

  const dateToX = new Map<string, number>();
  for (let i = 0; i < dates.length; i += 1) {
    const x =
      PAD_X + (i / Math.max(dates.length - 1, 1)) * innerW;
    dateToX.set(dates[i]!, x);
  }

  const yTickValues = [yMax, yMin + (yMax - yMin) * 0.5, yMin];
  const yTicks: LaborDemographicComparisonYTick[] = yTickValues.map(
    (value, idx) => ({
      value,
      label: formatPctTick(value),
      y: valueToY(value, yMin, yMax, PAD_TOP, innerH),
      emphasis: idx === 0 || idx === yTickValues.length - 1,
    }),
  );
  const gridLineYs = yTicks.map((t) => t.y);

  const lines: LaborDemographicComparisonLine[] = orderedSeries.map(
    (series) => {
      const pts: { x: number; y: number }[] = [];
      for (const obs of series.observations) {
        if (obs.value == null) {
          continue;
        }
        const x = dateToX.get(obs.date);
        if (x == null) {
          continue;
        }
        pts.push({
          x,
          y: valueToY(obs.value, yMin, yMax, PAD_TOP, innerH),
        });
      }

      const latestObs = [...series.observations]
        .reverse()
        .find((o) => o.value != null);
      const endDot =
        pts.length > 0
          ? {
              cx: pts[pts.length - 1]!.x,
              cy: pts[pts.length - 1]!.y,
            }
          : null;

      return {
        id: series.ageGroup,
        label: ageGroupLabel(series.ageGroup),
        color: LABOR_DEMOGRAPHIC_AGE_COLORS[series.ageGroup] ?? "#64748B",
        polylinePoints: buildPolylinePoints(pts),
        latestValue: latestObs?.value ?? null,
        endDot,
      };
    },
  );

  const xTicks = pickXTicks(dates, dateToX);

  return {
    chartHeight: CHART_H,
    yAxisWidth: Y_AXIS_W,
    plotSvgWidth,
    padX: PAD_X,
    padTop: PAD_TOP,
    padBottom: PAD_BOTTOM,
    innerH,
    innerW,
    yMin,
    yMax,
    yTicks,
    gridLineYs,
    lines,
    xTicks,
    chartSubtitle: "All age cohorts on a shared scale",
  };
}
