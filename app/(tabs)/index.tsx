import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Image } from 'expo-image';

import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { StateNoticeCard } from '@/components/StateNoticeCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Radius, Spacing, getSemanticColors } from '@/constants/ThemeTokens';
import {
  fetchNewsTopHeadlines,
  getNewsApiBaseUrl,
  getNewsApiNetworkErrorMessage,
  type TopHeadlineItem,
} from '@/hooks/api/newsApi';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const [headlines, setHeadlines] = useState<TopHeadlineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Incremented per fetch so slower/aborted requests cannot overwrite newer results. */
  const fetchGenerationRef = useRef(0);

  const colorScheme = useColorScheme() ?? 'light';
  const semantic = getSemanticColors(colorScheme);
  const newsBaseUrl = getNewsApiBaseUrl();

  const loadHeadlines = useCallback(async (options?: { asRefresh?: boolean }) => {
    const asRefresh = options?.asRefresh ?? false;
    const generation = ++fetchGenerationRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (asRefresh) {
      setRefreshing(true);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const items = await fetchNewsTopHeadlines(controller.signal, {
        bustCache: asRefresh,
      });
      if (generation !== fetchGenerationRef.current) {
        return;
      }
      setHeadlines(items);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (generation !== fetchGenerationRef.current) {
        return;
      }
      if (!asRefresh) {
        setHeadlines([]);
      }
      const hint = getNewsApiNetworkErrorMessage();
      const detail = err instanceof Error && err.message ? err.message : null;
      setError(detail ? `${hint}\n\n${detail}` : hint);
    } finally {
      if (generation !== fetchGenerationRef.current) {
        return;
      }
      if (asRefresh) {
        setRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHeadlines();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadHeadlines]);

  const openUrl = (url: string) => {
    void Linking.openURL(url);
  };

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHeadlines({ asRefresh: true })}
            tintColor={semantic.accent}
            colors={[semantic.accent]}
            progressBackgroundColor={semantic.cardBackground}
          />
        }>
        <ScreenHeader
          title="Hypatia"
          subtitle="Top stories — pull down to refresh, or reload when you open this tab."
          subtitleColor={semantic.mutedText}
        />

        <SectionCard backgroundColor={semantic.cardSubtleBackground} borderColor={semantic.cardBorder}>
          <ThemedText type="defaultSemiBold">News feed</ThemedText>
          <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>
            Loading headlines from{' '}
            <ThemedText type="defaultSemiBold">GET /api/news/top-headlines</ThemedText> at{' '}
            <ThemedText type="defaultSemiBold">{newsBaseUrl}</ThemedText>.
          </ThemedText>
        </SectionCard>

        {isLoading ? (
          <SectionCard backgroundColor={semantic.cardBackground} borderColor={semantic.cardBorder}>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={semantic.accent} />
              <ThemedText style={{ color: semantic.mutedText }}>Loading headlines…</ThemedText>
            </View>
          </SectionCard>
        ) : null}

        {error !== null && !isLoading ? (
          <StateNoticeCard
            title="Unable to load headlines"
            message={error}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
            actionLabel="Retry"
            actionColor={semantic.accent}
            onActionPress={() => {
              void loadHeadlines();
            }}
          />
        ) : null}

        {!isLoading && error === null && headlines.length === 0 ? (
          <EmptyState
            title="No headlines"
            body="The API returned no stories to display."
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
            bodyColor={semantic.mutedText}
          />
        ) : null}

        {!isLoading && headlines.length > 0 ? (
          /* ─── Headlines stack: one column of cards ─── */
          <View style={styles.cardsWrap}>
            {headlines.map((item, index) => {
              const key = `${item.title}-${index}`;
              return (
                /* One headline row: Pressable wraps the whole card; opens item.url when present */
                <Pressable
                  key={key}
                  accessibilityRole={item.url ? 'button' : 'none'}
                  accessibilityHint={item.url ? 'Opens article in browser' : undefined}
                  disabled={!item.url}
                  style={({ pressed }) => ({
                    opacity: item.url ? (pressed ? 0.88 : 1) : 1,
                  })}
                  onPress={() => item.url && openUrl(item.url)}>
                  {/* Card shell: padding + border from SectionCard */}
                  <SectionCard
                    backgroundColor={semantic.cardBackground}
                    borderColor={semantic.cardBorder}
                    style={styles.headlineCard}>
                    {/* (1) Optional hero image — full width, fixed aspect */}
                    {item.imageUrl ? (
                      <Image
                        accessible={false}
                        source={{ uri: item.imageUrl }}
                        style={[styles.headlineImage, { backgroundColor: semantic.cardSubtleBackground }]}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : null}
                    {/* (2) Primary headline */}
                    <ThemedText type="subtitle">{item.title}</ThemedText>
                    {/* (3) Secondary line: source / date when present */}
                    {item.meta ? (
                      <ThemedText style={[styles.meta, { color: semantic.mutedText }]}>
                        {item.meta}
                      </ThemedText>
                    ) : null}
                    {/* (4) Body copy / excerpt — tap targets the whole card (Pressable wrapper) */}
                    {item.description ? (
                      <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>
                        {item.description}
                      </ThemedText>
                    ) : null}
                  </SectionCard>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 112,
    gap: Spacing.md,
  },
  cardsWrap: {
    gap: Spacing.md,
  },
  headlineCard: {
    gap: Spacing.sm,
    overflow: 'hidden',
  },
  headlineImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
  },
  copy: {
    lineHeight: 20,
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
  },
});
