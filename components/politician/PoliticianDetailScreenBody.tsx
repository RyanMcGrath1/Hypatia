import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/theme/ThemedText";
import { Brand, Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import { getPoliticianDetailLayout } from "@/lib/politician/politicianDetailLayout";
import type { PoliticianProfile } from "@/lib/politician/types";

const STOCK_ALERT_BG = "#EA580C";
const STOCK_ALERT_BG_DARK = "#C2410C";

type PoliticianDetailScreenBodyProps = {
  profile: PoliticianProfile;
};

export function PoliticianDetailScreenBody({ profile }: PoliticianDetailScreenBodyProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const layout = useMemo(() => getPoliticianDetailLayout(profile), [profile]);
  const isDark = colorScheme === "dark";

  const cardStyle = useMemo(
    () => [
      styles.card,
      {
        backgroundColor: semantic.cardBackground,
        borderColor: isDark ? semantic.hairline : "transparent",
        borderWidth: isDark ? 1 : 0,
      },
      semantic.cardShadow,
    ],
    [isDark, semantic],
  );

  return (
    <View style={styles.root}>
      <View style={cardStyle}>
        <View style={styles.profileRow}>
          <Image
            source={{ uri: profile.photoUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.profileTextCol}>
            <ThemedText style={[styles.profileName, { color: theme.text }]}>
              {profile.name}
            </ThemedText>
            <ThemedText style={[styles.districtLine, { color: semantic.mutedText }]}>
              {layout.districtSubtitle}
            </ThemedText>
          </View>
        </View>
        <View style={styles.committeeRow}>
          {layout.committees.map((c) => (
            <View
              key={c}
              style={[styles.committeePill, { backgroundColor: interactive.primarySoft }]}
            >
              <ThemedText style={[styles.committeePillText, { color: interactive.primary }]} numberOfLines={2}>
                {c}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <MetricCard
        cardStyle={cardStyle}
        label="Public Sentiment"
        value={layout.publicSentiment.value}
        subtext={layout.publicSentiment.deltaLabel}
        icon={<Ionicons name="bar-chart" size={22} color={interactive.primary} />}
        textColor={theme.text}
        semantic={semantic}
      >
        <View style={[styles.sparkRow, { opacity: 0.85 }]}>
          {[12, 18, 14, 22, 20, 24].map((h, i) => (
            <View key={i} style={[styles.sparkBar, { height: h, backgroundColor: interactive.primary }]} />
          ))}
        </View>
      </MetricCard>

      <MetricCard
        cardStyle={cardStyle}
        label="Voting Attendance"
        value={layout.votingAttendance.value}
        subtext={layout.votingAttendance.subtext}
        icon={<Ionicons name="person" size={22} color={interactive.primary} />}
        textColor={theme.text}
        semantic={semantic}
      >
        <View style={[styles.progressTrack, { backgroundColor: semantic.cardSubtleBackground }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(layout.votingAttendance.progress * 100)}%`,
                backgroundColor: interactive.secondary,
              },
            ]}
          />
        </View>
      </MetricCard>

      <MetricCard
        cardStyle={cardStyle}
        label="Impact Score"
        value={layout.impactScore.value}
        subtext={layout.impactScore.subtext}
        icon={<Ionicons name="flash" size={22} color={interactive.tertiary} />}
        textColor={theme.text}
        semantic={semantic}
      >
        <View style={styles.segmentRow}>
          {Array.from({ length: layout.impactScore.segmentsTotal }, (_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  backgroundColor:
                    i < layout.impactScore.segmentsFilled ? "#a16207" : semantic.cardSubtleBackground,
                },
              ]}
            />
          ))}
        </View>
      </MetricCard>

      <View style={cardStyle}>
        <View style={styles.sectionTitleRow}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Financial Overview</ThemedText>
          <Ionicons name="eye-outline" size={22} color={interactive.primary} />
        </View>
        <ThemedText style={[styles.finCycle, { color: semantic.mutedText }]}>
          Total Raised ({layout.financial.cycleLabel})
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={[styles.finTotal, { color: theme.text }]}>
          {layout.financial.totalRaisedLabel}
        </ThemedText>
        <ThemedText style={[styles.finSub, { color: semantic.mutedText, marginTop: Spacing.md }]}>
          Top Industry Contributors
        </ThemedText>
        {layout.financial.contributors.map((row) => (
          <View key={row.label} style={styles.finContributorRow}>
            <ThemedText style={[styles.finContributorLabel, { color: theme.text }]}>{row.label}</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
              {row.amountLabel}
            </ThemedText>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.alertBox,
          { backgroundColor: isDark ? STOCK_ALERT_BG_DARK : STOCK_ALERT_BG },
        ]}
      >
        <Ionicons name="notifications" size={24} color={Brand.white} />
        <View style={styles.alertTextCol}>
          <ThemedText style={styles.alertTitle}>{layout.stockAlert.title}</ThemedText>
          <ThemedText style={styles.alertBody}>{layout.stockAlert.body}</ThemedText>
        </View>
      </View>

      <View style={[styles.aiBox, { backgroundColor: interactive.primaryFill }]}>
        <Ionicons name="sparkles" size={24} color={interactive.onPrimaryFill} />
        <View style={styles.alertTextCol}>
          <ThemedText style={styles.alertTitle}>AI Insights</ThemedText>
          <ThemedText style={styles.alertBody}>{layout.aiInsights.body}</ThemedText>
        </View>
      </View>

      <View style={cardStyle}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.votingTitleLeft}>
            <Ionicons name="document-text-outline" size={22} color={interactive.primary} />
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Recent Voting Record</ThemedText>
          </View>
          <Pressable hitSlop={8}>
            <ThemedText style={[styles.viewAll, { color: interactive.primary }]}>View All</ThemedText>
          </Pressable>
        </View>
        {layout.votingRecord.map((item, index) => (
          <View
            key={`${item.billTitle}-${index}`}
            style={[
              styles.voteItem,
              index > 0
                ? {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: semantic.hairline,
                    paddingTop: Spacing.md,
                    marginTop: Spacing.md,
                  }
                : null,
            ]}
          >
            <View style={styles.voteTopRow}>
              <View
                style={[
                  styles.voteBadge,
                  item.vote === "yea"
                    ? { backgroundColor: interactive.secondarySoft }
                    : { backgroundColor: interactive.dangerSoft },
                ]}
              >
                <ThemedText
                  style={[
                    styles.voteBadgeText,
                    item.vote === "yea" ? { color: interactive.secondary } : { color: interactive.danger },
                  ]}
                >
                  {item.vote === "yea" ? "YEA" : "NAY"}
                </ThemedText>
              </View>
              <ThemedText style={[styles.timeAgo, { color: semantic.mutedText }]}>{item.timeAgo}</ThemedText>
            </View>
            <ThemedText type="defaultSemiBold" style={[styles.billTitle, { color: theme.text }]}>
              {item.billTitle}
            </ThemedText>
            <ThemedText style={[styles.aiSummaryLabel, { color: interactive.primary }]}>AI Summary</ThemedText>
            <ThemedText style={[styles.aiSummaryBody, { color: semantic.mutedText }]}>{item.aiSummary}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricCard({
  cardStyle,
  label,
  value,
  subtext,
  icon,
  textColor,
  semantic,
  children,
}: {
  cardStyle: object[];
  label: string;
  value: string;
  subtext: string;
  icon: ReactNode;
  textColor: string;
  semantic: ReturnType<typeof getSemanticColors>;
  children?: ReactNode;
}) {
  return (
    <View style={cardStyle}>
      <View style={styles.metricHeaderRow}>
        <ThemedText style={[styles.metricLabel, { color: semantic.mutedText }]}>{label}</ThemedText>
        {icon}
      </View>
      <ThemedText style={[styles.metricValue, { color: textColor }]}>{value}</ThemedText>
      {children}
      <ThemedText style={[styles.metricSub, { color: semantic.mutedText }]}>{subtext}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.md,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  profileTextCol: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Fonts.displaySemibold,
  },
  districtLine: {
    fontSize: 15,
    fontFamily: Fonts.bodyMedium,
  },
  committeeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  committeePill: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  committeePillText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
  },
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
  },
  metricValue: {
    fontSize: 28,
    fontFamily: Fonts.displaySemibold,
    letterSpacing: -0.5,
    marginBottom: Spacing.sm,
  },
  metricSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  sparkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 28,
    marginBottom: Spacing.xs,
  },
  sparkBar: {
    width: 8,
    borderRadius: 3,
    minHeight: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: Spacing.xs,
  },
  segment: {
    flex: 1,
    height: 10,
    borderRadius: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  votingTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
  },
  viewAll: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  finCycle: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    marginBottom: 4,
  },
  finTotal: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  finSub: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    letterSpacing: 0.3,
  },
  finContributorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  finContributorLabel: {
    flex: 1,
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  aiBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  alertTextCol: {
    flex: 1,
    gap: 8,
  },
  alertTitle: {
    color: Brand.white,
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.6,
  },
  alertBody: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.body,
  },
  voteItem: {
    gap: Spacing.sm,
  },
  voteTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  voteBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
  },
  timeAgo: {
    fontSize: 12,
  },
  billTitle: {
    fontSize: 15,
    lineHeight: 20,
  },
  aiSummaryLabel: {
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    marginTop: 2,
  },
  aiSummaryBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
