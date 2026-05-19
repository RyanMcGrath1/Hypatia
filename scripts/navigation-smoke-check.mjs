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
    'app/(tabs)/economy/index.tsx',
    'pathname: AppRoutes.economyDetail',
    'Economy tile navigation route changed unexpectedly.',
  );

  // Detail stack lives under the Economy tab so the tab bar stays visible.
  assertContains(
    'app/(tabs)/economy/_layout.tsx',
    'gestureEnabled: true',
    'Economy tab stack gesture navigation is not configured.',
  );

  // Route constants should keep tabs + detail route contract centralized.
  assertContains(
    'constants/app/routes.ts',
    "economyDetail: '/(tabs)/economy/[sectorId]'",
    'Route constants do not define economy detail path.',
  );

  console.log('Navigation smoke check passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Navigation smoke check failed:\n${message}`);
  process.exit(1);
}
