import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";
import { laborSectorAbbrev } from "@/lib/economy/laborSectorAbbrev";
import { laborSectorDisplayName } from "@/lib/economy/laborSectorDisplayName";
import {
  deriveLaborSectorBreakdown,
  formatLaborSectorDeltaThousands,
  formatLaborSectorGrowthPercent,
  laborSectorNumericPoints,
  laborSectorPeriodRangeLabel,
  periodGrowthPctSeries,
} from "@/lib/economy/sectorRowsFromApi";

export type LaborSectorHeatmapTile = {
  id: string;
  abbrev: string;
  name: string;
  /** Period growth % (first → last observation in the filtered window). */
  pctChange: number | null;
  pctLabel: string;
  backgroundColor: string;
  labelColor: string;
  unavailable: boolean;
  delta: string;
  deltaPositive: boolean | null;
  growth: string;
  growthPositive: boolean | null;
  /** Normalized 0–1 values for sparkline (% vs. period start). */
  sparklineNorm: number[];
};

export type LaborSectorHeatmapModel = {
  tiles: LaborSectorHeatmapTile[];
  periodRangeLabel: string;
  subtitle: string;
  legendLowLabel: string;
  legendHighLabel: string;
  defaultSelectedId: string | null;
};

const BLUE_LOW = "#E8EEFF";
const BLUE_HIGH = "#264dd9";
const RED_LOW = "#FDE8E8";
const RED_HIGH = "#C62828";
const NEUTRAL_TILE = "#EEF1F8";
const NEUTRAL_TEXT = "#444655";

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a: string, b: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const bl = Math.round(b1 + (b2 - b1) * clamped);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function tileColors(
  pct: number,
  maxPositive: number,
  maxNegative: number,
): { backgroundColor: string; labelColor: string } {
  if (pct === 0) {
    return { backgroundColor: NEUTRAL_TILE, labelColor: NEUTRAL_TEXT };
  }
  if (pct > 0) {
    const t = maxPositive > 0 ? pct / maxPositive : 1;
    const backgroundColor = lerpColor(BLUE_LOW, BLUE_HIGH, t);
    return {
      backgroundColor,
      labelColor: t >= 0.45 ? "#FFFFFF" : NEUTRAL_TEXT,
    };
  }
  const t = maxNegative < 0 ? pct / maxNegative : 1;
  const backgroundColor = lerpColor(RED_LOW, RED_HIGH, t);
  return {
    backgroundColor,
    labelColor: t >= 0.45 ? "#FFFFFF" : NEUTRAL_TEXT,
  };
}

function normalizeSparkline(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return [];
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  return finite.map((v) => (v - min) / span);
}

function periodSparklineNorm(seriesId: string, response: EconomySectorResponse): number[] {
  const fromSeries = response.series.find((s) => s.id === seriesId);
  if (!fromSeries) {
    return [];
  }
  const values = laborSectorNumericPoints(fromSeries, {
    startDate: response.startDate,
    endDate: response.endDate,
  }).map((p) => p.value);
  return normalizeSparkline(periodGrowthPctSeries(values));
}

export function buildLaborSectorHeatmapModel(
  response: EconomySectorResponse,
): LaborSectorHeatmapModel | null {
  const derived = deriveLaborSectorBreakdown(response);
  if (derived.length === 0) {
    return null;
  }

  const numericGrowth = derived
    .map((r) => r.growthPct)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const maxPositive =
    numericGrowth.length > 0 ? Math.max(0, ...numericGrowth) : 0;
  const maxNegative =
    numericGrowth.length > 0 ? Math.min(0, ...numericGrowth) : 0;

  const tiles: LaborSectorHeatmapTile[] = derived.map((row) => {
    const name = laborSectorDisplayName(row.series);
    const unavailable = row.error != null;
    const pctChange =
      unavailable || row.growthPct == null ? null : row.growthPct;
    const colors =
      pctChange == null
        ? { backgroundColor: NEUTRAL_TILE, labelColor: NEUTRAL_TEXT }
        : tileColors(pctChange, maxPositive, maxNegative);

    const deltaPositive =
      row.deltaThousands == null
        ? null
        : row.deltaThousands > 0
          ? true
          : row.deltaThousands < 0
            ? false
            : null;

    return {
      id: row.series.id,
      abbrev: laborSectorAbbrev(row.series),
      name,
      pctChange,
      pctLabel:
        pctChange == null
          ? "—"
          : formatLaborSectorGrowthPercent(pctChange),
      ...colors,
      unavailable,
      delta:
        unavailable
          ? "Unavailable"
          : row.deltaThousands == null
            ? "—"
            : formatLaborSectorDeltaThousands(row.deltaThousands),
      deltaPositive,
      growth:
        unavailable || row.growthPct == null
          ? "—"
          : formatLaborSectorGrowthPercent(row.growthPct),
      growthPositive: deltaPositive,
      sparklineNorm: periodSparklineNorm(row.series.id, response),
    };
  });

  tiles.sort((a, b) => {
    const av = a.pctChange ?? -Infinity;
    const bv = b.pctChange ?? -Infinity;
    return bv - av;
  });

  const best = tiles.find((t) => t.pctChange != null && !t.unavailable);
  const periodRangeLabel = laborSectorPeriodRangeLabel(response);

  return {
    tiles,
    periodRangeLabel,
    subtitle: periodRangeLabel
      ? `Net payroll change over selected period · ${periodRangeLabel}`
      : "Net payroll change over the selected period.",
    legendLowLabel: "Weaker period",
    legendHighLabel: "Stronger period",
    defaultSelectedId: best?.id ?? tiles[0]?.id ?? null,
  };
}

export function heatmapFocusLine(pctChange: number | null): string {
  if (pctChange == null) {
    return "Focused view";
  }
  if (pctChange >= 1.5) {
    return "Focused view: strong hiring over period";
  }
  if (pctChange > 0.2) {
    return "Focused view: net job gains over period";
  }
  if (pctChange <= -1.5) {
    return "Focused view: sharp pullback over period";
  }
  if (pctChange < -0.2) {
    return "Focused view: net job losses over period";
  }
  return "Focused view: flat over period";
}
