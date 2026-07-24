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
    'app/(auth)/index.tsx',
    'Authentication setup in progress',
    'Temporary auth landing screen is missing.',
  );

  console.log('Navigation smoke check passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Navigation smoke check failed:\n${message}`);
  process.exit(1);
}
