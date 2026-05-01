import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Image } from "expo-image";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/SectionCard";
import { StateNoticeCard } from "@/components/StateNoticeCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Brand } from "@/constants/Colors";
import { NEWS_TOPIC_ICON_NAMES } from "@/constants/newsTopicIcons";
import { AppRoutes } from "@/constants/routes";
import { Radius, Spacing, getSemanticColors } from "@/constants/ThemeTokens";
import { Fonts } from "@/constants/Typography";
import {
  NEWS_FEED_PAGE_SIZE,
  NEWS_TOPIC_OPTIONS,
  fetchNewsTopHeadlines,
  getNewsApiNetworkErrorMessage,
  type NewsTopicId,
  type TopHeadlineItem,
} from "@/hooks/api/newsApi";
import { useColorScheme } from "@/hooks/useColorScheme";

const FEED_LANG = "en";

function headlineKey(item: TopHeadlineItem, index: number): string {
  return item.url ?? `idx-${index}-${item.title}`;
}

function dedupeAppend(prev: TopHeadlineItem[], more: TopHeadlineItem[]): TopHeadlineItem[] {
  const seen = new Set<string>();
  for (const p of prev) {
    seen.add(headlineKey(p, 0));
  }
  const out = [...prev];
  let i = 0;
  for (const m of more) {
    const k = headlineKey(m, i);
    i += 1;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(m);
    }
  }
  return out;
}

/**
 * Home tab: paginated news headlines from the Flask news API (port 5001).
 *
 * FlatList + infinite scroll: page 1 on mount/topic/refresh; append pages via onEndReached until !hasMore.
 */
