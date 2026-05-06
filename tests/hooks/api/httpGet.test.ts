import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchApiGet } from '@/hooks/api/httpGet';

describe('fetchApiGet', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"ok":true}',
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends an X-Request-ID header for server log correlation', async () => {
    await fetchApiGet('http://127.0.0.1:5001', '/hello', undefined, undefined);
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const init = mockFetch.mock.calls[0]![1] as RequestInit;
    const id = (init.headers as Record<string, string>)['X-Request-ID'];
    expect(id).toBeDefined();
    expect(String(id).length).toBeGreaterThan(4);
  });
});
