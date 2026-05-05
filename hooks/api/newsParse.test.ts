import { describe, expect, it } from 'vitest';

import {
  parseTopHeadlinesPage,
  parseTopHeadlinesResponse,
} from '@/hooks/api/newsParse';

describe('parseTopHeadlinesResponse', () => {
  it('maps a GNews-style article object', () => {
    const rows = parseTopHeadlinesResponse({
      items: [
        {
          title: 'Hello',
          description: 'World',
          url: 'https://example.com',
          source: { name: 'Press' },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Hello');
    expect(rows[0]?.url).toBe('https://example.com');
    expect(rows[0]?.meta).toBe('Press');
  });

  it('returns an empty list for non-objects', () => {
    expect(parseTopHeadlinesResponse(null)).toEqual([]);
  });
});

describe('parseTopHeadlinesPage', () => {
  it('reads hasMore and nextPage from a Zod-valid envelope', () => {
    const out = parseTopHeadlinesPage({
      items: [],
      hasMore: true,
      nextPage: 2,
    });
    expect(out.hasMore).toBe(true);
    expect(out.nextPage).toBe(2);
  });

  it('falls back when envelope fields have wrong types', () => {
    const out = parseTopHeadlinesPage({
      items: [],
      hasMore: 'yes',
      nextPage: '2',
    });
    expect(out.hasMore).toBe(false);
    expect(out.nextPage).toBe(null);
  });
});
