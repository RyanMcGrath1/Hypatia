import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";

import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SectionCard } from "@/components/SectionCard";
import { StateNoticeCard } from "@/components/StateNoticeCard";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Brand } from "@/constants/Colors";
import { NEWS_TOPIC_ICON_NAMES } from "@/constants/newsTopicIcons";
import { Radius, Spacing, getSemanticColors } from "@/constants/ThemeTokens";
import { Fonts } from "@/constants/Typography";
import {
  NEWS_TOPIC_OPTIONS,
  fetchNewsTopHeadlines,
  getNewsApiNetworkErrorMessage,
  type NewsTopicId,
  type TopHeadlineItem,
} from "@/hooks/api/newsApi";
import { useColorScheme } from "@/hooks/useColorScheme";

/**
 * Home tab: news headlines from the local news API.
 *
 * Page anatomy (top → bottom):
 * 1. ThemedView — full-screen shell matching app background
 * 2. ScrollView — vertical feed + pull-to-refresh (RefreshControl)
 * 3. ScreenHeader — title + subtitle
 * 4. Topic carousel — horizontal chips; selection sets `category` on headline fetch
 * 5. Loading card — first fetch only (not pull-to-refresh)
 * 6. Error card — retry; after a failed refresh, list may still show below if data existed
 * 7. Empty state — no items and no error
 * 8. Headline cards — Pressable row per story (optional image, title, meta, description)
 */
export default function HomeScreen() {
  const [headlines, setHeadlines] = useState<TopHeadlineItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<NewsTopicId>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Incremented per fetch so slower/aborted requests cannot overwrite newer results. */
  const fetchGenerationRef = useRef(0);

  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  /** Fetch headlines; `asRefresh` uses pull-to-refresh spinner and preserves rows on error. */
  const loadHeadlines = useCallback(
    async (options?: { asRefresh?: boolean }) => {
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
        const category =
          selectedTopicId === "all" ? undefined : selectedTopicId;
        const items = await fetchNewsTopHeadlines(controller.signal, {
          bustCache: asRefresh,
          category,
        });
        if (generation !== fetchGenerationRef.current) {
          return;
        }
        setHeadlines(items);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
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
    },
    [selectedTopicId],
  );

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
    /* Root: themed background for this tab */
    <ThemedView style={styles.screen}>
      {/* Main scroll surface; RefreshControl = native pull-down reload */}
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
        }
      >
        {/* ─── Static chrome ─── */}
        <ScreenHeader
          title="Hypatia"
          subtitle={`${new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}`}
          subtitleColor={semantic.mutedText}
          subtitleStyle={styles.headerSubtitle}
        />

        {/* Topic filters: horizontal chip carousel */}
        <View style={styles.topicCarouselBleed}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicCarouselContent}
          >
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
                      backgroundColor: selected
                        ? semantic.accent
                        : semantic.cardSubtleBackground,
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

        {/* ─── Async states (mutually exclusive paths for “first paint”) ─── */}
        {isLoading ? (
          <SectionCard
            backgroundColor={semantic.cardBackground}
            borderColor={semantic.cardBorder}
          >
            <View style={styles.loadingRow}>
              <ActivityIndicator color={semantic.accent} />
              <ThemedText style={{ color: semantic.mutedText }}>
                Loading headlines…
              </ThemedText>
            </View>
          </SectionCard>
        ) : null}

        {/* Error + Retry; can appear above an existing list after a failed refresh */}
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

        {/* Empty API response (no rows, no error) */}
        {!isLoading && error === null && headlines.length === 0 ? (
          <EmptyState
            title="No headlines"
            body="The API returned no stories to display."
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
            bodyColor={semantic.mutedText}
          />
        ) : null}

        {/* ─── Feed: stacked story cards (shown whenever there is at least one row) ─── */}
        {!isLoading && headlines.length > 0 ? (
          /* ─── Headlines stack: one column of cards ─── */
          <View style={styles.cardsWrap}>
            {headlines.map((item, index) => {
              const key = `${item.title}-${index}`;
              return (
                /* One headline row: Pressable wraps the whole card; opens item.url when present */
                <Pressable
                  key={key}
                  accessibilityRole={item.url ? "button" : "none"}
                  accessibilityHint={
                    item.url ? "Opens article in browser" : undefined
                  }
                  disabled={!item.url}
                  style={({ pressed }) => ({
                    opacity: item.url ? (pressed ? 0.88 : 1) : 1,
                  })}
                  onPress={() => item.url && openUrl(item.url)}
                >
                  {/* Card shell: padding + border from SectionCard */}
                  <SectionCard
                    backgroundColor={semantic.cardBackground}
                    borderColor={semantic.cardBorder}
                    style={styles.headlineCard}
                  >
                    {/* (1) Optional hero image — full width, fixed aspect */}
                    {item.imageUrl ? (
                      <Image
                        accessible={false}
                        source={{ uri: item.imageUrl }}
                        style={[
                          styles.headlineImage,
                          { backgroundColor: semantic.cardSubtleBackground },
                        ]}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : null}
                    {/* (2) Primary headline */}
                    <ThemedText type="subtitle">{item.title}</ThemedText>
                    {/* (3) Secondary line: source / date when present */}
                    {item.meta ? (
                      <ThemedText
                        style={[styles.meta, { color: semantic.mutedText }]}
                      >
                        {item.meta}
                      </ThemedText>
                    ) : null}
                    {/* (4) Body copy / excerpt — tap targets the whole card (Pressable wrapper) */}
                    {item.description ? (
                      <ThemedText
                        style={[styles.copy, { color: semantic.mutedText }]}
                      >
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
  /** Larger than ScreenHeader default (16) for the date line */
  headerSubtitle: {
    fontSize: 20,
    lineHeight: 28,
  },
  /** Cancel parent horizontal padding so topic chips can scroll to screen edges */
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
  /** Scroll padding + gap between SectionCards / blocks; bottom inset clears the tab bar */
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
    overflow: "hidden",
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
});
