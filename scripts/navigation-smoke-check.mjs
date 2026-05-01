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
    'app/(tabs)/economy.tsx',
    'pathname: AppRoutes.economyDetail',
    'Economy tile navigation route changed unexpectedly.',
  );

  // Detail screen should enable gesture + minimal back button styling.
  assertContains(
    'app/economy/[sectorId].tsx',
    'gestureEnabled: true',
    'Detail screen gesture navigation is not configured.',
  );
  assertContains(
    'app/economy/[sectorId].tsx',
    "headerBackButtonDisplayMode: 'minimal'",
    'Detail header back button display mode changed unexpectedly.',
  );

  // Route constants should keep tabs + detail route contract centralized.
  assertContains(
    'constants/app/routes.ts',
    "economyDetail: '/economy/[sectorId]'",
    'Route constants do not define economy detail path.',
  );

  console.log('Navigation smoke check passed.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Navigation smoke check failed:\n${message}`);
  process.exit(1);
}
