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

function parseResponseBody(text: string): unknown {
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
  if (!response.ok) {
    const snippet = text.trim().slice(0, 400);
    throw new Error(
      `HTTP ${response.status} ${response.statusText} for ${url}${snippet ? ` — ${snippet}` : ''}`,
    );
  }
  return parseResponseBody(text);
}
