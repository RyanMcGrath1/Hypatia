import type { GdpSectorContributionResponse } from "@/hooks/api/economyGdpSectorContributionApi";

const SECTOR_COLORS: Record<string, string> = {
  services: "#4A6CF7",
  manufacturing: "#4B5563",
  agriculture: "#B45309",
};

export type GdpSectorContributionRow = {
  key: string;
  label: string;
  valueLabel: string;
  barWidthPct: number;
  color: string;
  hasError: boolean;
};

export type GdpSectorContributionViewModel = {
  rows: GdpSectorContributionRow[];
  observationDateLabel: string;
};

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

function formatObservationDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const year = match[1];
  const month = Number(match[2]);
  const quarter = Math.ceil(month / 3);
  return `Q${quarter} ${year}`;
}

/** Map API payload into bar rows for the GDP sector contribution widget. */
export function gdpSectorContributionFromApi(
  api: GdpSectorContributionResponse | null,
  primaryColor: string,
): GdpSectorContributionViewModel {
  if (!api) {
    return { rows: [], observationDateLabel: "" };
  }

  const rows: GdpSectorContributionRow[] = api.sectors.map((sector) => {
    const color =
      sector.key === "services" ? primaryColor : (SECTOR_COLORS[sector.key] ?? primaryColor);
    const barWidthPct =
      sector.value != null && Number.isFinite(sector.value)
        ? Math.max(0, Math.min(100, sector.value))
        : 0;
    return {
      key: sector.key,
      label: sector.label,
      valueLabel: formatPct(sector.value),
      barWidthPct,
      color,
      hasError: sector.error != null || sector.value == null,
    };
  });

  return {
    rows,
    observationDateLabel: formatObservationDate(api.observation_date),
  };
}
