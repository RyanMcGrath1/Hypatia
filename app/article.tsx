import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Colors } from "@/constants/theme/Colors";
import {
  Radius,
  Spacing,
  getSemanticColors,
} from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";

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
  if (!raw || typeof raw !== "string") {
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
      if (u.protocol !== "http:" && u.protocol !== "https:") {
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
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function ArticleWebViewScreen() {
  const params = useLocalSearchParams<{
    url?: string | string[];
    title?: string | string[];
  }>();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);

  const rawUrl = firstParam(params.url);
  const rawTitle = firstParam(params.title);

  const articleUrl = useMemo(() => normalizeArticleUrl(rawUrl), [rawUrl]);
  const decodedTitle = useMemo(() => decodeTitle(rawTitle), [rawTitle]);

  const headerTitle = useMemo(() => {
    if (!decodedTitle?.trim()) {
      return "Article";
    }
    const t = decodedTitle.trim();
    return t.length > 42 ? `${t.slice(0, 42)}…` : t;
  }, [decodedTitle]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [chatDraft, setChatDraft] = useState("");

  const insets = useSafeAreaInsets();
  /** Lifts composer above the software keyboard (KeyboardAvoidingView is unreliable with WebView on Android). */
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardBottomInset(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardBottomInset(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sharedHeaderOptions = {
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerBackButtonDisplayMode: "minimal" as const,
    headerStyle: {
      backgroundColor: semantic.screenBackground,
    },
    headerTintColor: theme.tint,
    headerTitleStyle: {
      color: theme.text,
      fontWeight: "600" as const,
    },
    headerShadowVisible: false,
  };

  const onLoadEnd = () => {
    setLoading(false);
  };

  const onError = (e: NativeSyntheticEvent<{ description?: string }>) => {
    setLoading(false);
    const desc = e.nativeEvent.description;
    setErrorMessage(desc?.trim() ? desc : "Unable to load this page.");
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

  const sendChatMessage = useCallback(() => {
    const text = chatDraft.trim();
    if (!text) {
      return;
    }
    Keyboard.dismiss();
    // Hook for assistant / comments API — keep draft cleared after send for now
    setChatDraft("");
  }, [chatDraft]);

  /** Extra space above the home indicator so the composer floats higher than edge-to-edge. */
  const chatBarBottomLift = Spacing.xl + Spacing.sm;

  const renderChatBar = () => (
    <View
      style={[
        styles.chatBarOuter,
        {
          paddingBottom:
            Math.max(insets.bottom, Spacing.sm) +
            chatBarBottomLift +
            keyboardBottomInset,
        },
      ]}
      accessibilityRole="toolbar"
    >
      <View
        style={[
          styles.chatBar,
          {
            borderColor: semantic.cardBorder,
            backgroundColor: semantic.cardBackground,
          },
          semantic.cardShadow,
        ]}
      >
        <TextInput
          value={chatDraft}
          onChangeText={setChatDraft}
          placeholder="Ask Hypatia"
          placeholderTextColor={semantic.mutedText}
          style={[
            styles.chatInput,
            {
              color: theme.text,
              backgroundColor: "transparent",
            },
          ]}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={sendChatMessage}
          editable
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          hitSlop={10}
          onPress={sendChatMessage}
          disabled={!chatDraft.trim()}
          style={({ pressed }) => ({
            opacity: chatDraft.trim() ? (pressed ? 0.75 : 1) : 0.35,
            padding: Spacing.sm,
          })}
        >
          <Ionicons name="sparkles" size={22} color={theme.tint} />
        </Pressable>
      </View>
    </View>
  );

  if (!articleUrl) {
    return (
      <ThemedView style={styles.screen}>
        <Stack.Screen
          options={{
            title: "Article",
            ...sharedHeaderOptions,
          }}
        />
        <View style={styles.keyboardAvoid}>
          <View style={styles.fillCenter}>
            <ThemedText type="defaultSemiBold">Invalid link</ThemedText>
            <ThemedText style={[styles.hint, { color: semantic.mutedText }]}>
              This story does not have a supported web address.
            </ThemedText>
          </View>
          {renderChatBar()}
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
              style={({ pressed }) => ({
                opacity: pressed ? 0.65 : 1,
                paddingHorizontal: Spacing.sm,
              })}
            >
              <ThemedText style={{ color: theme.tint, fontWeight: "600" }}>
                Browser
              </ThemedText>
            </Pressable>
          ),
        }}
      />

      <View style={styles.keyboardAvoid}>
        <View style={styles.webviewWrap}>
          {loading ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={semantic.accent} />
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.centered}>
              <ThemedText type="defaultSemiBold">
                Could not load article
              </ThemedText>
              <ThemedText style={[styles.hint, { color: semantic.mutedText }]}>
                {errorMessage}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open in system browser"
                onPress={openInSystemBrowser}
                style={({ pressed }) => [
                  styles.outlineButton,
                  { borderColor: theme.tint, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <ThemedText style={{ color: theme.tint, fontWeight: "600" }}>
                  Open in browser
                </ThemedText>
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
              originWhitelist={["https://*", "http://*"]}
            />
          )}
        </View>
        {renderChatBar()}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
    minHeight: 0,
  },
  webviewWrap: {
    flex: 1,
    minHeight: 0,
    position: "relative",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  chatBarOuter: {
    paddingHorizontal: Spacing.md,
  },
  chatBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  chatInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 0,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 22,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  fillCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  hint: {
    textAlign: "center",
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
