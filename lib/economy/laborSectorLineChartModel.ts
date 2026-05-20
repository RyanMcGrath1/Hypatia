import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";
import {
  excludeFromLaborSectorBreakdown,
  laborSectorDisplayName,
} from "@/lib/economy/laborSectorDisplayName";

/** Distinct strokes for up to ~10 sector lines (light + dark friendly). */
export const LABOR_SECTOR_LINE_COLORS = [
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#EF4444",
  "#64748B",
] as const;

export type LaborSectorLineSeries = {
  id: string;
  label: string;
  color: string;
  polylinePoints: string;
  /** Closed polygon for fill under the line down to the chart baseline. */
  areaPolygonPoints: string;
  /** % change vs period start (0% at first month). */
  pctChange: number[];
  /** Latest month % change vs period start. */
  latestPctChange: number;
  endDot: { cx: number; cy: number };
};

export type LaborSectorYTick = {
  pctValue: number;
  label: string;
  y: number;
  emphasis?: boolean;
  /** Top/bottom bound labels for the padded scale. */
  bound?: boolean;
};

export type LaborSectorXTick = {
  label: string;
  /** X within the plot SVG. */
  x: number;
};

export type LaborSectorScaleMode = "mixed" | "positive-only" | "negative-only";

export type LaborSectorLineChartModel = {
  totalWidth: number;
  yAxisWidth: number;
  plotSvgWidth: number;
  chartHeight: number;
  padX: number;
  padTop: number;
  padBottom: number;
  innerH: number;
  innerW: number;
  /** Padded scale floor (% change) — bottom of plot. */
  yMin: number;
  /** Padded scale ceiling (% change) — top of plot. */
  yMax: number;
  /** Raw min/max % change across all sectors (before padding). */
  dataMin: number;
  dataMax: number;
  scaleMode: LaborSectorScaleMode;
  /** True when any sector moved above and below period start in the window. */
  dataCrossesZero: boolean;
  /** 0% line Y in SVG coords; only when {@link dataCrossesZero}. */
  baselineY: number | null;
  /** Distance from 0% to plot bottom as fraction of inner height (0–1). */
  zeroLineRatioFromBottom: number | null;
  yTicks: LaborSectorYTick[];
  gridLineYs: number[];
  lines: LaborSectorLineSeries[];
  xTicks: LaborSectorXTick[];
  periodRangeLabel: string;
  /** Single-line context above the chart (minimal copy). */
  chartSubtitle: string;
};

const CHART_H = 228;
const Y_AXIS_W = 44;
const PAD_X = 6;
const PAD_TOP = 12;
const PAD_BOTTOM = 8;
const PLOT_GAP = 4;
/** Padding above max / below min % change (fraction of span, floor in pct points). */
const Y_PAD_RATIO = 0.1;
const Y_PAD_MIN_PCT = 0.2;

function formatMonthShort(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const d = new Date(parts[0], parts[1] - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  }
  return isoDate;
}

