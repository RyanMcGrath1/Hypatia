import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppBanner } from '@/components/navigation/AppBanner';
import { Colors } from '@/constants/theme/Colors';
import { getTabScreenCanvasTint } from '@/constants/theme/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Protected application shell: AppBanner + nested tabs.
 * Mounted only when AuthProvider `canAccessApp` is true.
 */
export default function AppGroupLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const contentBackground = getTabScreenCanvasTint(colorScheme);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <AppBanner />
      <View style={{ flex: 1, backgroundColor: contentBackground }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </View>
  );
}
