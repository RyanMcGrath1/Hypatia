import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { StateNoticeCard } from '@/components/StateNoticeCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import {
  DEFAULT_CIVIC_SAMPLE_ADDRESS,
  DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS,
  fetchCivicDivisionsByAddress,
  getFlaskApiBaseUrl,
  getFlaskHelloNetworkErrorMessage,
} from '@/hooks/api/flaskMainApi';
import { useColorScheme } from '@/hooks/useColorScheme';

type ParsedDivision = {
  id: string;
  name: string;
  officeCount: number;
};

function parseDivisionCards(payload: unknown): ParsedDivision[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const asRecord = payload as Record<string, unknown>;
  const divisionsRecord = asRecord.divisions;
  if (!divisionsRecord || typeof divisionsRecord !== 'object') {
    return [];
  }
  return Object.entries(divisionsRecord as Record<string, unknown>)
    .slice(0, 20)
    .map(([id, value]) => {
      const details = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
      const name = typeof details.name === 'string' && details.name.trim().length > 0 ? details.name : id;
      const officeIndices = Array.isArray(details.officeIndices) ? details.officeIndices : [];
      return { id, name, officeCount: officeIndices.length };
    });
}

export default function ExploreScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<unknown | null>(null);
  const [address, setAddress] = useState(DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS);
  const [showRawResponse, setShowRawResponse] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const loadDivisionsByAddress = useCallback(async (requestedAddress: string) => {
    const normalizedAddress = requestedAddress.trim();
    if (!normalizedAddress) {
      setError('Enter an address or ZIP code before searching.');
      setApiData(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    const base = getFlaskApiBaseUrl();
    const params = new URLSearchParams({ address: normalizedAddress });
    const url = `${base}/api/civic/divisions-by-address?${params.toString()}`;

    try {
      const data = await fetchCivicDivisionsByAddress(
        normalizedAddress,
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
  const loadHello = () => loadDivisionsByAddress(address);

  const responseText =
    apiData === null
      ? null
      : typeof apiData === 'string'
        ? apiData
        : JSON.stringify(apiData, null, 2);
  const parsedDivisions = parseDivisionCards(apiData);

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Civic Explorer"
          subtitle="Find district and office coverage by address or ZIP code."
          subtitleColor={semantic.mutedText}
        />
        <SectionCard backgroundColor={semantic.cardSubtleBackground} borderColor={semantic.cardBorder}>
          <ThemedText style={[styles.subtitle, { color: semantic.mutedText }]}>
            Enter an address and we will call <ThemedText type="defaultSemiBold">GET /api/civic/divisions-by-address</ThemedText>.
            Base URL: <ThemedText type="defaultSemiBold">{getFlaskApiBaseUrl()}</ThemedText>.
          </ThemedText>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={`Try ${DEFAULT_CIVIC_SAMPLE_ADDRESS} or ${DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS}`}
            placeholderTextColor="#9ca3af"
            style={[
              styles.addressInput,
              { borderColor: semantic.cardBorder, color: semantic.mutedText, backgroundColor: semantic.cardBackground },
            ]}
            autoCapitalize="words"
            returnKeyType="search"
            onSubmitEditing={loadHello}
          />
          <View style={styles.examplesWrap}>
            {[DEFAULT_CIVIC_SAMPLE_ADDRESS, DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS].map((example) => (
              <Pressable
                key={example}
                style={({ pressed }) => [
                  styles.exampleChip,
                  {
                    borderColor: semantic.cardBorder,
                    backgroundColor: semantic.cardBackground,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
                onPress={() => setAddress(example)}>
                <ThemedText style={styles.exampleLabel}>{example}</ThemedText>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: semantic.accent, opacity: pressed ? 0.86 : 1 },
          ]}
          onPress={loadHello}
          disabled={isLoading}>
          {isLoading ? (
            <View style={styles.buttonLoading}>
              <ActivityIndicator color="#ffffff" />
              <ThemedText style={styles.buttonLabel}>Loading…</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.buttonLabel}>Find civic divisions</ThemedText>
          )}
        </Pressable>

        {error !== null && !isLoading && (
          <StateNoticeCard
            title="Unable to load civic data"
            message={error}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
            actionLabel="Retry"
            actionColor={semantic.accent}
            onActionPress={loadHello}
          />
        )}

        {parsedDivisions.length > 0 && !isLoading && error === null && (
          <View style={styles.resultsWrap}>
            <ThemedText type="defaultSemiBold">Matched divisions ({parsedDivisions.length})</ThemedText>
            {parsedDivisions.map((division) => (
              <SectionCard
                key={division.id}
                backgroundColor={semantic.cardBackground}
                borderColor={semantic.cardBorder}
                style={styles.divisionCard}>
                <ThemedText type="defaultSemiBold">{division.name}</ThemedText>
                <ThemedText style={{ color: semantic.mutedText, fontSize: 12 }}>{division.id}</ThemedText>
                <ThemedText style={{ color: semantic.mutedText }}>Offices linked: {division.officeCount}</ThemedText>
              </SectionCard>
            ))}
          </View>
        )}

        {responseText !== null && (
          <SectionCard backgroundColor={semantic.cardSubtleBackground} borderColor={semantic.cardBorder}>
            <Pressable
              style={({ pressed }) => [styles.rawToggle, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => setShowRawResponse((current) => !current)}>
              <ThemedText type="defaultSemiBold">{showRawResponse ? 'Hide raw response' : 'Show raw response'}</ThemedText>
            </Pressable>
            {showRawResponse && (
              <ThemedText selectable style={styles.response}>
                {responseText}
              </ThemedText>
            )}
          </SectionCard>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 112,
    gap: Spacing.md,
  },
  subtitle: {
    lineHeight: 20,
  },
  addressInput: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  examplesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  exampleLabel: {
    fontSize: 12,
  },
  button: {
    minHeight: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
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
  resultsWrap: {
    gap: 8,
  },
  divisionCard: {
    gap: 4,
  },
  rawToggle: {
    minHeight: 36,
    justifyContent: 'center',
  },
  response: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
});
