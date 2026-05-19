import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Colors } from "@/constants/theme/Colors";
import { TAB_BAR_SCROLL_CLEARANCE } from "@/constants/navigation/floatingTabBar";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { formatUpdatedEst } from "@/lib/economy/detail/formatUpdatedEst";

export const ECONOMY_DASHBOARD_POSITIVE_GREEN = "#16A34A";

/** Extra scroll bottom inset when `floatingAction` is set so tail content clears the FAB. */
const FAB_SCROLL_CLEARANCE = 92;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export type EconomyDetailHeaderLayout = "hypatia" | "sectorInline";

type EconomyDetailShellProps = {
  /** Large all-caps style title (e.g. LABOR MARKET or INFLATION & PRICES). */
  pageTitle: string;
  children: ReactNode;
  /**
   * Pinned to the bottom-right of the screen, above the scroll body (e.g. chart range FAB).
   * Parent supplies layout/visuals; shell only anchors and applies safe-area padding.
   */
  floatingAction?: ReactNode;
  /** Show green “LIVE DATA FEED” next to the title. Default true. */
  showLiveFeed?: boolean;
  /** Show HYPATIA wordmark row above the title. Default true. */
  showHypatiaBrand?: boolean;
  /** Stack “UPDATED … EST” under the live-feed line in the title block. */
  showUpdatedBelowLiveFeed?: boolean;
  /**
   * `hypatia` — HYPATIA row + accent + title + live (labor-style).
   * `sectorInline` — one row: icon + title + UPDATED (inflation-style).
   */
  headerLayout?: EconomyDetailHeaderLayout;
  /** Feather icon in the inline header chip (only when `headerLayout` is `sectorInline`). */
  inlineHeaderIcon?: keyof typeof Feather.glyphMap;
  /** Forwarded to the body scroll view (e.g. `Animated.event` for a shrinking FAB). */
  onScroll?: ScrollViewProps["onScroll"];
  scrollEventThrottle?: number;
  /** Chevron back control above the header. Default true. */
  showBackButton?: boolean;
};

/**
 * Full-bleed economy dashboard: back control, then header (see `headerLayout`),
 * then scrollable body.
 */
export function EconomyDetailShell({
  pageTitle,
  children,
  floatingAction,
  showLiveFeed = true,
  showHypatiaBrand = true,
  showUpdatedBelowLiveFeed = false,
  headerLayout = "hypatia",
  inlineHeaderIcon = "bar-chart-2",
  onScroll,
  scrollEventThrottle = 16,
  showBackButton = false,
}: EconomyDetailShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const updated = useMemo(() => formatUpdatedEst(), []);

  return (
    <ThemedView
      style={[styles.screen, { backgroundColor: semantic.screenBackground }]}
    >
      <View style={styles.screenBody}>
        <AnimatedScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: showBackButton ? insets.top + Spacing.sm : Spacing.sm,
              paddingBottom:
                insets.bottom +
                Spacing.xl +
                TAB_BAR_SCROLL_CLEARANCE +
                (floatingAction ? FAB_SCROLL_CLEARANCE : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {showBackButton ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={26} color={theme.text} />
            </Pressable>
          ) : null}

          {headerLayout === "sectorInline" ? (
            <View style={styles.inlineHeaderRow}>
              <View
                style={[
                  styles.inlineHeaderIcon,
                  { backgroundColor: interactive.primarySoft },
                ]}
              >
                <Feather
                  name={inlineHeaderIcon}
                  size={20}
                  color={interactive.primary}
                />
              </View>
              <ThemedText
                style={[styles.inlinePageTitle, { color: theme.text }]}
                numberOfLines={2}
              >
                {pageTitle}
              </ThemedText>
              <ThemedText
                style={[
                  styles.updatedStamp,
                  { color: semantic.mutedText, flexShrink: 0 },
                ]}
              >
                UPDATED {updated} EST
              </ThemedText>
            </View>
          ) : (
            <>
              {showHypatiaBrand ? (
                <View style={styles.brandRow}>
                  <View style={styles.brandLeft}>
                    <Feather
                      name="bar-chart-2"
                      size={20}
                      color={interactive.primary}
                    />
                    <ThemedText
                      style={[styles.brandWordmark, { color: theme.text }]}
                    >
                      HYPATIA
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[styles.updatedStamp, { color: semantic.mutedText }]}
                  >
                    UPDATED {updated} EST
                  </ThemedText>
                </View>
              ) : null}

              <View
                style={[
                  styles.titleBlock,
                  showUpdatedBelowLiveFeed && styles.titleBlockStacked,
                ]}
              >
                <View
                  style={[
                    styles.accentBar,
                    showUpdatedBelowLiveFeed && styles.accentBarTall,
                    { backgroundColor: interactive.primary },
                  ]}
                />
                {showUpdatedBelowLiveFeed ? (
                  <View style={styles.titleColumn}>
                    <View style={styles.titleLiveRow}>
                      <ThemedText
                        style={[styles.pageTitle, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {pageTitle}
                      </ThemedText>
                      <View style={styles.liveFeedMetaColumn}>
                        {showLiveFeed ? (
                          <View style={styles.liveFeed}>
                            <View
                              style={[
                                styles.liveDot,
                                {
                                  backgroundColor:
                                    ECONOMY_DASHBOARD_POSITIVE_GREEN,
                                },
                              ]}
                            />
                            <ThemedText
                              style={[
                                styles.liveText,
                                { color: ECONOMY_DASHBOARD_POSITIVE_GREEN },
                              ]}
                            >
                              LIVE DATA FEED
                            </ThemedText>
                          </View>
                        ) : null}
                        <ThemedText
                          style={[
                            styles.updatedStamp,
                            styles.updatedStampUnderLiveFeed,
                            { color: semantic.mutedText },
                          ]}
                        >
                          UPDATED {updated} EST
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <ThemedText style={[styles.pageTitle, { color: theme.text }]}>
                      {pageTitle}
                    </ThemedText>
                    {showLiveFeed ? (
                      <View style={styles.liveFeed}>
                        <View
                          style={[
                            styles.liveDot,
                            {
                              backgroundColor: ECONOMY_DASHBOARD_POSITIVE_GREEN,
                            },
                          ]}
                        />
                        <ThemedText
                          style={[
                            styles.liveText,
                            { color: ECONOMY_DASHBOARD_POSITIVE_GREEN },
                          ]}
                        >
                          LIVE DATA FEED
                        </ThemedText>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            </>
          )}

          {children}
        </AnimatedScrollView>
        {floatingAction ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.fabOverlay,
              {
                paddingBottom: insets.bottom + Spacing.md,
                paddingRight: Spacing.lg,
              },
            ]}
          >
            {floatingAction}
          </View>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  screenBody: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: Spacing.xs,
    paddingVertical: 4,
    paddingRight: Spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandWordmark: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.6,
  },
  updatedStamp: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.3,
  },
  titleBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    flexWrap: "wrap",
  },
  titleBlockStacked: {
    alignItems: "flex-start",
    flexWrap: "nowrap",
  },
  titleColumn: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  titleLiveRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    width: "100%",
  },
  liveFeedMetaColumn: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  updatedStampUnderLiveFeed: {
    textAlign: "right",
  },
  accentBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  accentBarTall: {
    alignSelf: "stretch",
    minHeight: 28,
  },
  pageTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: Fonts.displaySemibold,
    letterSpacing: 0.5,
  },
  liveFeed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
  inlineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  inlineHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inlinePageTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.6,
  },
});
