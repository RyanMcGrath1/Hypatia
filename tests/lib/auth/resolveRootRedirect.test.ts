import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { AppRoutes } from '@/constants/app/routes';
import { resolveRootRedirect } from '@/lib/auth/resolveRootRedirect';

describe('resolveRootRedirect', () => {
  it('waits while AuthProvider is restoring — no premature Login redirect', () => {
    expect(
      resolveRootRedirect({ isRestoring: true, canAccessApp: false }),
    ).toEqual({ kind: 'wait' });
    expect(
      resolveRootRedirect({ isRestoring: true, canAccessApp: true }),
    ).toEqual({ kind: 'wait' });
  });

  it('unauthenticated root (/) → Login, never verify-email-change', () => {
    const decision = resolveRootRedirect({
      isRestoring: false,
      canAccessApp: false,
    });
    expect(decision).toEqual({
      kind: 'redirect',
      href: AppRoutes.authLogin,
    });
    expect(decision.kind === 'redirect' && decision.href).toBe('/login');
    expect(decision.kind === 'redirect' && decision.href).not.toBe(
      AppRoutes.verifyEmailChange,
    );
    expect(decision.kind === 'redirect' && decision.href).not.toBe(
      '/verify-email-change',
    );
  });

  it('authenticated root (/) → protected app home', () => {
    expect(
      resolveRootRedirect({ isRestoring: false, canAccessApp: true }),
    ).toEqual({
      kind: 'redirect',
      href: AppRoutes.tabsRoot,
    });
  });

  it('dev bypass root (/) → protected app home without a Session', () => {
    // Mirrors AuthProvider: canAccessApp = isAuthenticated || isDevAuthBypass
    const token = null;
    const isAuthenticated = token !== null;
    const isDevAuthBypass = true;
    const canAccessApp = isAuthenticated || isDevAuthBypass;

    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(canAccessApp).toBe(true);
    expect(
      resolveRootRedirect({ isRestoring: false, canAccessApp }),
    ).toEqual({
      kind: 'redirect',
      href: AppRoutes.tabsRoot,
    });
  });
});

describe('app/index.tsx root routing contract', () => {
  const indexSource = readFileSync(
    resolve(__dirname, '../../../app/index.tsx'),
    'utf8',
  );
  const layoutSource = readFileSync(
    resolve(__dirname, '../../../app/_layout.tsx'),
    'utf8',
  );

  it('root index is the explicit `/` decision — uses resolveRootRedirect', () => {
    expect(indexSource).toMatch(/resolveRootRedirect/);
    expect(indexSource).toMatch(/Redirect/);
    expect(indexSource).toMatch(/canAccessApp/);
    expect(indexSource).toMatch(/isRestoring/);
  });

  it('root index never redirects to the email verification utility', () => {
    expect(indexSource).not.toMatch(
      /Redirect\s+href=\{[^}]*verify|href:\s*AppRoutes\.verifyEmailChange/,
    );
    expect(indexSource).toMatch(/decision\.href/);
  });

  it('root layout declares index before verify-email-change', () => {
    expect(layoutSource).toMatch(/name="index"/);
    expect(layoutSource).toMatch(/name="verify-email-change"/);
    const indexDecl = layoutSource.indexOf('name="index"');
    const verifyDecl = layoutSource.indexOf('name="verify-email-change"');
    expect(indexDecl).toBeGreaterThan(-1);
    expect(verifyDecl).toBeGreaterThan(-1);
    expect(indexDecl).toBeLessThan(verifyDecl);
  });
});
