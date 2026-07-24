import { describe, expect, it } from 'vitest';

import {
  appRouteGroupGuard,
  authRouteGroupGuard,
  resolveAppRouteAccess,
} from '@/lib/auth/resolveAppRouteAccess';
import { resolveDevAuthBypass } from '@/lib/auth/resolveDevAuthBypass';
import { AppRoutes } from '@/constants/app/routes';

describe('resolveAppRouteAccess', () => {
  it('stays in restoring until token restore finishes', () => {
    expect(
      resolveAppRouteAccess({ isRestoring: true, canAccessApp: false }),
    ).toBe('restoring');
    expect(
      resolveAppRouteAccess({ isRestoring: true, canAccessApp: true }),
    ).toBe('restoring');
  });

  it('NO TOKEN / NO BYPASS → auth group', () => {
    const canAccessApp = false;
    expect(resolveAppRouteAccess({ isRestoring: false, canAccessApp })).toBe(
      'auth',
    );
    expect(authRouteGroupGuard(canAccessApp)).toBe(true);
    expect(appRouteGroupGuard(canAccessApp)).toBe(false);
  });

  it('TOKEN PRESENT → app group', () => {
    const canAccessApp = true;
    expect(resolveAppRouteAccess({ isRestoring: false, canAccessApp })).toBe(
      'app',
    );
    expect(authRouteGroupGuard(canAccessApp)).toBe(false);
    expect(appRouteGroupGuard(canAccessApp)).toBe(true);
  });

  it('DEV BYPASS / NO TOKEN → app group with token still null conceptually', () => {
    const isDevAuthBypass = resolveDevAuthBypass({
      isDevBuild: true,
      envValue: 'true',
    });
    const token: string | null = null;
    const isAuthenticated = token !== null;
    const canAccessApp = isAuthenticated || isDevAuthBypass;

    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isDevAuthBypass).toBe(true);
    expect(canAccessApp).toBe(true);
    expect(resolveAppRouteAccess({ isRestoring: false, canAccessApp })).toBe(
      'app',
    );
  });

  it('production build cannot unlock app via env bypass alone', () => {
    const isDevAuthBypass = resolveDevAuthBypass({
      isDevBuild: false,
      envValue: 'true',
    });
    const canAccessApp = false || isDevAuthBypass;
    expect(isDevAuthBypass).toBe(false);
    expect(canAccessApp).toBe(false);
    expect(resolveAppRouteAccess({ isRestoring: false, canAccessApp })).toBe(
      'auth',
    );
  });
});

describe('AppRoutes after (app) nesting', () => {
  it('keeps existing tab href constants unchanged', () => {
    expect(AppRoutes.tabsRoot).toBe('/(tabs)');
    expect(AppRoutes.tabsEconomy).toBe('/(tabs)/economy');
    expect(AppRoutes.economyDetail).toBe('/(tabs)/economy/[sectorId]');
    expect(AppRoutes.profile).toBe('/(tabs)/profile');
    expect(AppRoutes.article).toBe('/(tabs)/index/article');
  });
});