export default function HomeScreen() {
  const [headlines, setHeadlines] = useState<TopHeadlineItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<NewsTopicId>("all");
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  /** Topic/session generation: ignore stale first-page responses after topic switch. */
  const feedGenerationRef = useRef(0);
  const loadingMoreInFlightRef = useRef(false);
  const lastEndReachedRef = useRef(0);

  const selectedTopicIdRef = useRef(selectedTopicId);
  selectedTopicIdRef.current = selectedTopicId;

  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  const categoryParam = useMemo(
    () => (selectedTopicId === "all" ? undefined : selectedTopicId),
    [selectedTopicId],
  );

  const fetchFeedOptions = useCallback(
    (page: number, bustCache: boolean) => ({
      lang: FEED_LANG,
      max: NEWS_FEED_PAGE_SIZE,
      page,
      category: categoryParam,
      bustCache,
    }),
    [categoryParam],
  );

  const loadFirstPage = useCallback(
    async (opts: { bustCache: boolean; generation: number }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!opts.bustCache) {
        setIsLoading(true);
      }
      setError(null);
      setPaginationError(null);

      try {
        const result = await fetchNewsTopHeadlines(controller.signal, fetchFeedOptions(1, opts.bustCache));
        if (opts.generation !== feedGenerationRef.current) {
          return;
        }
        setHeadlines(result.items);
        setHasMore(result.hasMore);
        setNextPage(result.nextPage);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (opts.generation !== feedGenerationRef.current) {
          return;
        }
        setHeadlines([]);
        setHasMore(false);
        setNextPage(null);
        const hint = getNewsApiNetworkErrorMessage();
        const detail = err instanceof Error && err.message ? err.message : null;
        setError(detail ? `${hint}\n\n${detail}` : hint);
      } finally {
        if (opts.generation !== feedGenerationRef.current) {
          return;
        }
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [fetchFeedOptions],
  );

  useEffect(() => {
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    loadingMoreInFlightRef.current = false;

    const generation = ++feedGenerationRef.current;
    setHeadlines([]);
    setHasMore(false);
    setNextPage(null);
    setError(null);
    setPaginationError(null);
    void loadFirstPage({ bustCache: false, generation });
    return () => {
      abortRef.current?.abort();
    };
  }, [selectedTopicId, loadFirstPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    loadingMoreInFlightRef.current = false;
    const generation = feedGenerationRef.current;
    void loadFirstPage({ bustCache: true, generation });
  }, [loadFirstPage]);

  const loadMoreHeadlines = useCallback(async () => {
    if (
      !hasMore ||
      nextPage === null ||
      loadingMoreInFlightRef.current ||
      isLoading ||
      refreshing
    ) {
      return;
    }

    const topicAtStart = selectedTopicIdRef.current;
    loadingMoreInFlightRef.current = true;
    setLoadingMore(true);
    setPaginationError(null);

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    try {
      const result = await fetchNewsTopHeadlines(controller.signal, fetchFeedOptions(nextPage, false));
      if (selectedTopicIdRef.current !== topicAtStart) {
        return;
      }
      setHeadlines((prev) => dedupeAppend(prev, result.items));
      setHasMore(result.hasMore);
      setNextPage(result.nextPage);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (selectedTopicIdRef.current !== topicAtStart) {
        return;
      }
      setPaginationError("Could not load more stories.");
    } finally {
      loadingMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchFeedOptions, hasMore, isLoading, nextPage, refreshing]);

  const onEndReached = useCallback(() => {
    const now = Date.now();
    if (now - lastEndReachedRef.current < 750) {
      return;
    }
    lastEndReachedRef.current = now;
    void loadMoreHeadlines();
  }, [loadMoreHeadlines]);

  const openArticle = useCallback((url: string, title: string) => {
    router.push({
      pathname: AppRoutes.article,
      params: { url, title },
    });
  }, []);

  const renderHeadlineItem = useCallback(
    ({ item, index }: { item: TopHeadlineItem; index: number }) => (
      <Pressable
        accessibilityRole={item.url ? "button" : "none"}
        accessibilityHint={item.url ? "Opens full article" : undefined}
        disabled={!item.url}
        style={({ pressed }) => ({
          opacity: item.url ? (pressed ? 0.88 : 1) : 1,
        })}
        onPress={() => item.url && openArticle(item.url, item.title)}
      >
        <SectionCard
          backgroundColor={semantic.cardBackground}
          borderColor={semantic.cardBorder}
          style={index === 0 ? { ...styles.headlineCard, ...styles.headlineCardFirst } : styles.headlineCard}
        >
          {item.imageUrl ? (
            <Image
              accessible={false}
              source={{ uri: item.imageUrl }}
              style={[styles.headlineImage, { backgroundColor: semantic.cardSubtleBackground }]}
              contentFit="cover"
              transition={200}
            />
          ) : null}
          <ThemedText type="subtitle">{item.title}</ThemedText>
          {item.meta ? (
            <ThemedText style={[styles.meta, { color: semantic.mutedText }]}>{item.meta}</ThemedText>
          ) : null}
          {item.description ? (
            <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>{item.description}</ThemedText>
          ) : null}
        </SectionCard>
      </Pressable>
    ),
    [openArticle, semantic.cardBackground, semantic.cardBorder, semantic.cardSubtleBackground, semantic.mutedText],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <ScreenHeader
          title="Hypatia"
          subtitle={`${new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}`}
          subtitleColor={semantic.mutedText}
          subtitleStyle={styles.headerSubtitle}
        />

        <View style={styles.topicCarouselBleed}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicCarouselContent}>
            {NEWS_TOPIC_OPTIONS.map((topic) => {
              const selected = topic.id === selectedTopicId;
              return (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${topic.label} headlines`}
                  onPress={() => setSelectedTopicId(topic.id)}
                  style={({ pressed }) => [
                    styles.topicChip,
                    {
                      backgroundColor: selected ? semantic.accent : semantic.cardSubtleBackground,
                      borderColor: selected ? semantic.accent : semantic.cardBorder,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <View style={styles.topicChipRow}>
                    <Ionicons
                      name={NEWS_TOPIC_ICON_NAMES[topic.id]}
                      size={15}
                      color={selected ? Brand.paper : semantic.mutedText}
                      accessible={false}
                    />
                    <ThemedText
                      style={{
                        fontFamily: selected ? Fonts.bodySemiBold : Fonts.bodyMedium,
                        fontSize: 14,
                        lineHeight: 18,
                        color: selected ? Brand.paper : semantic.mutedText,
                      }}
                    >
                      {topic.label}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {isLoading && headlines.length === 0 ? (
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
              const generation = feedGenerationRef.current;
              void loadFirstPage({ bustCache: false, generation });
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
      </View>
    ),
    [
      error,
      headlines.length,
      isLoading,
      loadFirstPage,
      semantic.accent,
      semantic.cardBackground,
      semantic.cardBorder,
      semantic.cardSubtleBackground,
      semantic.danger,
      semantic.mutedText,
      selectedTopicId,
    ],
  );

  const listFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={semantic.accent} />
          <ThemedText style={[styles.footerHint, { color: semantic.mutedText }]}>Loading more…</ThemedText>
        </View>
      );
    }
    if (paginationError) {
      return (
        <View style={styles.footerError}>
          <ThemedText style={[styles.footerHint, { color: semantic.danger }]}>{paginationError}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading more headlines"
            hitSlop={8}
            onPress={() => void loadMoreHeadlines()}
          >
            <ThemedText style={{ color: semantic.accent, fontWeight: "600" }}>Try again</ThemedText>
          </Pressable>
        </View>
      );
    }
    return null;
  }, [loadingMore, paginationError, loadMoreHeadlines, semantic.accent, semantic.danger, semantic.mutedText]);

  return (
    <ThemedView style={styles.screen}>
      <FlatList
        data={headlines}
        keyExtractor={(item, index) => headlineKey(item, index)}
        renderItem={renderHeadlineItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={semantic.accent}
            colors={[semantic.accent]}
            progressBackgroundColor={semantic.cardBackground}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 112,
    flexGrow: 1,
  },
  listHeader: {
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerSubtitle: {
    fontSize: 20,
    lineHeight: 28,
  },
  topicCarouselBleed: {
    marginHorizontal: -Spacing.lg,
  },
  topicCarouselContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 2,
  },
  topicChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
  },
  topicChipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headlineCard: {
    gap: Spacing.sm,
    overflow: "hidden",
  },
  headlineCardFirst: {
    marginTop: 0,
  },
  headlineImage: {
    width: "100%",
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 44,
  },
  footerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  footerError: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  footerHint: {
    fontSize: 13,
    textAlign: "center",
  },
});
