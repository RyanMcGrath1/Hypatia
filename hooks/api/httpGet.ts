/**
 * Shared GET helper for JSON/text backends (used by Flask main + news clients).
 * Sends **X-Request-ID** so hypatia-backend logs can correlate with the client.
 */

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

export async function fetchApiGet(
  apiBaseUrl: string,
  path: string,
  searchParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const qs =
    searchParams && Object.keys(searchParams).length > 0
      ? `?${new URLSearchParams(searchParams).toString()}`
      : '';
  const url = `${apiBaseUrl}${normalizedPath}${qs}`;

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
  const body = parseResponseBody(text);
  if (!response.ok) {
    throw new HttpApiError(errorMessageFromApiBody(body, response.status), response.status, body);
  }
  return body;
}
