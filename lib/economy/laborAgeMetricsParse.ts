/** Pure parser for `/api/economy/labor/age-metrics` (no React Native). */

export type LaborAgeMetricsObservation = {
  date: string;
  value: number | null;
};

export type LaborAgeMetricsSeries = {
  ageGroup: string;
  id: string;
  observations: LaborAgeMetricsObservation[];
};

export type LaborAgeMetricsMetric = {
  id: string;
  name: string;
  series: LaborAgeMetricsSeries[];
};

export type LaborAgeMetricsResponse = {
  startDate: string;
  endDate: string;
  metrics: LaborAgeMetricsMetric[];
};

export class LaborAgeMetricsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaborAgeMetricsParseError";
  }
}

function parseObservationValue(raw: unknown): number | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const t = raw.trim();
  if (t === "" || t === "." || t === "..") {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseObservations(raw: unknown): LaborAgeMetricsObservation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: LaborAgeMetricsObservation[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const date = typeof o.date === "string" ? o.date.trim() : "";
    if (!date) {
      continue;
    }
    out.push({ date, value: parseObservationValue(o.value) });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

function parseSeries(raw: unknown): LaborAgeMetricsSeries[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: LaborAgeMetricsSeries[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const ageGroup =
      typeof o.age_group === "string"
        ? o.age_group.trim()
        : typeof o.ageGroup === "string"
          ? o.ageGroup.trim()
          : "";
    const id = typeof o.id === "string" ? o.id.trim() : "";
    if (!ageGroup || !id) {
      continue;
    }
    out.push({
      ageGroup,
      id,
      observations: parseObservations(o.observations),
    });
  }
  return out;
}

export function parseLaborAgeMetricsResponse(raw: unknown): LaborAgeMetricsResponse {
  if (!raw || typeof raw !== "object") {
    throw new LaborAgeMetricsParseError("Invalid JSON from server");
  }
  const o = raw as Record<string, unknown>;
  const startDate =
    typeof o.start_date === "string"
      ? o.start_date.trim()
      : typeof o.startDate === "string"
        ? o.startDate.trim()
        : "";
  const endDate =
    typeof o.end_date === "string"
      ? o.end_date.trim()
      : typeof o.endDate === "string"
        ? o.endDate.trim()
        : "";

  const metricsRaw = o.metrics;
  const metrics: LaborAgeMetricsMetric[] = [];
  if (Array.isArray(metricsRaw)) {
    for (const m of metricsRaw) {
      if (!m || typeof m !== "object") {
        continue;
      }
      const mo = m as Record<string, unknown>;
      const id = typeof mo.id === "string" ? mo.id.trim() : "";
      const name = typeof mo.name === "string" ? mo.name.trim() : id;
      if (!id) {
        continue;
      }
      metrics.push({
        id,
        name,
        series: parseSeries(mo.series),
      });
    }
  }

  return { startDate, endDate, metrics };
}
