import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

return (
    // Apply the theme based on the user's color scheme preference (dark or light)
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Main tab navigation screen */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Fallback screen for unmatched routes */}
        <Stack.Screen name="+not-found" />
      </Stack>
      {/* Status bar styling */}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
