/**
 * Development-only frontend auth bypass.
 *
 * Active only when BOTH are true:
 * - `isDevBuild` (__DEV__) is true
 * - `envValue` is exactly the string `"true"`
 *
 * This is NOT authentication and must never invent a session token.
 * Production builds (`isDevBuild === false`) cannot enable the bypass.
 */

export type ResolveDevAuthBypassInput = {
  /** Pass React Native / Expo `__DEV__`. */
  isDevBuild: boolean;
  /** Pass `process.env.EXPO_PUBLIC_DEV_AUTH_BYPASS` unchanged. */
  envValue: string | undefined;
};

/**
 * Pure bypass gate used by AuthProvider.
 * Values like `"TRUE"`, `"1"`, or `"yes"` do not enable the bypass.
 */
export function resolveDevAuthBypass({
  isDevBuild,
  envValue,
}: ResolveDevAuthBypassInput): boolean {
  return isDevBuild === true && envValue === 'true';
}
