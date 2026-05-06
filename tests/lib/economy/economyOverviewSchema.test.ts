import { describe, expect, it } from 'vitest';

import { economyOverviewResponseSchema } from '@/lib/economy/economyOverviewSchema';
import { parseEconomyOverviewResponse } from '@/lib/economy/economyOverviewTypes';

describe('economyOverviewResponseSchema', () => {
  it('accepts a minimal valid overview payload', () => {
    const payload = {
      as_of: '2026-01-01T00:00:00+00:00',
      sections: {
        labor: {
          label: 'Unemployment Rate',
          series_id: 'UNRATE',
          unit: 'percent',
          observations: [
            { date: '2026-01-01', value: 4.2 },
            { date: '2025-12-01', value: 4.3 },
          ],
        },
      },
    };
    expect(economyOverviewResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('accepts per-section error objects from FRED', () => {
    const payload = {
      as_of: '2026-01-01T00:00:00+00:00',
      sections: {
        labor: {
          error: 'FRED request failed',
          hint: 'series_id=UNRATE',
        },
      },
    };
    expect(economyOverviewResponseSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects missing as_of', () => {
    expect(
      economyOverviewResponseSchema.safeParse({
        sections: {},
      }).success,
    ).toBe(false);
  });
});

describe('parseEconomyOverviewResponse', () => {
  it('returns null for invalid JSON shapes', () => {
    expect(parseEconomyOverviewResponse(null)).toBeNull();
    expect(parseEconomyOverviewResponse({})).toBeNull();
  });

  it('returns parsed data for valid payloads', () => {
    const payload = {
      as_of: '2026-01-01T00:00:00+00:00',
      sections: {
        gdp: {
          label: 'GDP',
          series_id: 'GDPC1',
          unit: 'billions',
          observations: [{ date: '2026-01-01', value: 1 }],
        },
      },
    };
    const out = parseEconomyOverviewResponse(payload);
    expect(out).not.toBeNull();
    expect(out?.as_of).toBe(payload.as_of);
  });
});
