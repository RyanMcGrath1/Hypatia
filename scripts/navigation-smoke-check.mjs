import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function assertContains(filePath, expected, message) {
  const content = readFileSync(resolve(process.cwd(), filePath), 'utf8');
  if (!content.includes(expected)) {
    throw new Error(`${message}\nMissing snippet "${expected}" in ${filePath}`);
  }
}

try {
  // Economy tile navigation should route to detail screen.
  assertContains(
    'components/economy/tab/EconomySectorFeedList.tsx',
    'pathname: AppRoutes.economyDetail',
    'Economy tile navigation route changed unexpectedly.',
  );

  // Detail stack lives under the Economy tab so the tab bar stays visible.
  assertContains(
    'app/(app)/(tabs)/economy/_layout.tsx',
    'forgivingStackScreenOptions',
    'Economy tab stack gesture navigation is not configured.',
  );
  assertContains(
    'constants/navigation/stackScreenOptions.ts',
    'gestureEnabled: true',
    'Shared stack options must keep gestures enabled.',
  );

  // Route constants should keep tabs + detail route contract centralized.
  assertContains(
    'constants/app/routes.ts',
    "economyDetail: '/(tabs)/economy/[sectorId]'",
    'Route constants do not define economy detail path.',
  );

  // Protected app shell owns AppBanner (not the auth group).
  assertContains(
    'app/(app)/_layout.tsx',
    'AppBanner',
    'Protected app layout must render AppBanner.',
  );
  assertContains(
    'app/_layout.tsx',
    'Stack.Protected',
    'Root layout must use Stack.Protected for auth/app gating.',
  );
  assertContains(
    'app/(auth)/login.tsx',
    'Log In',
    'Login screen is missing.',
  );
  assertContains(
    'app/(auth)/register.tsx',
    'Create Account',
    'Registration screen is missing.',
  );
  assertContains(
    'app/(auth)/index.tsx',
    'Redirect',
    'Auth index should redirect to Login.',
  );
  assertContains(
    'app/(auth)/index.tsx',
    'authLogin',
    'Auth index must redirect to the Login route constant.',
  );
  assertContains(
    'app/(auth)/_layout.tsx',
    'login',
    'Auth group layout must declare the login screen.',
  );
  assertContains(
    'app/(auth)/_layout.tsx',
    'register',
    'Auth group layout must declare the register screen.',
  );
  assertContains(
    'app/(auth)/_layout.tsx',
    'login-totp',
    'Auth group layout must declare the TOTP login screen.',
  );
  assertContains(
    'app/(auth)/_layout.tsx',
    'AuthFlowProvider',
    'Auth group layout must mount AuthFlowProvider for MFA challenge handoff.',
  );
  assertContains(
    'constants/app/routes.ts',
    "authLogin: '/login'",
    'Route constants must define the Login path.',
  );
  assertContains(
    'constants/app/routes.ts',
    "authRegister: '/register'",
    'Route constants must define the Registration path.',
  );
  assertContains(
    'constants/app/routes.ts',
    "authLoginTotp: '/login-totp'",
    'Route constants must define the TOTP login path.',
  );
  assertContains(
    'app/(auth)/login-totp.tsx',
    'Verify',
    'TOTP login screen is missing.',
  );
  assertContains(
    'app/(auth)/login.tsx',
    'authLoginTotp',
    'Login must navigate to TOTP when totp_required.',
  );
  assertContains(
    'app/(auth)/login.tsx',
    'beginTotpLogin',
    'Login must store MFA challenge via beginTotpLogin.',
  );
  assertContains(
    'app/(auth)/login-totp.tsx',
    'completeTotpLogin',
    'TOTP screen must complete login via completeTotpLogin.',
  );
  assertContains(
    'app/(auth)/login-totp.tsx',
    'establishSession',
    'TOTP success must establish a session.',
  );
  assertContains(
    'app/(auth)/login-totp.tsx',
    'tabsRoot',
    'TOTP success must route to the protected app home.',
  );

  // AppBanner Profile affordance → protected Profile route under (app)/(tabs).
  assertContains(
    'components/navigation/AppBanner.tsx',
    'AppRoutes.profile',
    'AppBanner Profile icon must navigate via AppRoutes.profile.',
  );
  assertContains(
    'constants/app/routes.ts',
    "profile: '/(tabs)/profile'",
    'Route constants must define the Profile path.',
  );
  assertContains(
    'app/(app)/(tabs)/profile.tsx',
    'useProfile',
    'Profile route must load account data via useProfile.',
  );
  assertContains(
    'app/(app)/(tabs)/_layout.tsx',
    'name="profile"',
    'Tabs layout must declare the Profile screen (href:null, banner entry).',
  );

  console.log('Navigation smoke check passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Navigation smoke check failed:\n${message}`);
  process.exit(1);
}
