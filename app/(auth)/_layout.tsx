import { Stack } from 'expo-router';

import { AuthFlowProvider } from '@/components/auth/AuthFlowProvider';

/**
 * Unauthenticated route group (Login / Registration / TOTP verification).
 * AuthFlowProvider owns temporary MFA challenge state for this group only.
 * AppBanner intentionally lives on `(app)`, not here.
 */
export default function AuthGroupLayout() {
  return (
    <AuthFlowProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="login-totp" />
      </Stack>
    </AuthFlowProvider>
  );
}
