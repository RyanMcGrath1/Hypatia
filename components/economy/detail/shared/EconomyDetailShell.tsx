import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/theme/ThemedText";
import { ThemedView } from "@/components/theme/ThemedView";
import { Colors } from "@/constants/theme/Colors";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { formatUpdatedEst } from "@/lib/economy/detail/formatUpdatedEst";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

export const ECONOMY_DASHBOARD_POSITIVE_GREEN = "#16A34A";

/** Extra scroll bottom inset when `floatingAction` is set so tail content clears the FAB. */
const FAB_SCROLL_CLEARANCE = 92;

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
  /**
   * `hypatia` — HYPATIA row + accent + title + live (labor-style).
   * `sectorInline` — one row: icon + title + UPDATED (inflation-style).
   */
  headerLayout?: EconomyDetailHeaderLayout;
  /** Feather icon in the inline header chip (only when `headerLayout` is `sectorInline`). */
  inlineHeaderIcon?: keyof typeof Feather.glyphMap;
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
  headerLayout = "hypatia",
  inlineHeaderIcon = "bar-chart-2",
}: EconomyDetailShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const updated = useMemo(() => formatUpdatedEst(), []);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: semantic.screenBackground }]}>
      <View style={styles.screenBody}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + Spacing.sm,
              paddingBottom:
                insets.bottom + Spacing.xl + (floatingAction ? FAB_SCROLL_CLEARANCE : 0),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>

        {headerLayout === "sectorInline" ? (
          <View style={styles.inlineHeaderRow}>
            <View style={[styles.inlineHeaderIcon, { backgroundColor: interactive.primarySoft }]}>
              <Feather name={inlineHeaderIcon} size={20} color={interactive.primary} />
            </View>
            <ThemedText style={[styles.inlinePageTitle, { color: theme.text }]} numberOfLines={2}>
              {pageTitle}
            </ThemedText>
            <ThemedText style={[styles.updatedStamp, { color: semantic.mutedText, flexShrink: 0 }]}>
              UPDATED {updated} EST
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.brandRow}>
              <View style={styles.brandLeft}>
                <Feather name="bar-chart-2" size={20} color={interactive.primary} />
                <ThemedText style={[styles.brandWordmark, { color: theme.text }]}>HYPATIA</ThemedText>
              </View>
              <ThemedText style={[styles.updatedStamp, { color: semantic.mutedText }]}>
                UPDATED {updated} EST
              </ThemedText>
            </View>

            <View style={styles.titleBlock}>
              <View style={[styles.accentBar, { backgroundColor: interactive.primary }]} />
              <ThemedText style={[styles.pageTitle, { color: theme.text }]}>{pageTitle}</ThemedText>
              {showLiveFeed ? (
                <View style={styles.liveFeed}>
                  <View style={[styles.liveDot, { backgroundColor: ECONOMY_DASHBOARD_POSITIVE_GREEN }]} />
                  <ThemedText style={[styles.liveText, { color: ECONOMY_DASHBOARD_POSITIVE_GREEN }]}>
                    LIVE DATA FEED
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </>
        )}

        {children}
        </ScrollView>
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
  accentBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
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