function formatMonthYear(isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  if (parts.length >= 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const d = new Date(parts[0], parts[1] - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return isoDate;
}

function numericPoints(
  series: EconomySectorResponse["series"][number],
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  for (const p of series.points) {
    if (p.value != null && Number.isFinite(p.value)) {
      out.push({ date: p.date, value: p.value });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function commonTimeline(response: EconomySectorResponse): string[] {
  const dateSets: Set<string>[] = [];
  for (const s of response.series) {
    if (excludeFromLaborSectorBreakdown(s)) {
      continue;
    }
    if (s.error) {
      continue;
    }
    const pts = numericPoints(s);
    if (pts.length >= 2) {
      dateSets.push(new Set(pts.map((p) => p.date)));
    }
  }
  if (dateSets.length === 0) {
    return [];
  }
  let intersection = dateSets[0]!;
  for (let i = 1; i < dateSets.length; i += 1) {
    const next = dateSets[i]!;
    intersection = new Set(
      [...intersection].filter((date) => next.has(date)),
    );
  }
  return [...intersection].sort((a, b) => a.localeCompare(b));
}

/** % change from first month; first point is always 0. */
function pctChangeFromStartSeries(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const base = values[0]!;
  if (base === 0) {
    return values.map(() => 0);
  }
  return values.map((v) => ((v / base) - 1) * 100);
}

function pctToY(
  pct: number,
  yMin: number,
  yMax: number,
  innerH: number,
  padTop: number,
): number {
  const norm = (pct - yMin) / (yMax - yMin);
  return padTop + (1 - norm) * innerH;
}

function buildPolylinePoints(
  pctSeries: readonly number[],
  yMin: number,
  yMax: number,
  innerW: number,
  innerH: number,
  padX: number,
  padTop: number,
): { points: string; endDot: { cx: number; cy: number } } {
  const n = pctSeries.length;
  if (n === 0) {
    return { points: "", endDot: { cx: 0, cy: 0 } };
  }
  const step = innerW / Math.max(n - 1, 1);
  const segments: string[] = [];
  let lastX = padX;
  let lastY = padTop;
  for (let i = 0; i < n; i += 1) {
    const x = padX + i * step;
    const y = pctToY(pctSeries[i]!, yMin, yMax, innerH, padTop);
    segments.push(`${x},${y}`);
    lastX = x;
    lastY = y;
  }
  return {
    points: segments.join(" "),
    endDot: { cx: lastX, cy: lastY },
  };
}

/** Closed path: line vertices, then baseline edge back to the first point. */
function buildAreaPolygonPoints(
  pctSeries: readonly number[],
  yMin: number,
  yMax: number,
  innerW: number,
  innerH: number,
  padX: number,
  padTop: number,
  fillBaselineY: number,
): string {
  const n = pctSeries.length;
  if (n === 0) {
    return "";
  }
  const step = innerW / Math.max(n - 1, 1);
  const top: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = padX + i * step;
    const y = pctToY(pctSeries[i]!, yMin, yMax, innerH, padTop);
    top.push(`${x},${y}`);
  }
  const firstX = padX;
  const lastX = padX + (n - 1) * step;
  return [...top, `${lastX},${fillBaselineY}`, `${firstX},${fillBaselineY}`].join(
    " ",
  );
}

function pickNiceStep(span: number): number {
  if (span <= 0.75) {
    return 0.25;
  }
  if (span <= 1.5) {
    return 0.5;
  }
  if (span <= 4) {
    return 1;
  }
  if (span <= 10) {
    return 2;
  }
  if (span <= 20) {
    return 5;
  }
  return 10;
}

/** Format % for axis and legend, e.g. `0%`, `+1.2%`, `-0.5%`. */
export function formatSectorPctChange(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) {
    return "0%";
  }
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

function buildYTicks(
  yMin: number,
  yMax: number,
  innerH: number,
  padTop: number,
  dataCrossesZero: boolean,
): LaborSectorYTick[] {
  const step = pickNiceStep(yMax - yMin);
  const values = new Set<number>([yMin, yMax]);
  let v = Math.ceil(yMin / step) * step;
  while (v <= yMax + step * 0.001) {
    if (v >= yMin - step * 0.001 && v <= yMax + step * 0.001) {
      values.add(Math.round(v * 100) / 100);
    }
    v += step;
  }
  if (dataCrossesZero) {
    values.add(0);
  }

  return [...values]
    .sort((a, b) => b - a)
    .map((pctValue) => {
      const isBound =
        Math.abs(pctValue - yMin) < 0.06 || Math.abs(pctValue - yMax) < 0.06;
      return {
        pctValue,
        label: formatSectorPctChange(pctValue),
        y: pctToY(pctValue, yMin, yMax, innerH, padTop),
        emphasis: dataCrossesZero && pctValue === 0,
        bound: isBound,
      };
    });
}

function scaleModeFromData(dataMin: number, dataMax: number): LaborSectorScaleMode {
  if (dataMin < 0 && dataMax > 0) {
    return "mixed";
  }
  if (dataMin >= 0) {
    return "positive-only";
  }
  return "negative-only";
}

function buildChartSubtitle(
  periodRangeLabel: string,
  dataCrossesZero: boolean,
): string {
  if (dataCrossesZero) {
    return `${periodRangeLabel} · dashed = unchanged`;
  }
  return periodRangeLabel;
}

function buildXTicks(
  dates: string[],
  innerW: number,
  padX: number,
): LaborSectorXTick[] {
  const n = dates.length;
  if (n === 0) {
    return [];
  }
  const step = innerW / Math.max(n - 1, 1);
  const stride = n <= 12 ? 1 : 2;
  const ticks: LaborSectorXTick[] = [];
  for (let i = 0; i < n; i += stride) {
    ticks.push({
      label: formatMonthShort(dates[i]!),
      x: padX + i * step,
    });
  }
  if ((n - 1) % stride !== 0) {
    ticks.push({
      label: formatMonthShort(dates[n - 1]!),
      x: padX + (n - 1) * step,
    });
  }
  return ticks;
}

function periodRangeLabel(
  response: EconomySectorResponse,
  timeline: string[],
): string {
  if (response.startDate && response.endDate) {
    const start = response.startDate.slice(0, 10);
    const end = response.endDate.slice(0, 10);
    return `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
  }
  if (timeline.length >= 2) {
    return `${formatMonthYear(timeline[0]!)} – ${formatMonthYear(timeline[timeline.length - 1]!)}`;
  }
  return "Trailing 12 months";
}

/**
 * Multi-series line chart: % change in employment vs period start (0% = first month).
 * Y-axis spans min–max % change across sectors, with padding for headroom.
 */
export function buildLaborSectorLineChartModel(
  response: EconomySectorResponse,
  width: number,
): LaborSectorLineChartModel | null {
  const timeline = commonTimeline(response);
  if (timeline.length < 2) {
    return null;
  }

  const yAxisWidth = Y_AXIS_W;
  const plotSvgWidth = Math.max(width - yAxisWidth - PLOT_GAP, 140);
  const innerW = Math.max(plotSvgWidth - PAD_X * 2, 100);
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;

  type SeriesScratch = {
    id: string;
    label: string;
    color: string;
    pctChange: number[];
  };

  const scratches: SeriesScratch[] = [];
  let colorIdx = 0;

  for (const series of response.series) {
    if (excludeFromLaborSectorBreakdown(series)) {
      continue;
    }
    if (series.error) {
      continue;
    }
    const points = numericPoints(series);
    if (points.length < 2) {
      continue;
    }
    const byDate = new Map(points.map((p) => [p.date, p.value]));
    const values = timeline.map((date) => byDate.get(date));
    if (values.some((v) => v === undefined)) {
      continue;
    }
    const seriesValues = values as number[];
    if (seriesValues.length < 2) {
      continue;
    }
    scratches.push({
      id: series.id,
      label: laborSectorDisplayName(series),
      color: LABOR_SECTOR_LINE_COLORS[colorIdx % LABOR_SECTOR_LINE_COLORS.length]!,
      pctChange: pctChangeFromStartSeries(seriesValues),
    });
    colorIdx += 1;
  }

  if (scratches.length === 0) {
    return null;
  }

  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (const s of scratches) {
    for (const v of s.pctChange) {
      dataMin = Math.min(dataMin, v);
      dataMax = Math.max(dataMax, v);
    }
  }
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return null;
  }

  const span = dataMax - dataMin;
  const padding = Math.max(span * Y_PAD_RATIO, Y_PAD_MIN_PCT);
  let yMin = dataMin - padding;
  let yMax = dataMax + padding;
  if (yMin === yMax) {
    yMin -= 0.5;
    yMax += 0.5;
  }

  const dataCrossesZero = dataMin < 0 && dataMax > 0;
  const scaleMode = scaleModeFromData(dataMin, dataMax);

  const yTicks = buildYTicks(yMin, yMax, innerH, PAD_TOP, dataCrossesZero);
  const gridLineYs = yTicks.map((t) => t.y);
  const baselineY = dataCrossesZero
    ? pctToY(0, yMin, yMax, innerH, PAD_TOP)
    : null;
  const zeroLineRatioFromBottom = dataCrossesZero
    ? (0 - yMin) / (yMax - yMin)
    : null;

  const usedLen = scratches[0]!.pctChange.length;
  const plotTimeline = timeline.slice(0, usedLen);

  const fillBaselineY = dataCrossesZero
    ? pctToY(0, yMin, yMax, innerH, PAD_TOP)
    : PAD_TOP + innerH;

  const lines: LaborSectorLineSeries[] = scratches
    .map((s) => {
      const { points, endDot } = buildPolylinePoints(
        s.pctChange,
        yMin,
        yMax,
        innerW,
        innerH,
        PAD_X,
        PAD_TOP,
      );
      const areaPolygonPoints = buildAreaPolygonPoints(
        s.pctChange,
        yMin,
        yMax,
        innerW,
        innerH,
        PAD_X,
        PAD_TOP,
        fillBaselineY,
      );
      const latestPctChange = s.pctChange[s.pctChange.length - 1]!;
      return {
        id: s.id,
        label: s.label,
        color: s.color,
        polylinePoints: points,
        areaPolygonPoints,
        pctChange: s.pctChange,
        latestPctChange,
        endDot,
      };
    })
    // Draw back → front: largest |% change| first, lines nearest 0% on top.
    .sort((a, b) => Math.abs(b.latestPctChange) - Math.abs(a.latestPctChange));

  return {
    totalWidth: width,
    yAxisWidth,
    plotSvgWidth,
    chartHeight: CHART_H,
    padX: PAD_X,
    padTop: PAD_TOP,
    padBottom: PAD_BOTTOM,
    innerW,
    innerH,
    yMin,
    yMax,
    dataMin,
    dataMax,
    scaleMode,
    dataCrossesZero,
    baselineY,
    zeroLineRatioFromBottom,
    yTicks,
    gridLineYs,
    lines,
    xTicks: buildXTicks(plotTimeline, innerW, PAD_X),
    periodRangeLabel: periodRangeLabel(response, plotTimeline),
    chartSubtitle: buildChartSubtitle(
      periodRangeLabel(response, plotTimeline),
      dataCrossesZero,
    ),
  };
}

/** @deprecated Use {@link formatSectorPctChange}. */
export function formatSectorIndexChange(changePts: number): string {
  return formatSectorPctChange(changePts);
}
