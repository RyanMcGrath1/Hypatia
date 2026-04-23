import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  fetchFlaskHello,
  getFlaskApiBaseUrl,
  getFlaskHelloNetworkErrorMessage,
} from '@/hooks/useFlaskHelloSearch';

export default function ExploreScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<unknown | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const loadHello = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchFlaskHello(controller.signal);
      if (requestIdRef.current !== requestId) {
        return;
      }
      setApiData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (requestIdRef.current !== requestId) {
        return;
      }
      const url = `${getFlaskApiBaseUrl()}/hello`;
      if (err instanceof Error) {
        console.error(
          `[Explore] GET /hello failed url=${url} ${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ''}`,
        );
      } else {
        console.error(`[Explore] GET /hello failed url=${url}`, String(err));
      }
      setApiData(null);
      setError(getFlaskHelloNetworkErrorMessage());
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  const responseText =
    apiData === null
      ? null
      : typeof apiData === 'string'
        ? apiData
        : JSON.stringify(apiData, null, 2);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ThemedText type="title">Explore</ThemedText>
        <ThemedText style={styles.subtitle}>
          Call local Flask on <ThemedText type="defaultSemiBold">port 5000</ThemedText>:{' '}
          <ThemedText type="defaultSemiBold">GET /hello</ThemedText> at{' '}
          <ThemedText type="defaultSemiBold">{getFlaskApiBaseUrl()}/hello</ThemedText>.
          {'\n'}
          Defaults match <ThemedText type="defaultSemiBold">curl http://127.0.0.1:5000/hello</ThemedText> on web
          and iOS simulator; Android emulator uses <ThemedText type="defaultSemiBold">10.0.2.2:5000</ThemedText>.
          On a physical device, set <ThemedText type="defaultSemiBold">EXPO_PUBLIC_API_BASE_URL</ThemedText> to your
          computer's LAN URL (for example <ThemedText type="defaultSemiBold">http://192.168.x.x:5000</ThemedText>
          ).
        </ThemedText>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={loadHello}
          disabled={isLoading}>
          {isLoading ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator color="#ffffff" />
              <ThemedText style={styles.buttonLabel}>Loading…</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.buttonLabel}>Fetch /hello</ThemedText>
          )}
        </Pressable>

        {error !== null && !isLoading && (
          <ThemedText style={styles.error}>{error}</ThemedText>
        )}

        {responseText !== null && !isLoading && error === null && (
          <ThemedText selectable style={styles.response}>
            {responseText}
          </ThemedText>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitle: {
    marginTop: 8,
    lineHeight: 20,
  },
  button: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  error: {
    marginTop: 16,
    color: '#dc2626',
    lineHeight: 20,
  },
  response: {
    marginTop: 16,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
});
