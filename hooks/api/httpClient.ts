/**
 * Generalized HTTP client for hypatia-backend JSON APIs.
 * Supports GET / POST / PATCH / DELETE with optional Bearer auth.
 * Sends **X-Request-ID** so hypatia-backend logs can correlate with the client.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Query string values — same shape used by existing GET clients. */
export type ApiQueryParams = Record<string, string>;

export type RequestApiOptions = {
  baseUrl: string;
  path: string;
  method: HttpMethod;
  /** Optional query string params (encoded via URLSearchParams). */
  query?: ApiQueryParams;
  /**
   * Optional JSON-serializable request body.
   * When provided (including for DELETE), serialized as JSON with
   * `Content-Type: application/json`. Ignored for GET.
   */
  body?: unknown;
  /** Optional bearer token — when set, sends `Authorization: Bearer <token>`. */
  token?: string;
  signal?: AbortSignal;
};

function createRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) {
    return c.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function parseResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

/** JSON `error` / `hint` fields from hypatia-backend error responses. */
export function errorMessageFromApiBody(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const raw = (body as { error?: unknown; hint?: unknown }).error;
    const hint = (body as { hint?: unknown }).hint;
    let msg =
      typeof raw === 'string' && raw.trim() !== '' ? raw : `Request failed (${status})`;
    if (typeof hint === 'string' && hint.trim() !== '') {
      msg = `${msg} ${hint}`;
    }
    return msg;
  }
  return `Request failed (${status})`;
}

export class HttpApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'HttpApiError';
  }
}

function buildUrl(baseUrl: string, path: string, query: ApiQueryParams | undefined): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const qs =
    query && Object.keys(query).length > 0
      ? `?${new URLSearchParams(query).toString()}`
      : '';
  return `${baseUrl}${normalizedPath}${qs}`;
}

/**
 * Perform an HTTP request against a hypatia JSON API.
 * Does not read or store tokens — callers pass `token` explicitly when needed.
 */
export async function requestApi(options: RequestApiOptions): Promise<unknown> {
  const { baseUrl, path, method, query, body, token, signal } = options;
  const url = buildUrl(baseUrl, path, query);

  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'X-Request-ID': createRequestId(),
  };

  if (token !== undefined && token !== '') {
    headers.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    signal,
  };

  const sendJsonBody = method !== 'GET' && body !== undefined;
  if (sendJsonBody) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Network error for ${url}: ${msg}`);
  }

  const text = await response.text();
  const parsed = parseResponseBody(text);
  if (!response.ok) {
    throw new HttpApiError(
      errorMessageFromApiBody(parsed, response.status),
      response.status,
      parsed,
    );
  }
  return parsed;
}
