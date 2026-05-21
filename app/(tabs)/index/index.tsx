import { useCallback, useMemo } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";

import { AppBrandBar } from "@/components/layout/AppBrandBar";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import {
  NewsFeedSkeletonList,
  NewsHeadlineCardSkeleton,
} from "@/components/news/NewsHeadlineCardSkeleton";
import { EmptyState } from "@/components/surfaces/EmptyState";
import { SectionCard } from "@/components/surfaces/SectionCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { NEWS_TOPIC_ICON_NAMES } from "@/constants/app/newsTopicIcons";
import { AppRoutes } from "@/constants/app/routes";
import { TAB_SCREEN_CONTENT_INSETS } from "@/constants/navigation/tabScreenContentInsets";
import { Brand } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { NEWS_TOPIC_OPTIONS, type TopHeadlineItem } from "@/hooks/api/newsApi";
import {
    headlineKey,
    useTopHeadlinesFeed,
} from "@/hooks/feed/useTopHeadlinesFeed";
import { useColorScheme } from "@/hooks/useColorScheme";
import { isEconomyDataPending } from "@/lib/economy/economyDataPending";

const FEED_LANG = "en";

/** Max characters for headline card description; longer copy is truncated with an ellipsis. */
const HEADLINE_CARD_DESCRIPTION_MAX_CHARS = 240;

function truncateHeadlineDescription(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) {
    return t;
  }
  const slice = t.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const base =
    lastSpace > maxChars * 0.55
      ? slice.slice(0, lastSpace).trimEnd()
      : slice.trimEnd();
  return `${base}…`;
}

/** Local clock: morning before noon, afternoon until 5pm, evening thereafter. */
function getTimeOfDayGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

function formatPublishedTimeAgo(published: string): string {
  const parsed = new Date(published);
  if (Number.isNaN(parsed.getTime())) {
    return published;
  }
  const elapsedMs = Date.now() - parsed.getTime();
  if (elapsedMs <= 0) {
    return "just now";
  }
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  if (elapsedMinutes < 60) {
    const mins = Math.max(1, elapsedMinutes);
    return `${mins} min${mins === 1 ? "" : "s"} ago`;
  }
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours} hr${elapsedHours === 1 ? "" : "s"} ago`;
}

/**
 * News tab: paginated news headlines from the Flask news API (port 5001).
 *
 * FlatList + infinite scroll: page 1 on mount/topic/refresh; append pages via onEndReached until !hasMore.
 */
export default function HomeScreen() {
  const {
    headlines,
    selectedTopicId,
    setSelectedTopicId,
    isLoading,
    loadingMore,
    refreshing,
    error,
    paginationError,
    onRefresh,
    onEndReached,
  } = useTopHeadlinesFeed({ lang: FEED_LANG });

  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);

  const feedPending = isEconomyDataPending({
    isLoading,
    error,
    hasData: headlines.length > 0,
  });

  const paginationPending = isEconomyDataPending({
    isLoading: loadingMore,
    error: paginationError,
    hasData: false,
  });

  const openArticle = useCallback((url: string, title: string) => {
    router.push({
      pathname: AppRoutes.article,
      params: { url, title },
    });
  }, []);

  const renderHeadlineItem = useCallback(
    ({ item, index }: { item: TopHeadlineItem; index: number }) => {
      const selectedTopicLabel =
        NEWS_TOPIC_OPTIONS.find((topic) => topic.id === selectedTopicId)
          ?.label ?? "General";
      const categoryLabel =
        item.category?.trim() && item.category.trim().length > 0
          ? item.category.trim()
          : selectedTopicLabel;
      const publishedLabel = item.published
        ? formatPublishedTimeAgo(item.published)
        : null;

      return (
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
            style={
              index === 0
                ? { ...styles.headlineCard, ...styles.headlineCardFirst }
                : styles.headlineCard
            }
          >
            <View
              style={[
                styles.categoryStamp,
                {
                  backgroundColor: semantic.cardSubtleBackground,
                  borderColor: semantic.cardBorder,
                },
              ]}
            >
              <ThemedText
                numberOfLines={1}
                style={[
                  styles.categoryStampText,
                  { color: semantic.mutedText },
                ]}
              >
                {categoryLabel}
              </ThemedText>
            </View>
            <ThemedText type="subtitle">{item.title}</ThemedText>
            {item.source || item.published || item.meta ? (
              <View style={styles.metaRow}>
                {item.source ? (
                  <ThemedText style={[styles.meta, { color: semantic.accent }]}>
                    {item.source}
                  </ThemedText>
                ) : null}
                {item.source && publishedLabel ? (
                  <ThemedText
                    style={[styles.meta, { color: semantic.mutedText }]}
                  >
                    {" · "}
                  </ThemedText>
                ) : null}
                {publishedLabel ? (
                  <ThemedText
                    style={[styles.meta, { color: semantic.mutedText }]}
                  >
                    {publishedLabel}
                  </ThemedText>
                ) : !item.source && item.meta ? (
                  <ThemedText
                    style={[styles.meta, { color: semantic.mutedText }]}
                  >
                    {item.meta}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
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
            {item.description ? (
              <ThemedText style={[styles.copy, { color: semantic.mutedText }]}>
                {truncateHeadlineDescription(
                  item.description,
                  HEADLINE_CARD_DESCRIPTION_MAX_CHARS,
                )}
              </ThemedText>
            ) : null}
          </SectionCard>
        </Pressable>
      );
    },
    [
      openArticle,
      selectedTopicId,
      semantic.accent,
      semantic.cardBackground,
      semantic.cardBorder,
      semantic.cardSubtleBackground,
      semantic.mutedText,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <AppBrandBar icon="newspaper" />
        <ScreenHeader
          title={getTimeOfDayGreeting()}
          subtitle={`${new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}`}
          subtitleColor={semantic.mutedText}
          subtitleStyle={styles.headerSubtitle}
        />

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
                      borderColor: selected
                        ? semantic.accent
                        : semantic.cardBorder,
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
                        fontFamily: selected
                          ? Fonts.bodySemiBold
                          : Fonts.bodyMedium,
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

        {feedPending ? (
          <NewsFeedSkeletonList
            count={4}
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
          />
        ) : null}

        {!feedPending && headlines.length === 0 ? (
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
      feedPending,
      headlines.length,
      semantic.cardBackground,
      semantic.cardBorder,
      semantic.cardSubtleBackground,
      semantic.mutedText,
      selectedTopicId,
      setSelectedTopicId,
    ],
  );

  const listFooter = useMemo(() => {
    if (paginationPending) {
      return (
        <View style={styles.footerSkeleton}>
          <NewsHeadlineCardSkeleton
            borderColor={semantic.cardBorder}
            backgroundColor={semantic.cardBackground}
          />
        </View>
      );
    }
    return null;
  }, [
    paginationPending,
    semantic.cardBackground,
    semantic.cardBorder,
  ]);

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
    ...TAB_SCREEN_CONTENT_INSETS,
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
    position: "relative",
  },
  categoryStamp: {
    position: "absolute",
    right: 12,
    top: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "44%",
    zIndex: 2,
  },
  categoryStampText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
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
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  meta: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerSkeleton: {
    paddingTop: Spacing.md,
  },
});
