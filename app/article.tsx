import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import { useColorScheme } from '@/hooks/useColorScheme';

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Accepts raw or single-encoded URL from expo-router search params.
 */
function normalizeArticleUrl(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const candidates = [raw];
  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    /* keep raw only */
  }
  for (const attempt of candidates) {
    try {
      const u = new URL(attempt.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        continue;
      }
      return u.href;
    } catch {
      /* try next */
    }
  }
  return null;
}

function decodeTitle(raw: string | undefined): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function ArticleWebViewScreen() {
  const params = useLocalSearchParams<{ url?: string | string[]; title?: string | string[] }>();
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);

  const rawUrl = firstParam(params.url);
  const rawTitle = firstParam(params.title);

  const articleUrl = useMemo(() => normalizeArticleUrl(rawUrl), [rawUrl]);
  const decodedTitle = useMemo(() => decodeTitle(rawTitle), [rawTitle]);

  const headerTitle = useMemo(() => {
    if (!decodedTitle?.trim()) {
      return 'Article';
    }
    const t = decodedTitle.trim();
    return t.length > 42 ? `${t.slice(0, 42)}…` : t;
  }, [decodedTitle]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sharedHeaderOptions = {
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerBackButtonDisplayMode: 'minimal' as const,
    headerStyle: {
      backgroundColor: semantic.screenBackground,
    },
    headerTintColor: theme.tint,
    headerTitleStyle: {
      color: theme.text,
      fontWeight: '600' as const,
    },
    headerShadowVisible: false,
  };

  const onLoadEnd = () => {
    setLoading(false);
  };

  const onError = (e: NativeSyntheticEvent<{ description?: string }>) => {
    setLoading(false);
    const desc = e.nativeEvent.description;
    setErrorMessage(desc?.trim() ? desc : 'Unable to load this page.');
  };

  const onHttpError = (e: NativeSyntheticEvent<{ statusCode: number }>) => {
    const status = e.nativeEvent.statusCode;
    if (status >= 400) {
      setErrorMessage(`Page returned error ${status}.`);
    }
  };

  const openInSystemBrowser = () => {
    if (articleUrl) {
      void WebBrowser.openBrowserAsync(articleUrl);
    }
  };

  if (!articleUrl) {
    return (
      <ThemedView style={styles.screen}>
        <Stack.Screen
          options={{
            title: 'Article',
            ...sharedHeaderOptions,
          }}
        />
        <View style={styles.centered}>
          <ThemedText type="defaultSemiBold">Invalid link</ThemedText>
          <ThemedText style={[styles.hint, { color: semantic.mutedText }]}>
            This story does not have a supported web address.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen
        options={{
          title: headerTitle,
          ...sharedHeaderOptions,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open in system browser"
              onPress={openInSystemBrowser}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, paddingHorizontal: Spacing.sm })}
            >
              <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>Browser</ThemedText>
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={semantic.accent} />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.centered}>
          <ThemedText type="defaultSemiBold">Could not load article</ThemedText>
          <ThemedText style={[styles.hint, { color: semantic.mutedText }]}>{errorMessage}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open in system browser"
            onPress={openInSystemBrowser}
            style={({ pressed }) => [styles.outlineButton, { borderColor: theme.tint, opacity: pressed ? 0.85 : 1 }]}
          >
            <ThemedText style={{ color: theme.tint, fontWeight: '600' }}>Open in browser</ThemedText>
          </Pressable>
        </View>
      ) : (
        <WebView
          source={{ uri: articleUrl }}
          style={styles.webview}
          onLoadStart={() => {
            setLoading(true);
          }}
          onLoadEnd={onLoadEnd}
          onError={onError}
          onHttpError={onHttpError}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          allowsInlineMediaPlayback
          originWhitelist={['https://*', 'http://*']}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  hint: {
    textAlign: 'center',
    lineHeight: 20,
  },
  outlineButton: {
    marginTop: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
  },
});
