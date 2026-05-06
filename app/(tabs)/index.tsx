import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { EmptyState } from "@/components/surfaces/EmptyState";
import { SectionCard } from "@/components/surfaces/SectionCard";
import { StateNoticeCard } from "@/components/surfaces/StateNoticeCard";
import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { NEWS_TOPIC_ICON_NAMES } from "@/constants/app/newsTopicIcons";
import { AppRoutes } from "@/constants/app/routes";
import { Brand } from "@/constants/theme/Colors";
import {
  Radius,
  Spacing,
  getSemanticColors,
} from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { NEWS_TOPIC_OPTIONS, type TopHeadlineItem } from "@/hooks/api/newsApi";
import {
  headlineKey,
  useTopHeadlinesFeed,
} from "@/hooks/feed/useTopHeadlinesFeed";
import { useColorScheme } from "@/hooks/useColorScheme";

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
    loadMoreHeadlines,
    retryInitialLoad,
  } = useTopHeadlinesFeed({ lang: FEED_LANG });

  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const [topicAnchorY, setTopicAnchorY] = useState(0);
  const [stickyTopicsVisible, setStickyTopicsVisible] = useState(false);

  const openArticle = useCallback((url: string, title: string) => {
    router.push({
      pathname: AppRoutes.article,
      params: { url, title },
    });
  }, []);

  const renderTopicCarousel = useCallback(
    (sticky = false) => (
      <View
        style={[
          styles.topicCarouselBleed,
          sticky ? styles.topicCarouselStickyBleed : null,
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicCarouselContent}
        >
          {NEWS_TOPIC_OPTIONS.map((topic) => {
            const selected = topic.id === selectedTopicId;
            return (
              <Pressable
                key={`${sticky ? "sticky" : "header"}-${topic.id}`}
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
    ),
    [
      selectedTopicId,
      semantic.accent,
      semantic.cardBorder,
      semantic.cardSubtleBackground,
      semantic.mutedText,
      setSelectedTopicId,
    ],
  );

  const onTopicAnchorLayout = useCallback(
    (y: number) => {
      setTopicAnchorY(y);
    },
    [],
  );

  const onListScroll = useCallback(
    (offsetY: number) => {
      if (topicAnchorY <= 0) {
        return;
      }
      const nextVisible = offsetY >= topicAnchorY;
      setStickyTopicsVisible((prev) => (prev === nextVisible ? prev : nextVisible));
    },
    [topicAnchorY],
  );

  const renderHeadlineItem = useCallback(
    ({ item, index }: { item: TopHeadlineItem; index: number }) => {
      const selectedTopicLabel =
        NEWS_TOPIC_OPTIONS.find((topic) => topic.id === selectedTopicId)?.label ?? "General";
      const categoryLabel =
        item.category?.trim() && item.category.trim().length > 0
          ? item.category.trim()
          : selectedTopicLabel;

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
          <View style={[styles.categoryStamp, { backgroundColor: semantic.cardSubtleBackground, borderColor: semantic.cardBorder }]}>
            <ThemedText
              numberOfLines={1}
              style={[styles.categoryStampText, { color: semantic.mutedText }]}
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
              {item.source && item.published ? (
                <ThemedText style={[styles.meta, { color: semantic.mutedText }]}>
                  {" · "}
                </ThemedText>
              ) : null}
              {item.published ? (
                <ThemedText style={[styles.meta, { color: "#CA8A04" }]}>
                  {item.published}
                </ThemedText>
              ) : !item.source && item.meta ? (
                <ThemedText style={[styles.meta, { color: "#CA8A04" }]}>
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
        <ScreenHeader
          title={getTimeOfDayGreeting()}
          subtitle={`${new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}`}
          subtitleColor={semantic.mutedText}
          subtitleStyle={styles.headerSubtitle}
        />

        <View
          onLayout={(event) => onTopicAnchorLayout(event.nativeEvent.layout.y)}
        >
          {renderTopicCarousel(false)}
        </View>

        {isLoading && headlines.length === 0 ? (
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

        {error !== null && !isLoading ? (
          <StateNoticeCard
            title="Unable to load headlines"
            message={error}
            borderColor={semantic.danger}
            backgroundColor={semantic.cardBackground}
            messageColor={semantic.danger}
            actionLabel="Retry"
            actionColor={semantic.accent}
            onActionPress={retryInitialLoad}
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
      retryInitialLoad,
      semantic.accent,
      semantic.cardBackground,
      semantic.cardBorder,
      semantic.danger,
      semantic.mutedText,
      onTopicAnchorLayout,
      renderTopicCarousel,
    ],
  );

  const listFooter = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator color={semantic.accent} />
          <ThemedText
            style={[styles.footerHint, { color: semantic.mutedText }]}
          >
            Loading more…
          </ThemedText>
        </View>
      );
    }
    if (paginationError) {
      return (
        <View style={styles.footerError}>
          <ThemedText style={[styles.footerHint, { color: semantic.danger }]}>
            {paginationError}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading more headlines"
            hitSlop={8}
            onPress={() => void loadMoreHeadlines()}
          >
            <ThemedText style={{ color: semantic.accent, fontWeight: "600" }}>
              Try again
            </ThemedText>
          </Pressable>
        </View>
      );
    }
    return null;
  }, [
    loadingMore,
    paginationError,
    loadMoreHeadlines,
    semantic.accent,
    semantic.danger,
    semantic.mutedText,
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
        onScroll={(event) => onListScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      />
      {stickyTopicsVisible ? (
        <View pointerEvents="box-none" style={styles.stickyTopicShell}>
          {renderTopicCarousel(true)}
        </View>
      ) : null}
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
  topicCarouselStickyBleed: {
    marginHorizontal: 0,
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
  stickyTopicShell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingTop: 2,
  },
});
