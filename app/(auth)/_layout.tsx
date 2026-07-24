import { Stack } from 'expo-router';

/**
 * Unauthenticated route group (Login / TOTP later).
 * AppBanner intentionally lives on `(app)`, not here.
 */
export default function AuthGroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
