/**
 * Hypatia backend sector endpoint — `GET {API_BASE}/api/economy/labor/sector`.
 *
 * Returns labor-market sector observations for a server-side date window (default YTD UTC).
 * (FRED series) the server tracks. The client never sends a FRED key; the proxy
 * adds it server-side. Per-sector errors come through as `sectors[id].error`
 * strings so a single bad series doesn't fail the whole view.
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type EconomySectorObservation = {
  date: string;
  /** `null` when FRED reported missing (`.`); otherwise the parsed numeric value. */
  value: number | null;
};

export type EconomySectorEntry = {
  id: string;
  name: string;
  observations: EconomySectorObservation[];
  /** Per-sector error string when the proxy couldn't fetch this series. */
  error?: string;
};

export type EconomySectorSeries = {
  id: string;
  name: string;
  points: EconomySectorObservation[];
  error?: string;
};

export type EconomySectorResponse = {
  startDate: string;
  endDate: string;
  /** Canonical render order from the server. */
  series: EconomySectorSeries[];
  /** Lookup by series id. */
  sectors: Record<string, EconomySectorEntry>;
};

export class EconomySectorApiError extends Error {
  readonly status: number;
  readonly hint?: string;

  constructor(status: number, message: string, hint?: string) {
    super(message);
    this.name = "EconomySectorApiError";
    this.status = status;
    this.hint = hint;
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

function normalizeObservationsArray(raw: unknown): EconomySectorObservation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: EconomySectorObservation[] = [];
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
  return out;
}

function normalizePointsTupleArray(raw: unknown): EconomySectorObservation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: EconomySectorObservation[] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 2) {
      continue;
    }
    const dateRaw = row[0];
    const date = typeof dateRaw === "string" ? dateRaw.trim() : "";
    if (!date) {
      continue;
    }
    out.push({ date, value: parseObservationValue(row[1]) });
  }
  return out;
}

/** `series[].points` may be `[date, value][]` tuples or `{ date, value }[]` objects. */
function normalizeSeriesPoints(raw: unknown): EconomySectorObservation[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const first = raw[0];
  if (Array.isArray(first)) {
    return normalizePointsTupleArray(raw);
  }
  if (first && typeof first === "object") {
    return normalizeObservationsArray(raw);
  }
  return [];
}

function parseSectorEntry(
  id: string,
  entry: unknown,
): EconomySectorEntry | null {
  if (typeof entry === "string" && entry.trim()) {
    return {
      id,
      name: id,
      observations: [],
      error: entry.trim(),
    };
  }
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const e = entry as Record<string, unknown>;
  const name = typeof e.name === "string" && e.name.trim() ? e.name : id;
  const errorStr =
    typeof e.error === "string" && e.error.trim() ? e.error : undefined;
  const fromObservations = normalizeObservationsArray(e.observations);
  const observations =
    fromObservations.length > 0
      ? fromObservations
      : normalizeSeriesPoints(e.points);
  return {
    id,
    name,
    observations,
    error: errorStr,
  };
}

