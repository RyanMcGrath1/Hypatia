import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS,
  fetchCivicDivisionsByAddress,
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

  const loadDivisionsByAddress = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const base = getFlaskApiBaseUrl();
    const params = new URLSearchParams({ address: DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS });
    const url = `${base}/api/civic/divisions-by-address?${params.toString()}`;

    try {
      const data = await fetchCivicDivisionsByAddress(
        DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS,
        controller.signal,
      );
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
      if (err instanceof Error) {
        console.error(
          `[Explore] GET /api/civic/divisions-by-address failed url=${url} ${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ''}`,
        );
      } else {
        console.error(`[Explore] GET /api/civic/divisions-by-address failed url=${url}`, String(err));
      }
      setApiData(null);
      const hint = getFlaskHelloNetworkErrorMessage();
      const detail = err instanceof Error && err.message ? err.message : null;
      setError(detail ? `${hint}\n\n${detail}` : hint);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  /** Same handler; keeps a `loadHello` binding for Metro/HMR if an old reference lingers. */
  const loadHello = loadDivisionsByAddress;

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
          Call local Flask <ThemedText type="defaultSemiBold">GET /api/civic/divisions-by-address</ThemedText> with
          address <ThemedText type="defaultSemiBold">{DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS}</ThemedText> (same as{' '}
          <ThemedText type="defaultSemiBold">
            {`curl "http://127.0.0.1:5000/api/civic/divisions-by-address?address=${DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS}"`}
          </ThemedText>
          ). Base URL: <ThemedText type="defaultSemiBold">{getFlaskApiBaseUrl()}</ThemedText>.
          {'\n'}
          On a physical device, use your computer's LAN IP or{' '}
          <ThemedText type="defaultSemiBold">EXPO_PUBLIC_API_BASE_URL</ThemedText>; run Flask on{' '}
          <ThemedText type="defaultSemiBold">0.0.0.0:5000</ThemedText> for device access.
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
            <ThemedText style={styles.buttonLabel}>Fetch divisions by address</ThemedText>
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
