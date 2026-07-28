import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  errorMessageFromApiBody,
  HttpApiError,
  parseResponseBody,
  requestApi,
} from '@/hooks/api/httpClient';
import { fetchApiGet } from '@/hooks/api/httpGet';
import {
  clearSessionInvalidationListenersForTests,
  fingerprintSessionToken,
  subscribeToSessionInvalidation,
} from '@/lib/auth/sessionInvalidation';

function mockJsonResponse(
  data: unknown,
  init: { ok?: boolean; status?: number; statusText?: string } = {},
): Response {
  const status = init.status ?? (init.ok === false ? 400 : 200);
  const ok = init.ok ?? (status >= 200 && status < 300);
  const body =
    data === undefined || data === null
      ? ''
      : typeof data === 'string'
        ? data
        : JSON.stringify(data);
  return {
    ok,
    status,
    statusText: init.statusText ?? (ok ? 'OK' : 'Error'),
    text: async () => body,
  } as Response;
}

function mockEmptyResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    text: async () => '',
  } as Response;
}

describe('requestApi', () => {
  beforeEach(() => {
    clearSessionInvalidationListenersForTests();
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse({ ok: true }));
  });

  afterEach(() => {
    clearSessionInvalidationListenersForTests();
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('sends GET method', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/health',
        method: 'GET',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      expect(init.method).toBe('GET');
    });

    it('encodes query parameters correctly', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/news/search',
        method: 'GET',
        query: { q: 'hello world', page: '2' },
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const url = mockFetch.mock.calls[0]![0] as string;
      expect(url).toBe(
        'http://127.0.0.1:5001/api/news/search?q=hello+world&page=2',
      );
    });

    it('preserves Accept, cache, and X-Request-ID headers', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/health',
        method: 'GET',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(headers.Accept).toBe('application/json, text/plain, */*');
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers.Pragma).toBe('no-cache');
      expect(headers['X-Request-ID']).toBeDefined();
      expect(String(headers['X-Request-ID']).length).toBeGreaterThan(4);
      expect(init.cache).toBe('no-store');
      expect(headers['Content-Type']).toBeUndefined();
      expect(init.body).toBeUndefined();
    });

    it('normalizes paths without a leading slash', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: 'health',
        method: 'GET',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      expect(mockFetch.mock.calls[0]![0]).toBe('http://127.0.0.1:5001/health');
    });
  });

  describe('POST', () => {
    it('sends POST with JSON body and Content-Type', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/example',
        method: 'POST',
        body: { email: 'a@b.com', password: 'secret' },
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(init.method).toBe('POST');
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify({ email: 'a@b.com', password: 'secret' }));
    });
  });

  describe('PATCH', () => {
    it('sends PATCH with JSON body', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/example',
        method: 'PATCH',
        body: { display_name: 'Ada' },
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(init.method).toBe('PATCH');
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify({ display_name: 'Ada' }));
    });
  });

  describe('DELETE', () => {
    it('sends DELETE without a body', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/example',
        method: 'DELETE',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(init.method).toBe('DELETE');
      expect(init.body).toBeUndefined();
      expect(headers['Content-Type']).toBeUndefined();
    });

    it('sends DELETE with a JSON confirmation body', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/account',
        method: 'DELETE',
        body: { confirmation: 'DELETE' },
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      const headers = init.headers as Record<string, string>;
      expect(init.method).toBe('DELETE');
      expect(headers['Content-Type']).toBe('application/json');
      expect(init.body).toBe(JSON.stringify({ confirmation: 'DELETE' }));
    });
  });

  describe('authorization', () => {
    it('sends Authorization Bearer when token is supplied', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/profile',
        method: 'GET',
        token: 'session-token-abc',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const url = mockFetch.mock.calls[0]![0] as string;
      const headers = (mockFetch.mock.calls[0]![1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer session-token-abc');
      expect(url).not.toContain('session-token-abc');
      expect(url).not.toContain('token');
    });

    it('omits Authorization when token is absent', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/health',
        method: 'GET',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const headers = (mockFetch.mock.calls[0]![1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('omits Authorization when token is empty string', async () => {
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/health',
        method: 'GET',
        token: '',
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const headers = (mockFetch.mock.calls[0]![1] as RequestInit)
        .headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('responses', () => {
    it('parses JSON success responses', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ items: [1, 2] }),
      );
      const result = await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/example',
        method: 'GET',
      });
      expect(result).toEqual({ items: [1, 2] });
    });

    it('handles empty successful response bodies as empty string', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockEmptyResponse(200),
      );
      const result = await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/example',
        method: 'POST',
        body: {},
      });
      expect(result).toBe('');
    });

    it('handles HTTP 204 No Content', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockEmptyResponse(204),
      );
      const result = await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/api/example',
        method: 'DELETE',
      });
      expect(result).toBe('');
    });

    it('returns plain text when body is not JSON', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse('not-json-payload'),
      );
      const result = await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/health',
        method: 'GET',
      });
      expect(result).toBe('not-json-payload');
    });
  });

  describe('errors', () => {
    it('maps backend {"error":"..."} into HttpApiError', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ error: 'Invalid credentials' }, { status: 401 }),
      );
      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/auth/login',
          method: 'POST',
          body: { email: 'a@b.com', password: 'wrong' },
        }),
      ).rejects.toMatchObject({
        name: 'HttpApiError',
        status: 401,
        message: 'Invalid credentials',
        body: { error: 'Invalid credentials' },
      });
    });

    it('appends hint when present on error payloads', async () => {
      expect(
        errorMessageFromApiBody(
          { error: 'Bad request', hint: 'Check fields.' },
          400,
        ),
      ).toBe('Bad request Check fields.');
    });

    it('does not crash on non-JSON error bodies', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse('<html>gateway</html>', { status: 502 }),
      );
      try {
        await requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/example',
          method: 'GET',
        });
        expect.unreachable('expected HttpApiError');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpApiError);
        const err = e as HttpApiError;
        expect(err.status).toBe(502);
        expect(err.message).toBe('Request failed (502)');
        expect(err.body).toBe('<html>gateway</html>');
      }
    });

    it('preserves HTTP status on HttpApiError', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ error: 'Gone' }, { status: 410 }),
      );
      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/example',
          method: 'DELETE',
        }),
      ).rejects.toMatchObject({ status: 410 });
    });

    it('does not place token or password into public error strings', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
      );
      try {
        await requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/profile',
          method: 'POST',
          token: 'super-secret-token',
          body: { password: 'hunter2' },
        });
        expect.unreachable('expected HttpApiError');
      } catch (e) {
        const err = e as HttpApiError;
        expect(err.message).not.toContain('super-secret-token');
        expect(err.message).not.toContain('hunter2');
        expect(String(err)).not.toContain('super-secret-token');
        expect(String(err)).not.toContain('hunter2');
      }
    });

    it('notifies session invalidation for Bearer 401 with fingerprint only', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSessionInvalidation(listener);
      const token = 'session-token-for-401-notify';
      const expectedFp = await fingerprintSessionToken(token);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ error: 'Unauthorized' }, { status: 401 }),
      );

      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/profile',
          method: 'GET',
          token,
        }),
      ).rejects.toBeInstanceOf(HttpApiError);

      await vi.waitFor(() => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
      expect(listener).toHaveBeenCalledWith({ tokenFingerprint: expectedFp });
      const payload = JSON.stringify(listener.mock.calls[0]?.[0]);
      expect(payload).not.toContain(token);
      unsubscribe();
    });

    it('does not notify session invalidation for public 401 without Bearer', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSessionInvalidation(listener);

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        mockJsonResponse({ error: 'Invalid credentials' }, { status: 401 }),
      );

      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/api/auth/login',
          method: 'POST',
          body: { email: 'a@b.com', password: 'wrong' },
        }),
      ).rejects.toMatchObject({ status: 401 });

      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });

    it('does not notify session invalidation for Bearer non-401 errors', async () => {
      const listener = vi.fn();
      const unsubscribe = subscribeToSessionInvalidation(listener);

      for (const status of [400, 403, 429, 500]) {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          mockJsonResponse({ error: `e${status}` }, { status }),
        );
        await expect(
          requestApi({
            baseUrl: 'http://127.0.0.1:5001',
            path: '/api/profile',
            method: 'GET',
            token: 'session-token-abc',
          }),
        ).rejects.toMatchObject({ status });
      }

      await Promise.resolve();
      expect(listener).not.toHaveBeenCalled();
      unsubscribe();
    });
  });

  describe('abort / network', () => {
    it('forwards AbortSignal to fetch', async () => {
      const controller = new AbortController();
      await requestApi({
        baseUrl: 'http://127.0.0.1:5001',
        path: '/health',
        method: 'GET',
        signal: controller.signal,
      });
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      const init = mockFetch.mock.calls[0]![1] as RequestInit;
      expect(init.signal).toBe(controller.signal);
    });

    it('wraps network failures without including Authorization', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new TypeError('Failed to fetch'),
      );
      await expect(
        requestApi({
          baseUrl: 'http://127.0.0.1:5001',
          path: '/health',
          method: 'GET',
          token: 'secret-token',
        }),
      ).rejects.toThrow('Network error for http://127.0.0.1:5001/health: Failed to fetch');
    });
  });

  describe('parseResponseBody helpers', () => {
    it('returns empty string for blank text', () => {
      expect(parseResponseBody('')).toBe('');
      expect(parseResponseBody('   ')).toBe('');
    });

    it('parses JSON and falls back to raw text', () => {
      expect(parseResponseBody('{"a":1}')).toEqual({ a: 1 });
      expect(parseResponseBody('plain')).toBe('plain');
    });
  });
});

describe('fetchApiGet backward compatibility', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(mockJsonResponse({ ok: true }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('delegates to the shared client with GET semantics', async () => {
    const result = await fetchApiGet(
      'http://127.0.0.1:5001',
      '/health',
      { ping: '1' },
      undefined,
    );
    expect(result).toEqual({ ok: true });

    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]![0]).toBe(
      'http://127.0.0.1:5001/health?ping=1',
    );
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe('GET');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Request-ID']).toBeDefined();
    expect(headers.Authorization).toBeUndefined();
  });
});
