/**
 * Friendly display formatting for Profile date strings.
 * Does not mutate stored Profile state — display-only.
 */

export const PROFILE_DATE_UNAVAILABLE = 'Unavailable';
export const PROFILE_PASSWORD_CHANGED_FALLBACK = 'Not available';

const DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
};

/**
 * Format a Profile date string for display.
 * Returns `invalidFallback` when the value cannot be parsed.
 */
export function formatProfileDate(
  value: string,
  invalidFallback: string = PROFILE_DATE_UNAVAILABLE,
): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return invalidFallback;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return invalidFallback;
  }
  return parsed.toLocaleDateString('en-US', DISPLAY_OPTIONS);
}

/**
 * Format `passwordChangedAt` for display.
 * `null` / empty → neutral "Not available" (never invents a date).
 */
export function formatPasswordChangedAt(
  value: string | null,
): string {
  if (value == null || value.trim() === '') {
    return PROFILE_PASSWORD_CHANGED_FALLBACK;
  }
  return formatProfileDate(value, PROFILE_DATE_UNAVAILABLE);
}
