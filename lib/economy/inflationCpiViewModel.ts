import type {
  EconomyCpiObservation,
  EconomyCpiResponse,
} from "@/hooks/api/economyCpiApi";
import { formatSectorPctChange } from "@/lib/economy/laborSectorLineChartModel";
import { formatMonthYearShortDisplay } from "@/lib/economy/payrollMonthRange";

export type InflationCpiLastSegmentDelta = {
  pct: number | null;
  previousMonthLabel: string;
  latestMonthLabel: string;
  trendsUp: boolean | null;
  label: string;
};

export type InflationCpiHeadlineView = {
  valueLabel: string;
  periodLabel: string;
  lastSegmentDelta: InflationCpiLastSegmentDelta;
  unavailable: boolean;
  observations: EconomyCpiObservation[];
};

/** Short month label used on the CPI chart x-axis, e.g. `MAY 26`. */
export function formatCpiChartMonthLabel(dateString: string): string {
  const [yearString, monthString] = dateString.split("-");

  const year = Number(yearString);
  const month = Number(monthString);

  const monthLabels = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return dateString;
  }

  return `${monthLabels[month - 1]} ${String(year).slice(-2)}`;
}

/** Chronological order (oldest → newest) for charting and period math. */
export function sortCpiObservationsChronological(
  observations: EconomyCpiObservation[],
): EconomyCpiObservation[] {
  return [...observations]
    .filter(
      (observation) =>
        typeof observation.date === "string" &&
        typeof observation.value === "number" &&
        Number.isFinite(observation.value),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** % change from first to last CPI index level in the series window. */
export function periodPercentFromCpiObservations(
  observations: EconomyCpiObservation[],
): number | null {
  const sorted = sortCpiObservationsChronological(observations);
  if (sorted.length < 2) {
    return null;
  }
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (first.value === 0) {
    return null;
  }
  return ((last.value - first.value) / Math.abs(first.value)) * 100;
}

/**
 * % change for the chart's final line segment (second-to-last → last point).
 * This is the same movement shown by the rightmost slope on the graph.
 */
export function lastSegmentDeltaFromCpiObservations(
  observations: EconomyCpiObservation[],
): InflationCpiLastSegmentDelta {
  const sorted = sortCpiObservationsChronological(observations);
  if (sorted.length < 2) {
    return {
      pct: null,
      previousMonthLabel: "",
      latestMonthLabel: "",
      trendsUp: null,
      label: "",
    };
  }

  const previous = sorted[sorted.length - 2]!;
  const latest = sorted[sorted.length - 1]!;
  const previousMonthLabel = formatCpiChartMonthLabel(previous.date);
  const latestMonthLabel = formatCpiChartMonthLabel(latest.date);

  if (previous.value === 0) {
    return {
      pct: null,
      previousMonthLabel,
      latestMonthLabel,
      trendsUp: null,
      label: "",
    };
  }

  const pct =
    ((latest.value - previous.value) / Math.abs(previous.value)) * 100;

  return {
    pct,
    previousMonthLabel,
    latestMonthLabel,
    trendsUp: pct > 0 ? true : pct < 0 ? false : null,
    label:
      previousMonthLabel !== ""
        ? `${formatSectorPctChange(pct)} VS ${previousMonthLabel}`
        : `${formatSectorPctChange(pct)} FROM PREV`,
  };
}

/** @deprecated Use {@link lastSegmentDeltaFromCpiObservations}. */
export function momPercentFromCpiObservations(
  observations: EconomyCpiObservation[],
): number | null {
  return lastSegmentDeltaFromCpiObservations(observations).pct;
}

function cpiPeriodLabel(observations: EconomyCpiObservation[]): string {
  const sorted = sortCpiObservationsChronological(observations);
  if (sorted.length === 0) {
    return "";
  }
  const start = formatMonthYearShortDisplay(sorted[0]!.date);
  const end = formatMonthYearShortDisplay(sorted[sorted.length - 1]!.date);
  if (!start && !end) {
    return "";
  }
  if (start && end && start !== end) {
    return `${start} – ${end}`;
  }
  return start || end;
}

const EMPTY_LAST_SEGMENT: InflationCpiLastSegmentDelta = {
  pct: null,
  previousMonthLabel: "",
  latestMonthLabel: "",
  trendsUp: null,
  label: "",
};

export function inflationCpiHeadlineFromApi(
  response: EconomyCpiResponse | null,
): InflationCpiHeadlineView {
  if (!response || response.observations.length === 0) {
    return {
      valueLabel: "—",
      periodLabel: "",
      lastSegmentDelta: EMPTY_LAST_SEGMENT,
      unavailable: true,
      observations: [],
    };
  }

  const observations = sortCpiObservationsChronological(response.observations);
  const periodPct = periodPercentFromCpiObservations(observations);
  const lastSegmentDelta = lastSegmentDeltaFromCpiObservations(observations);

  return {
    valueLabel: periodPct != null ? formatSectorPctChange(periodPct) : "—",
    periodLabel: cpiPeriodLabel(observations),
    lastSegmentDelta,
    unavailable: periodPct == null,
    observations,
  };
}
