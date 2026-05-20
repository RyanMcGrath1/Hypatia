import type { EconomySectorSeries } from "@/hooks/api/economySectorApi";
import type { LaborEarningsInflationResponse } from "@/hooks/api/economyLaborEarningsInflationApi";
import { formatSectorPctChange } from "@/lib/economy/laborSectorLineChartModel";

export const LABOR_AHE_SERIES_ID = "CES0500000003";
export const LABOR_CPI_SERIES_ID = "CPIAUCSL";

export type WagesInflationSideView = {
  valueLabel: string;
  deltaPositive: boolean | null;
  unavailable: boolean;
};

export type WagesInflationCardView = {
  wages: WagesInflationSideView;
  inflation: WagesInflationSideView;
  footerNote: string;
};

function findSeries(
  response: LaborEarningsInflationResponse,
  id: string,
): EconomySectorSeries | undefined {
  return (
    response.series.find((s) => s.id === id) ??
    (response.sectors[id]
      ? {
          id,
          name: response.sectors[id]!.name,
          points: response.sectors[id]!.observations,
          error: response.sectors[id]!.error,
        }
      : undefined)
  );
}

/** YoY % from level series: latest print vs same calendar month one year earlier. */
export function yoyPercentFromLevelSeries(
  series: EconomySectorSeries | undefined,
): number | null {
  if (!series || series.error) {
    return null;
  }
  const numeric = series.points
    .filter(
      (p): p is { date: string; value: number } =>
        p.value != null && Number.isFinite(p.value),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (numeric.length === 0) {
    return null;
  }
  const latest = numeric[numeric.length - 1]!;
  const latestDate = new Date(`${latest.date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(latestDate.getTime())) {
    return null;
  }
  const priorKey = `${latestDate.getUTCFullYear() - 1}-${String(
    latestDate.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
  let prior = numeric.find((p) => p.date.slice(0, 7) === priorKey);
  if (!prior) {
    const cutoff = new Date(latestDate);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 11);
    const cutoffIso = cutoff.toISOString().slice(0, 10);
    const candidates = numeric.filter((p) => p.date.slice(0, 10) <= cutoffIso);
    prior = candidates[candidates.length - 1];
  }
  if (!prior || prior.value === 0) {
    return null;
  }
  return ((latest.value - prior.value) / Math.abs(prior.value)) * 100;
}

function sideView(
  series: EconomySectorSeries | undefined,
  fallbackName: string,
): WagesInflationSideView {
  if (series?.error) {
    return {
      valueLabel: "Unavailable",
      deltaPositive: null,
      unavailable: true,
    };
  }
  const yoy = yoyPercentFromLevelSeries(series);
  if (yoy == null) {
    return {
      valueLabel: "—",
      deltaPositive: null,
      unavailable: true,
    };
  }
  return {
    valueLabel: formatSectorPctChange(yoy),
    deltaPositive: yoy > 0 ? true : yoy < 0 ? false : null,
    unavailable: false,
  };
}

function formatMonthYearShort(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return iso.slice(0, 10);
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function footerNoteFromResponse(
  response: LaborEarningsInflationResponse | null,
  wages: WagesInflationSideView,
  inflation: WagesInflationSideView,
): string {
  if (!response?.startDate || !response.endDate) {
    if (wages.unavailable && inflation.unavailable) {
      return "Earnings and CPI data unavailable for this window.";
    }
    return "Year-over-year change vs. the same month one year ago.";
  }
  const a = formatMonthYearShort(response.startDate);
  const b = formatMonthYearShort(response.endDate);
  return `YoY vs. prior year · window ${a} – ${b}`;
}

export function wagesInflationCardFromApi(
  response: LaborEarningsInflationResponse | null,
): WagesInflationCardView {
  const wagesSeries = response
    ? findSeries(response, LABOR_AHE_SERIES_ID)
    : undefined;
  const cpiSeries = response ? findSeries(response, LABOR_CPI_SERIES_ID) : undefined;

  const wages = sideView(wagesSeries, "Average Hourly Earnings");
  const inflation = sideView(cpiSeries, "CPI Inflation");

  return {
    wages,
    inflation,
    footerNote: footerNoteFromResponse(response, wages, inflation),
  };
}
