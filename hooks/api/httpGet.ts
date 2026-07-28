/**
 * Shared GET helper for JSON/text backends (used by Flask main + news clients).
 * Delegates to {@link requestApi} so GET and mutation clients share one transport.
 */

import { requestApi } from '@/hooks/api/httpClient';

export {
  errorMessageFromApiBody,
  HttpApiError,
  parseResponseBody,
} from '@/hooks/api/httpClient';

export async function fetchApiGet(
  apiBaseUrl: string,
  path: string,
  searchParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  return requestApi({
    baseUrl: apiBaseUrl,
    path,
    method: 'GET',
    query: searchParams,
    signal,
  });
}
