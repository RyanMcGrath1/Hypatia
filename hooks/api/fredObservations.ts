/**
 * Hypatia backend proxy for PAYEMS monthly deltas (`FRED_API_KEY` stays server-side).
 * GET `{newsApiBase}/api/economy/fred/series/PAYEMS/delta?...`
 *
 * Base URL matches {@link fetchEconomyOverview} / news stack so Expo web dev can use the Metro proxy.
 */
import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";

export type FredObservationRow = {
  date: string;
  value: string;
};

/** Minimal typed slice of FRED observations JSON; extra keys allowed. */
export type FredObservationsResponse = {
  observations?: FredObservationRow[];
  observation_start?: string;
  observation_end?: string;
  limit?: number;
  count?: number;
  offset?: number;
  [key: string]: unknown;
};

export type GetFredObservationsParams = {
  /** When omitted, FRED uses its default window; pair with `sortOrder: 'desc'` and `limit` for newest rows. */
  observationStart?: string;
  /** Default 60 on server if omitted; positive integer, capped at 10000 server-side. */
  limit?: number;
  observationEnd?: string;
  realtimeStart?: string;
  realtimeEnd?: string;
  units?: string;
  frequency?: string;
  aggregationMethod?: string;
  outputType?: string;
  offset?: string;
  sortOrder?: string;
};

export class FredObservationsError extends Error {
  readonly status: number;
  readonly hint?: string;

  constructor(status: number, message: string, hint?: string) {
    super(message);
    this.name = "FredObservationsError";
    this.status = status;
    this.hint = hint;
  }

  /** Copy suitable for in-app error banners. */
  userMessage(): string {
    if (this.hint) {
      return `${this.message}\n\n${this.hint}`;
    }
    return this.message;
  }
}

function parseJsonBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function parseErrorMessage(body: unknown): { message: string; hint?: string } {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    const error = (body as { error: string }).error;
    const hint =
      "hint" in body && typeof (body as { hint: unknown }).hint === "string"
        ? (body as { hint: string }).hint
        : undefined;
    return { message: error, hint };
  }
  return { message: "Request failed" };
}

function statusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return "Invalid request (invalid limit).";
    case 502:
      return "Invalid response from FRED API.";
    case 503:
      return "Missing FRED_API_KEY on the server.";
    default:
      return `Request failed (${status}).`;
  }
}

function validateFredObservationsPayload(raw: unknown): FredObservationsResponse {
  if (!raw || typeof raw !== "object") {
    throw new FredObservationsError(
      500,
      "Unexpected response: expected a JSON object from FRED proxy.",
    );
  }
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.observations)) {
    throw new FredObservationsError(
      500,
      "Unexpected response: missing observations array.",
    );
  }
  return obj as unknown as FredObservationsResponse;
}

/**
 * GET `/api/economy/fred/series/PAYEMS/delta` — query string only, never sends `api_key`.
 */
export async function getFredObservations(
  params: GetFredObservationsParams,
  signal?: AbortSignal,
): Promise<FredObservationsResponse> {
  const searchParams: Record<string, string> = {};
  if (params.observationStart?.trim()) {
    searchParams.observation_start = params.observationStart.trim();
  }

  if (params.limit != null) {
    searchParams.limit = String(Math.floor(params.limit));
  }
  if (params.observationEnd?.trim()) {
    searchParams.observation_end = params.observationEnd.trim();
  }
  if (params.realtimeStart?.trim()) {
    searchParams.realtime_start = params.realtimeStart.trim();
  }
  if (params.realtimeEnd?.trim()) {
    searchParams.realtime_end = params.realtimeEnd.trim();
  }
  if (params.units?.trim()) {
    searchParams.units = params.units.trim();
  }
  if (params.frequency?.trim()) {
    searchParams.frequency = params.frequency.trim();
  }
  if (params.aggregationMethod?.trim()) {
    searchParams.aggregation_method = params.aggregationMethod.trim();
  }
  if (params.outputType?.trim()) {
    searchParams.output_type = params.outputType.trim();
  }
  if (params.offset?.trim()) {
    searchParams.offset = params.offset.trim();
  }
  if (params.sortOrder?.trim()) {
    searchParams.sort_order = params.sortOrder.trim();
  }

  let parsed: unknown;
  try {
    parsed = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyPayemsDelta,
      Object.keys(searchParams).length > 0 ? searchParams : undefined,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      const extracted =
        e.body && typeof e.body === "object"
          ? parseErrorMessage(e.body)
          : { message: e.message };
      throw new FredObservationsError(e.status, extracted.message, extracted.hint);
    }
    const msg = e instanceof Error ? e.message : String(e);
    throw new FredObservationsError(0, `Network error: ${msg}`);
  }

  if (parsed == null) {
    throw new FredObservationsError(502, "Invalid response from FRED API.");
  }

  return validateFredObservationsPayload(parsed);
}
