import { describe, expect, it } from 'vitest';

import {
  PROFILE_NAME_MAX_LENGTH,
  validateProfileName,
} from '@/lib/profile/validateProfileName';

describe('validateProfileName', () => {
  it('rejects blank and whitespace-only values', () => {
    expect(validateProfileName('', 'First name')).toBe(
      'First name is required.',
    );
    expect(validateProfileName('   ', 'First name')).toBe(
      'First name is required.',
    );
    expect(validateProfileName('', 'Last name')).toBe(
      'Last name is required.',
    );
    expect(validateProfileName('\t\n', 'Last name')).toBe(
      'Last name is required.',
    );
  });

  it('rejects values longer than 128 characters after trim', () => {
    const tooLong = 'a'.repeat(PROFILE_NAME_MAX_LENGTH + 1);
    expect(validateProfileName(tooLong, 'First name')).toBe(
      'First name must be 128 characters or fewer.',
    );
    expect(validateProfileName(tooLong, 'Last name')).toBe(
      'Last name must be 128 characters or fewer.',
    );
  });

  it('accepts punctuation, hyphens, apostrophes, and Unicode', () => {
    expect(validateProfileName("O'Connor", 'Last name')).toBeUndefined();
    expect(validateProfileName('Anne-Marie', 'First name')).toBeUndefined();
    expect(validateProfileName('José', 'First name')).toBeUndefined();
    expect(validateProfileName('李', 'Last name')).toBeUndefined();
    expect(validateProfileName('Mary Jane', 'First name')).toBeUndefined();
  });

  it('accepts names at the max length boundary', () => {
    const exact = 'b'.repeat(PROFILE_NAME_MAX_LENGTH);
    expect(validateProfileName(exact, 'First name')).toBeUndefined();
  });
});
