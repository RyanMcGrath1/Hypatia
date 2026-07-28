/** Shared Profile / registration name length limit. */
export const PROFILE_NAME_MAX_LENGTH = 128;

/**
 * Client validation for first/last name.
 * Trims for emptiness and length; does not restrict punctuation or Unicode.
 */
export function validateProfileName(
  value: string,
  label: 'First name' | 'Last name',
): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${label} is required.`;
  }
  if (trimmed.length > PROFILE_NAME_MAX_LENGTH) {
    return `${label} must be 128 characters or fewer.`;
  }
  return undefined;
}
