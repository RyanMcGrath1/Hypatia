import { StyleSheet } from "react-native";

import { TAB_SCREEN_CONTENT_INSETS } from "@/constants/navigation/tabScreenContentInsets";
import { Radius, Spacing } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";

export const economyDashboardStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    ...TAB_SCREEN_CONTENT_INSETS,
    paddingBottom: 120,
    gap: Spacing.sm,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  pageMeta: {
    fontSize: 10,
    textTransform: "uppercase",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  gaugeRoot: {
    width: "68%",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  gaugeGlow: {
    shadowColor: "#4A6CF7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
  },
  gaugeScore: {
    fontFamily: Fonts.displayBold,
    fontSize: 50,
    lineHeight: 54,
    letterSpacing: -0.6,
  },
  gaugeStatusRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gaugeStatus: {
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.2,
  },
  gaugeSubtleLabel: {
    marginTop: 2,
    fontFamily: Fonts.bodyMedium,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  ringWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
  },
  heroScore: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  heroScoreLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroTitle: {
    marginTop: 2,
    fontSize: 14,
  },
  heroDescription: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  heroStatsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  heroStat: {
    flex: 1,
    borderLeftWidth: 2,
    paddingLeft: 8,
  },
  heroStatLabel: {
    fontSize: 9,
    letterSpacing: 0.3,
  },
  heroStatValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  feed: {
    gap: 8,
  },
  feedCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingTop: 10,
    overflow: "hidden",
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  feedTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  feedSubtitle: {
    marginTop: 2,
    paddingHorizontal: 12,
    fontSize: 11,
    lineHeight: 14,
  },
  feedHeaderDivider: {
    marginTop: 8,
    marginHorizontal: 12,
    height: StyleSheet.hairlineWidth,
  },
  feedValue: {
    marginTop: 6,
    paddingHorizontal: 12,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  feedTrend: {
    marginTop: 2,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
  },
  feedTrendText: {
    fontSize: 10,
    fontWeight: "600",
  },
  sparklineRow: {
    marginTop: 8,
    paddingHorizontal: 12,
    alignItems: "stretch",
    marginBottom: 8,
  },
  miniBarsRow: {
    width: "100%",
    minHeight: 28,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  miniBarHit: {
    flex: 1,
    justifyContent: "flex-end",
    minHeight: 28,
  },
  miniBar: {
    width: "100%",
    borderRadius: 2,
    minHeight: 6,
  },
  barSelectionMeta: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.bodyMedium,
  },
  barChartEmptyHint: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: Fonts.bodyMedium,
  },
  cardCtaRow: {
    borderTopWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardCtaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  infoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  monitorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monitorText: {
    fontSize: 11,
  },
});
