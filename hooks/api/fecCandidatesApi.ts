/**
 * FEC candidate name search via Hypatia backend (`GET /api/fec/candidates`).
 * Uses the same base URL / web proxy as the news & economy APIs (port 5001 by default).
 */
import { getNewsApiBaseUrl, getNewsApiNetworkErrorMessage } from '@/hooks/api/newsApi';

function createRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

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
  return getNewsApiBaseUrl();
}

export function getFecCandidatesNetworkErrorMessage(): string {
  return getNewsApiNetworkErrorMessage();
}

/** OpenFEC `names/candidates` rejects shorter `q` with HTTP 422. */
export const FEC_CANDIDATES_MIN_QUERY_LENGTH = 3;

function parseJsonBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed;
  }
}

function errorMessageFromBody(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const raw = (body as { error?: unknown; hint?: unknown }).error;
    const hint = (body as { hint?: unknown }).hint;
    let msg = typeof raw === 'string' && raw.trim() !== '' ? raw : `Request failed (${status})`;
    if (typeof hint === 'string' && hint.trim() !== '') {
      msg = `${msg} ${hint}`;
    }
    return msg;
  }
  return `Request failed (${status})`;
}

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

  const qs = new URLSearchParams(searchParams).toString();
  const base = getFecApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/api/fec/candidates?${qs}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'X-Request-ID': createRequestId(),
      },
      cache: 'no-store',
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Network error for ${url}: ${msg}`);
  }

  const text = await response.text();
  const body = parseJsonBody(text);

  if (!response.ok) {
    const message = errorMessageFromBody(body, response.status);
    throw new FecCandidatesApiError(message, response.status, body);
  }

  if (body === null || typeof body !== 'object') {
    throw new FecCandidatesApiError('Invalid JSON from server', 500, body);
  }

  return body as FecCandidatesResponse;
}
