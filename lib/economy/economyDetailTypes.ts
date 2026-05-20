/**
 * `GET /api/economy/detail` payload — mirrors hypatia-backend `build_economy_detail`.
 */

export type EconomyDetailTopic = "gdp" | "inflation" | "markets" | "labor";

export type EconomyDetailObservation = { date: string; value: number };

export type EconomyDetailChart = {
  key: string;
  series_id: string;
  label: string;
  unit: string;
  observations?: EconomyDetailObservation[];
  error?: string;
  hint?: string;
};

export type EconomyDetailHeadline = {
  chart_key: string;
  series_id: string;
  label: string;
  unit: string;
  value: number;
  observation_date: string;
};

export type EconomyDetailResponse = {
  as_of?: string;
  topic: string;
  charts: EconomyDetailChart[];
  headline?: EconomyDetailHeadline | null;
  observation_end?: string | null;
};

function parseObservationValue(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw !== "string") {
    return null;
  }
  const t = raw.trim();
  if (t === "" || t === ".") {
    return null;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function normalizeObservations(raw: unknown): EconomyDetailObservation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: EconomyDetailObservation[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const date =
      typeof o.date === "string"
        ? o.date.trim()
        : typeof o.observation_date === "string"
          ? o.observation_date.trim()
          : "";
    if (!date) {
      continue;
    }
    const value = parseObservationValue(o.value);
    if (value === null) {
      continue;
    }
    out.push({ date, value });
  }
  return out;
}

function parseChart(raw: unknown): EconomyDetailChart | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key : "";
  const series_id = typeof o.series_id === "string" ? o.series_id : "";
  const label = typeof o.label === "string" ? o.label : series_id || key || "Series";
  const unit = typeof o.unit === "string" ? o.unit : "";
  const err = typeof o.error === "string" ? o.error : undefined;
  const hint = typeof o.hint === "string" ? o.hint : undefined;
  const observations = normalizeObservations(o.observations);
  if (err) {
    return { key: key || "unknown", series_id, label, unit, error: err, hint };
  }
  return {
    key: key || series_id || "unknown",
    series_id,
    label,
    unit,
    observations,
  };
}

function parseHeadline(raw: unknown): EconomyDetailHeadline | null {
  if (raw == null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const chart_key = typeof o.chart_key === "string" ? o.chart_key : "";
  const series_id = typeof o.series_id === "string" ? o.series_id : "";
  const label = typeof o.label === "string" ? o.label : "";
  const unit = typeof o.unit === "string" ? o.unit : "";
  const observation_date =
    typeof o.observation_date === "string"
      ? o.observation_date
      : typeof o.date === "string"
        ? o.date
        : "";
  const value = parseObservationValue(o.value);
  if (!chart_key || !series_id || value === null) {
    return null;
  }
  return {
    chart_key,
    series_id,
    label: label || series_id,
    unit,
    value,
    observation_date: observation_date || "",
  };
}

export function parseEconomyDetailResponse(payload: unknown): EconomyDetailResponse | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const o = payload as Record<string, unknown>;
  const topic = typeof o.topic === "string" ? o.topic : "";
  if (!topic) {
    return null;
  }
  const chartsRaw = o.charts;
  const charts: EconomyDetailChart[] = [];
  if (Array.isArray(chartsRaw)) {
    for (const c of chartsRaw) {
      const parsed = parseChart(c);
      if (parsed) {
        charts.push(parsed);
      }
    }
  }
  return {
    as_of: typeof o.as_of === "string" ? o.as_of : undefined,
    topic,
    charts,
    headline: parseHeadline(o.headline),
    observation_end:
      o.observation_end === null || o.observation_end === undefined
        ? null
        : typeof o.observation_end === "string"
          ? o.observation_end
          : null,
  };
}
