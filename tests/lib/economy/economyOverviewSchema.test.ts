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

  it('coerces string observation values and tolerates optional section metadata', () => {
    const payload = {
      as_of: '2026-01-01T00:00:00+00:00',
      sections: {
        labor: {
          observations: [
            { date: '2026-01-01', value: '4.2' },
            { date: '2025-12-01', value: 4.3 },
          ],
        },
      },
    };
    expect(economyOverviewResponseSchema.safeParse(payload).success).toBe(true);
    const parsed = economyOverviewResponseSchema.parse(payload);
    expect(parsed.sections.labor).toMatchObject({
      observations: [
        { date: '2026-01-01', value: 4.2 },
        { date: '2025-12-01', value: 4.3 },
      ],
    });
  });

  it('drops FRED missing-value sentinels (e.g. ".") from observations', () => {
    const payload = {
      as_of: '2026-05-09T15:32:38+00:00',
      sections: {
        inflation: {
          label: 'CPI',
          series_id: 'CPIAUCSL',
          unit: 'index',
          observations: [
            { date: '2026-03-01', value: 330.293 },
            { date: '2025-10-01', value: '.' },
            { date: '2025-09-01', value: 324.245 },
          ],
        },
        labor: {
          label: 'Unemployment Rate',
          series_id: 'UNRATE',
          unit: 'percent',
          observations: [
            { date: '2026-04-01', value: 4.3 },
            { date: '2025-10-01', value: '.' },
          ],
        },
      },
    };
    expect(economyOverviewResponseSchema.safeParse(payload).success).toBe(true);
    const parsed = economyOverviewResponseSchema.parse(payload);
    expect(parsed.sections.inflation).toMatchObject({
      observations: [
        { date: '2026-03-01', value: 330.293 },
        { date: '2025-09-01', value: 324.245 },
      ],
    });
    expect(parsed.sections.labor).toMatchObject({
      observations: [{ date: '2026-04-01', value: 4.3 }],
    });
  });

  it('does not reject the payload when one section is malformed', () => {
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
        broken: {},
      },
    };
    expect(economyOverviewResponseSchema.safeParse(payload).success).toBe(true);
    const parsed = economyOverviewResponseSchema.parse(payload);
    expect(parsed.sections.broken).toEqual({
      error: 'Unrecognized economy section',
      hint: undefined,
    });
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

  it('preserves inflation yoyInflation on observations and section metadata', () => {
    const payload = {
      as_of: '2026-07-22T15:11:50+00:00',
      sections: {
        inflation: {
          label: 'CPI',
          series_id: 'CPIAUCSL',
          unit: 'index',
          yoyInflation: 3.46,
          observations: [
            { date: '2026-06-01', value: 332.568, yoyInflation: 3.46 },
            { date: '2026-05-01', value: 333.979, yoyInflation: 4.17 },
            { date: '2025-10-01', value: '.', yoyInflation: null },
          ],
        },
      },
    };
    expect(economyOverviewResponseSchema.safeParse(payload).success).toBe(true);
    const parsed = economyOverviewResponseSchema.parse(payload);
    expect(parsed.sections.inflation).toMatchObject({
      yoyInflation: 3.46,
      observations: [
        { date: '2026-06-01', value: 332.568, yoyInflation: 3.46 },
        { date: '2026-05-01', value: 333.979, yoyInflation: 4.17 },
      ],
    });
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
