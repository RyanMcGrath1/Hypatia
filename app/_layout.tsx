import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, type MutableRefObject } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { Colors } from '@/constants/theme/Colors';
import { getTabScreenCanvasTint } from '@/constants/theme/ThemeTokens';
import { useAuthSession } from '@/hooks/useAuthSession';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  appRouteGroupGuard,
  authRouteGroupGuard,
  resolveAppRouteAccess,
} from '@/lib/auth/resolveAppRouteAccess';

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const contentBackground = getTabScreenCanvasTint(colorScheme);
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const canHideSplashRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        if (mounted) {
          canHideSplashRef.current = true;
        }
      } catch {
        canHideSplashRef.current = false;
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!loaded && !error) {
    return null;
  }

  const navigationTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            primary: theme.tint,
            background: contentBackground,
            card: contentBackground,
            text: theme.text,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            primary: theme.tint,
            background: contentBackground,
            card: contentBackground,
            text: theme.text,
          },
        };

  return (
    <AuthProvider>
      <ThemeProvider value={navigationTheme}>
        <SafeAreaProvider>
          <RootNavigationChrome
            themeBackground={theme.background}
            contentBackground={contentBackground}
            colorScheme={colorScheme}
            canHideSplashRef={canHideSplashRef}
          />
        </SafeAreaProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

type RootNavigationChromeProps = {
  themeBackground: string;
  contentBackground: string;
  colorScheme: 'light' | 'dark';
  canHideSplashRef: MutableRefObject<boolean>;
};

/**
 * Lives under AuthProvider so session restore can gate the protected Stack
 * without flashing auth or app shells.
 */
function RootNavigationChrome({
  themeBackground,
  contentBackground,
  colorScheme,
  canHideSplashRef,
}: RootNavigationChromeProps) {
  const { canAccessApp, isRestoring } = useAuthSession();
  const access = resolveAppRouteAccess({ isRestoring, canAccessApp });

  useEffect(() => {
    if (access !== 'restoring' && canHideSplashRef.current) {
      void SplashScreen.hideAsync().catch(() => {
        // No-op in runtimes that do not register a native splash controller.
      });
    }
  }, [access, canHideSplashRef]);

  if (access === 'restoring') {
    return null;
  }

  return (
    <>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: themeBackground }}
        edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, backgroundColor: contentBackground }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Explicit `/` — never rely on Stack order for the default route. */}
            <Stack.Screen name="index" />

            {/* Public utility / deep-link route — not an unauthenticated fallback. */}
            <Stack.Screen name="verify-email-change" />

            <Stack.Protected guard={authRouteGroupGuard(canAccessApp)}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>

            <Stack.Protected guard={appRouteGroupGuard(canAccessApp)}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>

            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </SafeAreaView>
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={themeBackground}
      />
    </>
  );
}
