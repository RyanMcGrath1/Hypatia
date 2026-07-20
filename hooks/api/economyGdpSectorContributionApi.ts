/**
 * `GET {API_BASE}/api/economy/gdp/sector-contribution` — value-added share of real GDP.
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type GdpSectorContributionSector = {
  key: string;
  series_id: string;
  label: string;
  value: number | null;
  observation_date: string | null;
  error?: string;
};

export type GdpSectorContributionResponse = {
  as_of?: string;
  unit: string;
  gdp_series_id: string;
  observation_date: string | null;
  sectors: GdpSectorContributionSector[];
  error?: string;
};

export class GdpSectorContributionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "GdpSectorContributionApiError";
  }
}

function parseSector(raw: unknown): GdpSectorContributionSector | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key.trim() : "";
  const series_id = typeof o.series_id === "string" ? o.series_id.trim() : "";
  const label = typeof o.label === "string" ? o.label.trim() : "";
  if (!key || !series_id || !label) {
    return null;
  }
  let value: number | null = null;
  if (typeof o.value === "number" && Number.isFinite(o.value)) {
    value = o.value;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const error = typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;
  return {
    key,
    series_id,
    label,
    value,
    observation_date,
    ...(error ? { error } : {}),
  };
}

/** Normalize `/api/economy/gdp/sector-contribution` JSON. */
export function parseGdpSectorContributionResponse(
  raw: unknown,
): GdpSectorContributionResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const unit = typeof o.unit === "string" ? o.unit.trim() : "";
  const gdp_series_id = typeof o.gdp_series_id === "string" ? o.gdp_series_id.trim() : "";
  if (!unit || !gdp_series_id) {
    return null;
  }
  if (!Array.isArray(o.sectors)) {
    return null;
  }
  const sectors = o.sectors
    .map(parseSector)
    .filter((row): row is GdpSectorContributionSector => row != null);
  if (sectors.length === 0) {
    return null;
  }
  const observation_date =
    typeof o.observation_date === "string" && o.observation_date.trim() !== ""
      ? o.observation_date.trim()
      : null;
  const as_of = typeof o.as_of === "string" ? o.as_of : undefined;
  const error = typeof o.error === "string" && o.error.trim() !== "" ? o.error.trim() : undefined;
  return {
    as_of,
    unit,
    gdp_series_id,
    observation_date,
    sectors,
    ...(error ? { error } : {}),
  };
}

/** GET `/api/economy/gdp/sector-contribution` — FRED key stays server-side. */
export async function fetchGdpSectorContribution(
  signal?: AbortSignal,
): Promise<GdpSectorContributionResponse> {
  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyGdpSectorContribution,
      undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new GdpSectorContributionApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseGdpSectorContributionResponse(body);
  if (!parsed) {
    throw new GdpSectorContributionApiError("Invalid GDP sector contribution payload", 500, body);
  }
  return parsed;
}
