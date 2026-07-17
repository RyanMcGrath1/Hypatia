import type { InflationPceVsTargetResponse } from "@/hooks/api/economyInflationPceVsTargetApi";
import { INFLATION_PCE_SCALE_MIN } from "@/components/economy/detail/inflation/inflationDetailData";

export type InflationPceVsTargetViewModel = {
  scaleMax: number;
  target: number | null;
  targetValueLabel: string;
  headlineLabel: string;
  headlineValueLabel: string;
  coreLabel: string;
  coreValueLabel: string;
  headlinePct: number;
  corePct: number;
  targetPct: number;
};

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

function barPct(value: number | null | undefined, scaleMax: number): number {
  if (value == null || !Number.isFinite(value) || scaleMax <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (value / scaleMax) * 100));
}

/** Bar scale grows with the largest series value so bars are not clipped. */
export function computePceScaleMax(
  ...values: (number | null | undefined)[]
): number {
  const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (finite.length === 0) {
    return INFLATION_PCE_SCALE_MIN;
  }
  const rawMax = Math.max(...finite);
  return Math.max(INFLATION_PCE_SCALE_MIN, Math.ceil(rawMax * 1.1 * 2) / 2);
}

/** Map API payload into bar chart inputs for the PCE vs target widget. */
export function inflationPceVsTargetFromApi(
  api: InflationPceVsTargetResponse | null,
): InflationPceVsTargetViewModel {
  const target = api?.target ?? null;
  const headlineValue = api?.headline.value ?? null;
  const coreValue = api?.core.value ?? null;
  const scaleMax = computePceScaleMax(headlineValue, coreValue, target);

  return {
    scaleMax,
    target,
    targetValueLabel: formatPct(target),
    headlineLabel: api?.headline.label ?? "PCE Headline",
    coreLabel: api?.core.label ?? "Core PCE",
    headlineValueLabel: formatPct(headlineValue),
    coreValueLabel: formatPct(coreValue),
    headlinePct: barPct(headlineValue, scaleMax),
    corePct: barPct(coreValue, scaleMax),
    targetPct: barPct(target, scaleMax),
  };
}
