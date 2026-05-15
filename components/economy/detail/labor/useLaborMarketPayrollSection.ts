import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildPayrollAxisFromChart,
  buildPayrollHeroDisplay,
  isAbortError,
  PAYEMS_FETCH_LIMIT,
} from "@/components/economy/detail/labor/laborMarketPayrollChart";
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
  clampPayrollRangeIndices,
  formatMonthYearShortDisplay,
} from "@/lib/economy/payrollMonthRange";

export type LaborMarketPayrollHeroTheme = {
  mutedText: string;
  green: string;
  danger: string;
};

export function useLaborMarketPayrollSection(heroTheme: LaborMarketPayrollHeroTheme) {
  const { mutedText, green, danger } = heroTheme;

  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [payrollObservationsRaw, setPayrollObservationsRaw] = useState<
    FredObservationRow[]
  >([]);
  const [payrollRangeStartIdx, setPayrollRangeStartIdx] = useState(0);
  const [payrollRangeEndIdx, setPayrollRangeEndIdx] = useState(0);
  const payrollRangeInitRef = useRef(false);
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [rangeFilterOpen, setRangeFilterOpen] = useState(false);

  const payrollChart = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return null;
    }
    const { lo, hi } = clampPayrollRangeIndices(
      payrollObservationsRaw,
      payrollRangeStartIdx,
      payrollRangeEndIdx,
    );
    const filtered = payrollObservationsRaw.slice(lo, hi + 1);
    if (filtered.length === 0) {
      return null;
    }
    return buildPayrollChartFromFredObservations(filtered, filtered.length);
  }, [payrollObservationsRaw, payrollRangeStartIdx, payrollRangeEndIdx]);

  useEffect(() => {
    if (payrollObservationsRaw.length === 0) {
      payrollRangeInitRef.current = false;
      return;
    }
    if (payrollRangeInitRef.current) {
      return;
    }
    payrollRangeInitRef.current = true;
    const n = payrollObservationsRaw.length;
    setPayrollRangeEndIdx(n - 1);
    setPayrollRangeStartIdx(Math.max(0, n - 12));
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

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    async function loadPayems() {
      setPayrollLoading(true);
      setPayrollError(null);
      try {
        const data = await getFredObservations(
          {
            limit: PAYEMS_FETCH_LIMIT,
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
  }, []);

  const payrollRangeA11yLabel = useMemo(() => {
    if (payrollObservationsRaw.length === 0) {
      return "Chart time range";
    }
    const { lo, hi } = clampPayrollRangeIndices(
      payrollObservationsRaw,
      payrollRangeStartIdx,
      payrollRangeEndIdx,
    );
    const a = formatMonthYearShortDisplay(payrollObservationsRaw[lo]?.date);
    const b = formatMonthYearShortDisplay(payrollObservationsRaw[hi]?.date);
    return `${a} through ${b}`;
  }, [payrollObservationsRaw, payrollRangeStartIdx, payrollRangeEndIdx]);

  const onPayrollRangeChange = useCallback((lo: number, hi: number) => {
    setPayrollRangeStartIdx(lo);
    setPayrollRangeEndIdx(hi);
  }, []);

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
    if (!payrollChart || payrollObservationsRaw.length === 0) {
      return undefined;
    }
    const { lo, hi } = clampPayrollRangeIndices(
      payrollObservationsRaw,
      payrollRangeStartIdx,
      payrollRangeEndIdx,
    );
    const a = formatMonthYearShortDisplay(payrollObservationsRaw[lo]?.date);
    const b = formatMonthYearShortDisplay(payrollObservationsRaw[hi]?.date);
    return `Accumulated growth from payroll MoM prints in the selected window (${a}–${b}).`;
  }, [
    payrollChart,
    payrollObservationsRaw,
    payrollRangeStartIdx,
    payrollRangeEndIdx,
  ]);

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
    payrollRangeStartIdx,
    payrollRangeEndIdx,
    onPayrollRangeChange,
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
