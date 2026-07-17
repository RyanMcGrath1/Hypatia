import { StyleSheet } from "react-native";

import { Radius, Spacing } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";

export const laborDemographicAnalysisStyles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  updateBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  updateBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.1,
  },
  segmentWrap: {
    flexDirection: "row",
    borderRadius: Radius.lg,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    minHeight: 44,
  },
  segmentLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.bodySemiBold,
    textAlign: "center",
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  metricCardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  metricCardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontFamily: Fonts.bodyBold,
    letterSpacing: -0.2,
  },
  metricCardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Fonts.bodyMedium,
  },
  frequencyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  frequencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  frequencyText: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.2,
  },
  bucketGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: Spacing.sm,
    marginTop: Spacing.md,
  },
  bucketTile: {
    width: "48.5%",
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.sm,
    minHeight: 108,
    overflow: "hidden",
  },
  bucketLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.15,
    marginBottom: 4,
  },
  bucketValue: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.4,
  },
  bucketSparkWrap: {
    marginTop: 6,
    marginBottom: 8,
    height: 28,
  },
  bucketBarTrack: {
    height: 4,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  bucketBarFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  comparisonChartWrap: {
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  insightCard: {
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  insightKicker: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  insightTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.3,
  },
  insightBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.body,
  },
  resilienceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  resilienceLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  resilienceLevel: {
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
  },
  resilienceTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: "hidden",
  },
  resilienceFill: {
    height: "100%",
    borderRadius: Radius.full,
  },
  insightCta: {
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  insightCtaText: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
  },
});
