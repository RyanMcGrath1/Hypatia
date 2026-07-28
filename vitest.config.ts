import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    // Match Expo/Metro: __DEV__ is a compile-time global in RN apps.
    __DEV__: true,
  },
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
