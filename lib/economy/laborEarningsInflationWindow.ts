import type { LaborEarningsInflationFetchParams } from "@/hooks/api/economyLaborEarningsInflationApi";
import { formatMonthYearShortDisplay } from "@/lib/economy/payrollMonthRange";

export type PayrollObservationWindow = {
  observationStart: string;
  observationEnd: string;
};

/** Same `observation_start` / `observation_end` as the payroll range filter. */
export function laborEarningsInflationFetchWindow(
  payroll: PayrollObservationWindow,
): LaborEarningsInflationFetchParams {
  const observationStart = payroll.observationStart.trim().slice(0, 10);
  const observationEnd = payroll.observationEnd.trim().slice(0, 10);
  return {
    observationStart: observationStart || undefined,
    observationEnd: observationEnd || undefined,
  };
}

export function wagesInflationPeriodLabel(
  payroll: PayrollObservationWindow,
): string {
  const a = formatMonthYearShortDisplay(payroll.observationStart);
  const b = formatMonthYearShortDisplay(payroll.observationEnd);
  if (!a && !b) {
    return "—";
  }
  if (a && b) {
    return `${a} – ${b}`;
  }
  return a || b;
}
