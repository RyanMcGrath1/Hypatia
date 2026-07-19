import type { RatesKeyMetricsResponse } from "@/hooks/api/economyRatesKeyMetricsApi";
import { getEconomicSectorById } from "@/constants/data/usEconomicData";

export type RatesKeyMetricRow = {
  key: string;
  label: string;
  valueLabel: string;
  note: string;
};

export type RatesKeyMetricsViewModel = {
  metrics: RatesKeyMetricRow[];
};

function formatRatePercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function placeholderMetrics(): RatesKeyMetricRow[] {
  const sector = getEconomicSectorById("rates");
  return (sector?.metrics ?? []).map((metric) => ({
    key: metric.label,
    label: metric.label,
    valueLabel: "—",
    note: metric.note,
  }));
}

/** Map API payload into KEY METRICS rows for the rates detail widget. */
export function ratesKeyMetricsFromApi(
  api: RatesKeyMetricsResponse | null,
): RatesKeyMetricsViewModel {
  if (!api?.metrics?.length) {
    return { metrics: placeholderMetrics() };
  }

  return {
    metrics: api.metrics.map((metric) => ({
      key: metric.series_id,
      label: metric.label,
      valueLabel:
        metric.value != null && Number.isFinite(metric.value)
          ? formatRatePercent(metric.value)
          : "—",
      note: metric.note,
    })),
  };
}
