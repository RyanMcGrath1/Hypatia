import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildPayrollAxisFromChart,
  buildPayrollHeroDisplay,
  isAbortError,
} from "@/components/economy/detail/labor/laborMarketPayrollChart";
import type {
  PayrollRangeCommitPayload,
  PayrollRangeFilterCloseReason,
} from "@/components/economy/detail/labor/PayrollRangeFilterModal";
import {
  buildPayrollChartFromFredObservations,
  computeCalendarYearPayrollNetLevelDeltaThousands,
  computeDisplayedChartNetLevelDeltaThousands,
} from "@/components/economy/detail/labor/payrollChartFromFred";
import {
  FredObservationsError,
  getFredObservations,
  type FredObservationRow,
} from "@/hooks/api/fredObservations";
import {
  formatMonthYearShortDisplay,
  monthKeyFromObservationDate,
  payrollDefaultSeriesLastMonthKeyUtc,
  payrollDefaultYtdBoundsUtc,
  payrollFredObservationFetchLimit,
} from "@/lib/economy/payrollMonthRange";

export type LaborMarketPayrollHeroTheme = {
  mutedText: string;
  green: string;
  danger: string;
};

export function useLaborMarketPayrollSection(heroTheme: LaborMarketPayrollHeroTheme) {
  const { mutedText, green, danger } = heroTheme;

  const [payrollFetchWindow, setPayrollFetchWindow] = useState(payrollDefaultYtdBoundsUtc);

  const [payrollSeriesLatestMonthKey, setPayrollSeriesLatestMonthKey] = useState(
    payrollDefaultSeriesLastMonthKeyUtc,
  );

  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [payrollObservationsRaw, setPayrollObservationsRaw] = useState<
    FredObservationRow[]
  >([]);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [rangeFilterOpen, setRangeFilterOpen] = useState(false);

  const payrollChart = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return null;
    }
    const n = payrollObservationsRaw.length;
    return buildPayrollChartFromFredObservations(payrollObservationsRaw, n);
  }, [payrollObservationsRaw]);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function probeLatestMonth() {
      try {
        const w = payrollDefaultYtdBoundsUtc();
        const data = await getFredObservations(
          {
            observationStart: "1948-01-01",
            observationEnd: w.observationEnd,
            limit: 1,
            sortOrder: "desc",
          },
          ac.signal,
        );
        if (cancelled) {
          return;
        }
        const mk = monthKeyFromObservationDate(data.observations?.[0]?.date);
        if (mk) {
          setPayrollSeriesLatestMonthKey(mk);
        }
      } catch {
        /* ignore; fallback remains default / main fetch */
      }
    }

    void probeLatestMonth();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function loadPayems() {
      setPayrollLoading(true);
      setPayrollError(null);
      try {
        const limit = payrollFredObservationFetchLimit(
          payrollFetchWindow.observationStart,
          payrollFetchWindow.observationEnd,
        );
        const data = await getFredObservations(
          {
            observationStart: payrollFetchWindow.observationStart,
            observationEnd: payrollFetchWindow.observationEnd,
            limit,
            sortOrder: "desc",
          },
          ac.signal,
        );
        if (cancelled) {
          return;
        }
        // FRED returns newest-first; rest of payroll helpers expect oldest-first.
        const obs = [...(data.observations ?? [])].reverse();
        setPayrollObservationsRaw(obs);
      } catch (e) {
        if (cancelled || isAbortError(e)) {
          return;
        }
        if (e instanceof FredObservationsError) {
          setPayrollError(e.userMessage());
        } else {
          const msg = e instanceof Error ? e.message : String(e);
          setPayrollError(msg);
        }
        setPayrollObservationsRaw([]);
      } finally {
        if (!cancelled) {
          setPayrollLoading(false);
        }
      }
    }

    void loadPayems();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [payrollFetchWindow]);

  useEffect(() => {
    if (payrollObservationsRaw.length === 0) {
      return;
    }
    const tail =
      payrollObservationsRaw[payrollObservationsRaw.length - 1]?.date;
    const mk = monthKeyFromObservationDate(tail);
    if (mk) {
      setPayrollSeriesLatestMonthKey((prev) => (mk > prev ? mk : prev));
    }
  }, [payrollObservationsRaw]);

  useEffect(() => {
    if (!payrollChart?.bars?.length) {
      setSelectedBarIndex(null);
      return;
    }
    const withData = payrollChart.bars
      .map((b, i) => (b.hasObservation ? i : -1))
      .filter((i) => i >= 0);
    const lastIdx = withData.length > 0 ? withData[withData.length - 1]! : null;
    setSelectedBarIndex(lastIdx);
  }, [payrollChart]);

  const payrollRangeA11yLabel = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return "Chart time range";
    }
    const a = formatMonthYearShortDisplay(payrollObservationsRaw[0]?.date);
    const b = formatMonthYearShortDisplay(
      payrollObservationsRaw[payrollObservationsRaw.length - 1]?.date,
    );
    return `${a} through ${b}`;
  }, [payrollObservationsRaw]);

  const onPayrollRangeFilterModalClose = useCallback(
    (reason: PayrollRangeFilterCloseReason, commit?: PayrollRangeCommitPayload) => {
      setRangeFilterOpen(false);
      if (reason !== "confirm" || commit == null) {
        return;
      }
      const { observationStart, observationEnd } = commit;
      if (!observationStart?.trim() || !observationEnd?.trim()) {
        return;
      }
      const s0 = observationStart.trim().slice(0, 10);
      const s1 = observationEnd.trim().slice(0, 10);
      setPayrollFetchWindow((prev) =>
        prev.observationStart === s0 && prev.observationEnd === s1
          ? prev
          : { observationStart: s0, observationEnd: s1 },
      );
    },
    [],
  );

  const selectedBar =
    payrollChart != null && selectedBarIndex != null
      ? payrollChart.bars[selectedBarIndex]
      : undefined;

  const payrollHeroDisplay = useMemo(
    () =>
      buildPayrollHeroDisplay(payrollChart, selectedBar, {
        mutedText,
        green,
        danger,
      }),
    [payrollChart, selectedBar, mutedText, green, danger],
  );

  const payrollAxis = useMemo(
    () => buildPayrollAxisFromChart(payrollChart),
    [payrollChart],
  );

  const yearlyTotalJobsNetThousands = useMemo(() => {
    if (payrollLoading || !payrollChart?.bars?.length) {
      return null;
    }
    return computeDisplayedChartNetLevelDeltaThousands(payrollChart);
  }, [payrollLoading, payrollChart]);

  const yearlyTotalJobsSubtitle = useMemo(() => {
    const bars = payrollChart?.bars;
    if (!bars?.length) {
      return undefined;
    }
    const start = formatMonthYearShortDisplay(bars[0]?.observationDate);
    const end = formatMonthYearShortDisplay(
      bars[bars.length - 1]?.observationDate,
    );
    if (!start || !end) {
      return undefined;
    }
    return `${start} - ${end}`;
  }, [payrollChart]);

  const yearlyTotalJobsBadgeLabel = useMemo(() => {
    if (
      payrollLoading ||
      !payrollChart ||
      yearlyTotalJobsNetThousands == null ||
      payrollChart.calendarContextYear == null
    ) {
      return undefined;
    }
    const y = payrollChart.calendarContextYear;
    const prevNet = computeCalendarYearPayrollNetLevelDeltaThousands(
      payrollObservationsRaw,
      y - 1,
    );
    if (prevNet == null || Math.abs(prevNet) < 1) {
      return undefined;
    }
    const curr = yearlyTotalJobsNetThousands;
    const pct = ((curr - prevNet) / Math.abs(prevNet)) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}% YoY`;
  }, [
    payrollLoading,
    payrollChart,
    yearlyTotalJobsNetThousands,
    payrollObservationsRaw,
  ]);

  return {
    payrollLoading,
    payrollError,
    payrollObservationsRaw,
    payrollFetchWindow,
    payrollSeriesLatestMonthKey,
    onPayrollRangeFilterModalClose,
    payrollRangeA11yLabel,
    payrollChart,
    selectedBarIndex,
    setSelectedBarIndex,
    rangeFilterOpen,
    setRangeFilterOpen,
    payrollHeroDisplay,
    payrollAxis,
    yearlyTotalJobsNetThousands,
    yearlyTotalJobsSubtitle,
    yearlyTotalJobsBadgeLabel,
  };
}