export function parseEconomySectorResponse(
  payload: unknown,
): EconomySectorResponse {
  if (!payload || typeof payload !== "object") {
    throw new EconomySectorApiError(
      500,
      "Unexpected response: expected a JSON object from sector proxy.",
    );
  }
  const obj = payload as Record<string, unknown>;
  const startDate = typeof obj.start_date === "string" ? obj.start_date : "";
  const endDate = typeof obj.end_date === "string" ? obj.end_date : "";

  const sectorsRaw =
    obj.sectors && typeof obj.sectors === "object"
      ? (obj.sectors as Record<string, unknown>)
      : {};
  const sectors: Record<string, EconomySectorEntry> = {};
  for (const [id, entry] of Object.entries(sectorsRaw)) {
    const parsed = parseSectorEntry(id, entry);
    if (parsed) {
      sectors[id] = parsed;
    }
  }

  const seriesRaw = Array.isArray(obj.series) ? obj.series : [];
  const series: EconomySectorSeries[] = [];
  const seenIds = new Set<string>();

  for (const row of seriesRaw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const s = row as Record<string, unknown>;
    const id = typeof s.id === "string" ? s.id : "";
    if (!id) {
      continue;
    }
    seenIds.add(id);
    const name = typeof s.name === "string" && s.name.trim() ? s.name : id;
    const errorStr =
      typeof s.error === "string" && s.error.trim() ? s.error : undefined;
    const sectorEntry = sectors[id];
    const fromPoints = normalizeSeriesPoints(s.points);
    const fromObservations = normalizeObservationsArray(s.observations);
    const points =
      fromPoints.length > 0
        ? fromPoints
        : fromObservations.length > 0
          ? fromObservations
          : (sectorEntry?.observations ?? []);
    series.push({
      id,
      name,
      points,
      error: errorStr ?? sectorEntry?.error,
    });
  }

  // Some backends only populate `sectors`; derive `series` for table iteration.
  if (series.length === 0) {
    for (const [id, entry] of Object.entries(sectors)) {
      series.push({
        id,
        name: entry.name,
        points: entry.observations,
        error: entry.error,
      });
    }
  } else {
    for (const [id, entry] of Object.entries(sectors)) {
      if (!seenIds.has(id)) {
        series.push({
          id,
          name: entry.name,
          points: entry.observations,
          error: entry.error,
        });
      }
    }
  }

  if (series.length === 0) {
    throw new EconomySectorApiError(
      500,
      "Sector response contained no series.",
    );
  }

  return { startDate, endDate, series, sectors };
}

function httpStatusFromFetchError(message: string): number {
  const match = /^HTTP (\d+)/.exec(message);
  if (match) {
    return Number(match[1]);
  }
  return 0;
}

function errorBodyFromHttpMessage(message: string): {
  message: string;
  hint?: string;
} {
  const dash = message.indexOf(" — ");
  if (dash < 0) {
    return { message };
  }
  const snippet = message.slice(dash + 3).trim();
  try {
    const body = JSON.parse(snippet) as { error?: unknown; hint?: unknown };
    const errStr = body.error;
    const hintStr = body.hint;
    return {
      message:
        typeof errStr === "string" && errStr.trim()
          ? errStr
          : message.slice(0, dash),
      hint: typeof hintStr === "string" && hintStr.trim() ? hintStr : undefined,
    };
  } catch {
    return { message: message.slice(0, dash) };
  }
}

export type EconomySectorFetchParams = {
  observationStart?: string;
  observationEnd?: string;
};

/** GET `/api/economy/labor/sector` — FRED key stays server-side. */
export async function fetchEconomySector(
  signal?: AbortSignal,
  params?: EconomySectorFetchParams,
): Promise<EconomySectorResponse> {
  const searchParams: Record<string, string> = {};
  if (params?.observationStart?.trim()) {
    searchParams.observation_start = params.observationStart.trim();
  }
  if (params?.observationEnd?.trim()) {
    searchParams.observation_end = params.observationEnd.trim();
  }

  try {
    const raw = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyLaborSector,
      Object.keys(searchParams).length > 0 ? searchParams : undefined,
      signal,
    );
    return parseEconomySectorResponse(raw);
  } catch (e) {
    if (e instanceof EconomySectorApiError) {
      throw e;
    }
    if (e instanceof HttpApiError) {
      const hint =
        e.body && typeof e.body === "object" && "hint" in e.body
          ? String((e.body as { hint?: unknown }).hint ?? "")
          : undefined;
      throw new EconomySectorApiError(e.status, e.message, hint || undefined);
    }
    if (e instanceof Error) {
      throw new EconomySectorApiError(0, e.message);
    }
    throw new EconomySectorApiError(0, String(e));
  }
}
