/**
 * FEC candidate name search via Hypatia backend (`GET /api/fec/candidates`).
 * Uses the same base URL / web proxy as the news & economy APIs (port 5001 by default).
 */
import { fetchApiGet, HttpApiError } from '@/hooks/api/httpGet';
import { getHypatiaBackendBaseUrl, getHypatiaBackendNetworkErrorMessage } from '@/hooks/api/hypatiaBaseUrl';
import { HYPATIA_API_PATHS } from '@/hooks/api/hypatiaPaths';

export class FecCandidatesApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'FecCandidatesApiError';
  }
}

export function getFecApiBaseUrl(): string {
  return getHypatiaBackendBaseUrl();
}

export function getFecCandidatesNetworkErrorMessage(): string {
  return getHypatiaBackendNetworkErrorMessage();
}

/** OpenFEC `names/candidates` rejects shorter `q` with HTTP 422. */
export const FEC_CANDIDATES_MIN_QUERY_LENGTH = 3;

export type FecCandidateResult = {
  candidate_id?: string;
  name?: string;
  party?: string | null;
  office?: string | null;
  office_full?: string | null;
  state?: string | null;
  district?: string | null;
};

export type FecCandidatesResponse = {
  results?: FecCandidateResult[];
  pagination?: {
    count?: number;
    page?: number;
    pages?: number;
    per_page?: number;
  };
};

export type FetchFecCandidatesParams = {
  /** Preferred search string (sent as `q`). */
  q?: string;
  /** Alias for `q` — ignored if `q` is non-empty. */
  name?: string;
  page?: number;
  per_page?: number;
};

/**
 * `GET {base}/api/fec/candidates?q=...` — OpenFEC-shaped JSON on success.
 * Throws {@link FecCandidatesApiError} for 400 / 502 / 503 and other non-OK statuses with parsed `error` when present.
 */
export async function fetchFecCandidates(
  params: FetchFecCandidatesParams,
  signal?: AbortSignal,
): Promise<FecCandidatesResponse> {
  const qRaw = (params.q?.trim() || params.name?.trim() || '').trim();
  if (!qRaw) {
    throw new FecCandidatesApiError(
      "Query parameter 'q' is required (alias: 'name')",
      400,
    );
  }

  const searchParams: Record<string, string> = { q: qRaw };
  if (params.page != null) {
    searchParams.page = String(params.page);
  }
  if (params.per_page != null) {
    searchParams.per_page = String(params.per_page);
  }

  try {
    const body = await fetchApiGet(
      getFecApiBaseUrl(),
      HYPATIA_API_PATHS.fecCandidates,
      searchParams,
      signal,
    );
    if (body === null || typeof body !== 'object') {
      throw new FecCandidatesApiError('Invalid JSON from server', 500, body);
    }
    return body as FecCandidatesResponse;
  } catch (e) {
    if (e instanceof FecCandidatesApiError) {
      throw e;
    }
    if (e instanceof HttpApiError) {
      throw new FecCandidatesApiError(e.message, e.status, e.body);
    }
    throw e;
  }
}
