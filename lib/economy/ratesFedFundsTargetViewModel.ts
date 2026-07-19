import type { RatesFedFundsTargetResponse } from "@/hooks/api/economyRatesFedFundsTargetApi";

export type RatesFedFundsTargetViewModel = {
  headlineValueLabel: string;
  observationDateLabel: string | null;
};

/** Format one bound of the FOMC target range for display. */
export function formatFedFundsTargetRate(value: number): string {
  return `${value.toFixed(2)}%`;
}

/** Format lower–upper target range, e.g. `3.50% - 3.75%`. */
export function formatFedFundsTargetRange(lower: number, upper: number): string {
  return `${formatFedFundsTargetRate(lower)} - ${formatFedFundsTargetRate(upper)}`;
}

function formatObservationDate(isoDate: string): string | null {
  const parts = isoDate.split("-").map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  const [year, month, day] = parts;
  const d = new Date(year!, month! - 1, day!);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Map API payload into hero-card copy for the rates detail widget. */
export function ratesFedFundsTargetFromApi(
  api: RatesFedFundsTargetResponse | null,
): RatesFedFundsTargetViewModel {
  if (
    api?.target_lower != null &&
    api?.target_upper != null &&
    Number.isFinite(api.target_lower) &&
    Number.isFinite(api.target_upper)
  ) {
    return {
      headlineValueLabel: formatFedFundsTargetRange(api.target_lower, api.target_upper),
      observationDateLabel: api.observation_date
        ? formatObservationDate(api.observation_date)
        : null,
    };
  }

  return {
    headlineValueLabel: "—",
    observationDateLabel: null,
  };
}
