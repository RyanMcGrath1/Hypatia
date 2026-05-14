import { formatPayemsMomDeltaShort } from "@/components/economy/detail/labor/payrollChartFromFred";
import type {
  EconomyDetailChart,
  EconomyDetailObservation,
  EconomyDetailResponse,
} from "@/hooks/api/economyDetailApi";

function sortLaborObsChronologically(
  obs: EconomyDetailObservation[],
): EconomyDetailObservation[] {
  return [...obs].sort((a, b) => a.date.localeCompare(b.date));
}

export function pickPrimaryLaborObservations(
  data: EconomyDetailResponse | null | undefined,
): EconomyDetailObservation[] {
  if (!data?.charts?.length) {
    return [];
  }
  const hk = data.headline?.chart_key;
  if (hk) {
    const match = data.charts.find((c) => c.key === hk && c.observations && c.observations.length > 0);
    if (match?.observations) {
      return match.observations;
    }
  }
  const first = data.charts.find((c) => c.observations && c.observations.length > 0);
  return first?.observations ?? [];
}

export function pickPrimaryLaborChart(data: EconomyDetailResponse | null | undefined): EconomyDetailChart | null {
  if (!data?.charts?.length) {
    return null;
  }
  const hk = data.headline?.chart_key;
  if (hk) {
    const match = data.charts.find((c) => c.key === hk && c.observations && c.observations.length > 0);
    if (match) {
      return match;
    }
  }
  return data.charts.find((c) => c.observations && c.observations.length > 0) ?? null;
}

function formatDeltaForUnit(delta: number, unitRaw: string): string {
  const u = unitRaw.trim().toLowerCase();
  if (u.includes("%") || u.includes("percent") || u === "pct") {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta.toFixed(2)}%`;
  }
  if (
    u.includes("thous") ||
    u.includes("person") ||
    u === "k" ||
    (u === "" && Math.abs(delta) >= 5)
  ) {
    return formatPayemsMomDeltaShort(delta);
  }
  const sign = delta >= 0 ? "+" : "";
  const suffix = unitRaw.trim() ? ` ${unitRaw.trim()}` : "";
  return `${sign}${delta.toLocaleString("en-US", { maximumFractionDigits: 2 })}${suffix}`;
}

export type LaborPrimaryFromApi = {
  kickerLabel: string;
  heroValueLabel: string;
  subtitle?: string;
  badgeLabel?: string;
};

/**
 * Builds the Hypatia primary metric copy from `GET /api/economy/detail?topic=labor`.
 * Prefers `headline`; otherwise level change across the primary series (chronologically latest − earliest).
 */
export function laborPrimaryFromEconomyDetail(
  data: EconomyDetailResponse | null | undefined,
): LaborPrimaryFromApi | null {
  if (!data) {
    return null;
  }
  const head = data.headline;
  if (head && Number.isFinite(head.value)) {
    const unit = head.unit?.trim() ?? "";
    const heroValueLabel = unit ? `${head.value} ${unit}`.trim() : String(head.value);
    const parts: string[] = [];
    if (head.observation_date?.trim()) {
      parts.push(`Observation ${head.observation_date.trim()}`);
    }
    if (head.label?.trim()) {
      parts.push(head.label.trim());
    }
    if (data.as_of?.trim()) {
      parts.push(`As of ${data.as_of.trim()}`);
    }
    return {
      kickerLabel: (head.label?.trim() || "Labor market").toUpperCase(),
      heroValueLabel,
      subtitle: parts.length > 0 ? parts.join(" · ") : undefined,
    };
  }

  const obs = pickPrimaryLaborObservations(data);
  if (obs.length < 2) {
    return null;
  }
  const chron = sortLaborObsChronologically(obs);
  const oldest = chron[0]!;
  const newest = chron[chron.length - 1]!;
  const delta = newest.value - oldest.value;
  const chart = pickPrimaryLaborChart(data);
  const unit = chart?.unit ?? "";
  const heroValueLabel = formatDeltaForUnit(delta, unit);
  const label = chart?.label?.trim() || "Labor series";
  const subtitle = `Change from ${oldest.date} to ${newest.date} (${label}).`;

  let badgeLabel: string | undefined;
  if (chron.length >= 13) {
    const yNew = chron[chron.length - 1]!;
    const yOld = chron[chron.length - 13]!;
    const yoy = yNew.value - yOld.value;
    const denom = Math.abs(yOld.value);
    if (denom > 1e-9) {
      const pct = (yoy / denom) * 100;
      const sign = pct >= 0 ? "+" : "";
      badgeLabel = `${sign}${pct.toFixed(1)}% vs 12 obs. prior`;
    }
  }

  return {
    kickerLabel: label.toUpperCase(),
    heroValueLabel,
    subtitle,
    badgeLabel,
  };
}
