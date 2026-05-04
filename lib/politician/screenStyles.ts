import { StyleSheet } from "react-native";

import { Brand } from "@/constants/theme/Colors";

/** Politician tab screen layout (search, results, quick links — not the ticker). */
export const politicianScreenStyles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 112,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 16,
    lineHeight: 20,
  },
  searchCard: {
    width: "100%",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    minWidth: 28,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsList: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  suggestionItem: {
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Brand.steel,
  },
  suggestionMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  helperText: {
    marginBottom: 10,
  },
  recentWrap: {
    gap: 6,
  },
  recentLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  recentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  recentChipText: {
    fontSize: 12,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  quickTryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  quickTryChip: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  quickTryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingWrap: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  profileWrap: {
    gap: 12,
  },
  profileCard: {
    gap: 5,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileHeaderText: {
    flex: 1,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Brand.slate,
  },
  roleLine: {
    fontSize: 14,
  },
  locationLine: {
    fontSize: 14,
    marginBottom: 4,
  },
  bioText: {
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
  },
  sectionCard: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  newsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.steel,
    paddingTop: 10,
    gap: 3,
  },
  newsHeadline: {
    lineHeight: 20,
  },
  newsMeta: {
    fontSize: 12,
  },
  chartTitle: {
    marginBottom: 4,
  },
  tileSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tileSectionTitle: {
    marginBottom: 10,
  },
  tileGrid: {
    gap: 10,
  },
  tileRow: {
    flexDirection: "row",
    gap: 10,
  },
  tileCell: {
    flex: 1,
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    justifyContent: "flex-start",
  },
  tileTitle: {
    fontSize: 15,
  },
  tileSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});
