import { describe, expect, it } from 'vitest';

import { resolveDevAuthBypass } from '@/lib/auth/resolveDevAuthBypass';

describe('resolveDevAuthBypass', () => {
  it('enables bypass for dev build + env "true"', () => {
    expect(
      resolveDevAuthBypass({ isDevBuild: true, envValue: 'true' }),
    ).toBe(true);
  });

  it('disables bypass for dev build + env "false"', () => {
    expect(
      resolveDevAuthBypass({ isDevBuild: true, envValue: 'false' }),
    ).toBe(false);
  });

  it('disables bypass for dev build + missing env', () => {
    expect(
      resolveDevAuthBypass({ isDevBuild: true, envValue: undefined }),
    ).toBe(false);
  });

  it('disables bypass for production build + env "true"', () => {
    expect(
      resolveDevAuthBypass({ isDevBuild: false, envValue: 'true' }),
    ).toBe(false);
  });

  it('disables bypass for production build + env "false"', () => {
    expect(
      resolveDevAuthBypass({ isDevBuild: false, envValue: 'false' }),
    ).toBe(false);
  });

  it.each(['TRUE', 'True', '1', 'yes', ' true', 'true '])(
    'does not treat %j as enabling bypass',
    (envValue) => {
      expect(resolveDevAuthBypass({ isDevBuild: true, envValue })).toBe(false);
    },
  );
});
