import type { GdpGrowthRateResponse } from "@/hooks/api/economyGdpGrowthRateApi";

/** Recent quarters shown in the GDP growth sparkline. */
export const GDP_GROWTH_SPARK_QUARTERS = 8;

export type GdpGrowthSparkLabel = {
  label: string;
  /** Horizontal position along the chart, 0 = oldest point, 1 = newest. */
  position: number;
};

export type GdpGrowthViewModel = {
  valueLabel: string;
  subtitle: string;
  sparkValues: number[];
  sparkLabels: GdpGrowthSparkLabel[];
};

function formatSignedPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** FRED quarterly GDP dates use the first day of the quarter (Jan/Apr/Jul/Oct). */
export function quarterLabelFromDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(isoDate.trim());
  if (!match) {
    return isoDate;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const quarter = Math.floor((month - 1) / 3) + 1;
  const shortYear = String(year % 100).padStart(2, "0");
  return `Q${quarter} '${shortYear}`;
}

/** Map growth rates to 0–1 SVG coordinates; 0% is anchored when it falls in range. */
export function scaleSparkValues(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  if (values.length === 1) {
    return [0.5];
  }
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 0);
  const pad = 0.75;
  const min = minVal - pad;
  const max = maxVal + pad;
  const range = max - min || 1;
  return values.map((value) => 1 - (value - min) / range);
}

export function buildSparkLabels(dates: string[], count = 4): GdpGrowthSparkLabel[] {
  if (dates.length === 0) {
    return [];
  }
  if (dates.length === 1) {
    return [{ label: quarterLabelFromDate(dates[0]!), position: 0.5 }];
  }

  const labelCount = Math.min(count, dates.length);
  const lastIndex = dates.length - 1;
  const seen = new Set<number>();
  const labels: GdpGrowthSparkLabel[] = [];

  for (let i = 0; i < labelCount; i += 1) {
    const index =
      labelCount === 1 ? 0 : Math.round((i * lastIndex) / (labelCount - 1));
    if (seen.has(index)) {
      continue;
    }
    seen.add(index);
    labels.push({
      label: quarterLabelFromDate(dates[index]!),
      position: index / lastIndex,
    });
  }

  return labels;
}

/** Map API payload into hero + sparkline inputs for the GDP growth widget. */
export function gdpGrowthFromApi(api: GdpGrowthRateResponse | null): GdpGrowthViewModel {
  const chronological = [...(api?.observations ?? [])].reverse();
  const sparkSeries = chronological.slice(-GDP_GROWTH_SPARK_QUARTERS);
  const rawValues = sparkSeries.map((row) => row.value);
  const sparkValues = scaleSparkValues(rawValues);
  const sparkLabels = buildSparkLabels(sparkSeries.map((row) => row.date));

  const latestQuarter =
    api?.observation_date != null ? quarterLabelFromDate(api.observation_date) : null;

  return {
    valueLabel: formatSignedPct(api?.value),
    subtitle: latestQuarter
      ? `Quarter-over-Quarter (${latestQuarter})`
      : "Quarter-over-Quarter",
    sparkValues,
    sparkLabels,
  };
}
