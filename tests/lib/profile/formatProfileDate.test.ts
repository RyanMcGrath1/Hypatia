import { describe, expect, it } from 'vitest';

import {
  PROFILE_DATE_UNAVAILABLE,
  PROFILE_PASSWORD_CHANGED_FALLBACK,
  formatPasswordChangedAt,
  formatProfileDate,
} from '@/lib/profile/formatProfileDate';

describe('formatProfileDate', () => {
  it('formats a valid ISO timestamp to a friendly en-US date', () => {
    expect(formatProfileDate('2026-07-23T14:52:31.000Z')).toMatch(/July 23, 2026/);
  });

  it('formats a date-only string', () => {
    expect(formatProfileDate('2024-01-15')).toMatch(/January 1[45], 2024/);
  });

  it('returns Unavailable for unparseable values', () => {
    expect(formatProfileDate('not-a-date')).toBe(PROFILE_DATE_UNAVAILABLE);
    expect(formatProfileDate('')).toBe(PROFILE_DATE_UNAVAILABLE);
    expect(formatProfileDate('   ')).toBe(PROFILE_DATE_UNAVAILABLE);
  });

  it('does not throw on unexpected input', () => {
    expect(() => formatProfileDate('???')).not.toThrow();
  });
});

describe('formatPasswordChangedAt', () => {
  it('formats a present date', () => {
    expect(formatPasswordChangedAt('2026-07-01T08:00:00.000Z')).toMatch(
      /July 1, 2026/,
    );
  });

  it('returns Not available for null without inventing a date', () => {
    expect(formatPasswordChangedAt(null)).toBe(PROFILE_PASSWORD_CHANGED_FALLBACK);
    expect(formatPasswordChangedAt(null)).not.toMatch(/\d{4}/);
  });

  it('returns Unavailable for garbage strings', () => {
    expect(formatPasswordChangedAt('nope')).toBe(PROFILE_DATE_UNAVAILABLE);
  });
});
