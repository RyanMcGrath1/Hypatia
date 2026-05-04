import { useCallback, useMemo } from "react";
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
          style={
            index === 0
              ? { ...styles.headlineCard, ...styles.headlineCardFirst }
              : styles.headlineCard
          }
        >
          <ThemedText type="subtitle">{item.title}</ThemedText>
          {item.meta ? (
            <ThemedText style={[styles.meta, { color: semantic.mutedText }]}>
              {item.meta}
            </ThemedText>
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
              {item.description}
            </ThemedText>
          ) : null}
        </SectionCard>
      </Pressable>
    ),
    [
      openArticle,
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
      semantic.cardSubtleBackground,
      semantic.danger,
      semantic.mutedText,
      selectedTopicId,
      setSelectedTopicId,
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
