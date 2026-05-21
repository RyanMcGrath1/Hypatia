import type { EconomySectorSeries } from "@/hooks/api/economySectorApi";
import type { LaborEarningsInflationResponse } from "@/hooks/api/economyLaborEarningsInflationApi";
import { formatSectorPctChange } from "@/lib/economy/laborSectorLineChartModel";
import type { PayrollObservationWindow } from "@/lib/economy/laborEarningsInflationWindow";
import { wagesInflationPeriodLabel } from "@/lib/economy/laborEarningsInflationWindow";

export const LABOR_AHE_SERIES_ID = "CES0500000003";
export const LABOR_CPI_SERIES_ID = "CPIAUCSL";

export type WagesInflationDisplayWindow = PayrollObservationWindow;

export type WagesInflationSideView = {
  valueLabel: string;
  deltaPositive: boolean | null;
  unavailable: boolean;
};

export type WagesInflationCardView = {
  wages: WagesInflationSideView;
  inflation: WagesInflationSideView;
  footerNote: string;
  periodLabel: string;
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

function numericPointsInWindow(
  series: EconomySectorSeries,
  window: WagesInflationDisplayWindow,
): { date: string; value: number }[] {
  const startKey = window.observationStart.trim().slice(0, 10);
  const endKey = window.observationEnd.trim().slice(0, 10);
  const numeric: { date: string; value: number }[] = [];
  for (const p of series.points) {
    if (p.value == null || !Number.isFinite(p.value)) {
      continue;
    }
    const d = p.date.slice(0, 10);
    if (startKey && d < startKey) {
      continue;
    }
    if (endKey && d > endKey) {
      continue;
    }
    numeric.push({ date: p.date, value: p.value });
  }
  numeric.sort((a, b) => a.date.localeCompare(b.date));
  return numeric;
}

/** % change from first to last level in the payroll filter window. */
export function periodPercentFromLevelSeries(
  series: EconomySectorSeries | undefined,
  window: WagesInflationDisplayWindow,
): number | null {
  if (!series || series.error) {
    return null;
  }
  const numeric = numericPointsInWindow(series, window);
  if (numeric.length < 2) {
    return null;
  }
  const start = numeric[0]!;
  const end = numeric[numeric.length - 1]!;
  if (start.value === 0) {
    return null;
  }
  return ((end.value - start.value) / Math.abs(start.value)) * 100;
}

function sideView(
  series: EconomySectorSeries | undefined,
  window: WagesInflationDisplayWindow,
): WagesInflationSideView {
  if (series?.error) {
    return {
      valueLabel: "Unavailable",
      deltaPositive: null,
      unavailable: true,
    };
  }
  const pct = periodPercentFromLevelSeries(series, window);
  if (pct == null) {
    return {
      valueLabel: "—",
      deltaPositive: null,
      unavailable: true,
    };
  }
  return {
    valueLabel: formatSectorPctChange(pct),
    deltaPositive: pct > 0 ? true : pct < 0 ? false : null,
    unavailable: false,
  };
}

function footerNoteFromWindow(
  window: WagesInflationDisplayWindow,
  wages: WagesInflationSideView,
  inflation: WagesInflationSideView,
): string {
  const period = wagesInflationPeriodLabel(window);
  if (wages.unavailable && inflation.unavailable) {
    return period
      ? `No earnings or CPI data in ${period}.`
      : "Earnings and CPI data unavailable for this range.";
  }
  return period
    ? `Change vs. start of selected period · ${period}`
    : "Change vs. start of selected period.";
}

export function wagesInflationCardFromApi(
  response: LaborEarningsInflationResponse | null,
  window: WagesInflationDisplayWindow,
): WagesInflationCardView {
  const wagesSeries = response
    ? findSeries(response, LABOR_AHE_SERIES_ID)
    : undefined;
  const cpiSeries = response ? findSeries(response, LABOR_CPI_SERIES_ID) : undefined;

  const wages = sideView(wagesSeries, window);
  const inflation = sideView(cpiSeries, window);

  return {
    wages,
    inflation,
    footerNote: footerNoteFromWindow(window, wages, inflation),
    periodLabel: wagesInflationPeriodLabel(window),
  };
}

