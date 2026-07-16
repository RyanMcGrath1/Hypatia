/**
 * `GET {API_BASE}/api/economy/cpi` — CPIAUCSL level observations (FRED key stays server-side).
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type EconomyCpiObservation = {
  date: string;
  value: number;
};

export type EconomyCpiResponse = {
  as_of?: string;
  series_id: string;
  label: string;
  unit: string;
  observations: EconomyCpiObservation[];
};

export class EconomyCpiApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "EconomyCpiApiError";
  }
}

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

function parseObservations(raw: unknown): EconomyCpiObservation[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: EconomyCpiObservation[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const o = row as Record<string, unknown>;
    const date = typeof o.date === "string" ? o.date.trim() : "";
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

/** Normalize `/api/economy/cpi` JSON into a typed response. */
export function parseEconomyCpiResponse(raw: unknown): EconomyCpiResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const series_id = typeof o.series_id === "string" ? o.series_id.trim() : "";
  if (!series_id) {
    return null;
  }
  const label =
    typeof o.label === "string" && o.label.trim() !== ""
      ? o.label.trim()
      : series_id;
  const unit = typeof o.unit === "string" ? o.unit : "";
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  return {
    as_of,
    series_id,
    label,
    unit,
    observations: parseObservations(o.observations),
  };
}

/** GET `/api/economy/cpi` — returns CPIAUCSL index observations. */
export async function fetchEconomyCpi(
  signal?: AbortSignal,
): Promise<EconomyCpiResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyCpi,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new EconomyCpiApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseEconomyCpiResponse(body);
  if (!parsed) {
    throw new EconomyCpiApiError("Invalid economy CPI payload", 500, body);
  }
  return parsed;
}
