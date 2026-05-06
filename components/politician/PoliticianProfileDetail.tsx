import { useMemo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";

import PoliticianLineChart from "@/components/charts/PoliticianLineChart";
import { ThemedText } from "@/components/theme/ThemedText";
import { Brand, Colors } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import type { PoliticianProfile } from "@/lib/politician/types";
import { politicianScreenStyles as ps } from "@/lib/politician/screenStyles";

type PoliticianProfileDetailProps = {
  profile: PoliticianProfile;
};

export function PoliticianProfileDetail({ profile }: PoliticianProfileDetailProps) {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const palette = useMemo(
    () => ({
      cardBackground: semantic.cardBackground,
      cardBorder: semantic.cardBorder,
      badgeBackground:
        colorScheme === "dark" ? Brand.slate : semantic.cardSubtleBackground,
    }),
    [colorScheme, semantic],
  );

  return (
    <View style={ps.profileWrap}>
      <View
        style={[
          ps.resultCard,
          ps.profileCard,
          {
            backgroundColor: palette.cardBackground,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <View style={ps.profileHeader}>
          <Image
            source={{ uri: profile.photoUrl }}
            style={ps.profileImage}
            contentFit="cover"
          />
          <View style={ps.profileHeaderText}>
            <ThemedText type="subtitle">{profile.name}</ThemedText>
            <ThemedText style={[ps.roleLine, { color: theme.icon }]}>
              {profile.role} - {profile.party}
            </ThemedText>
            <ThemedText style={[ps.locationLine, { color: theme.icon }]}>
              {profile.location}
            </ThemedText>
          </View>
        </View>
        <ThemedText style={ps.bioText}>{profile.bio}</ThemedText>
      </View>

      <View style={ps.metricsRow}>
        <View
          style={[
            ps.resultCard,
            ps.metricChip,
            {
              backgroundColor: palette.badgeBackground,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <ThemedText style={[ps.metricLabel, { color: theme.icon }]}>Approval</ThemedText>
          <ThemedText type="defaultSemiBold">{profile.approval}%</ThemedText>
        </View>
        <View
          style={[
            ps.resultCard,
            ps.metricChip,
            {
              backgroundColor: palette.badgeBackground,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <ThemedText style={[ps.metricLabel, { color: theme.icon }]}>In Office</ThemedText>
          <ThemedText type="defaultSemiBold">{profile.yearsInOffice} yrs</ThemedText>
        </View>
        <View
          style={[
            ps.resultCard,
            ps.metricChip,
            {
              backgroundColor: palette.badgeBackground,
              borderColor: palette.cardBorder,
            },
          ]}
        >
          <ThemedText style={[ps.metricLabel, { color: theme.icon }]}>Election</ThemedText>
          <ThemedText type="defaultSemiBold">{profile.nextElection}</ThemedText>
        </View>
      </View>

      <View
        style={[
          ps.resultCard,
          ps.sectionCard,
          {
            backgroundColor: palette.cardBackground,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <ThemedText type="defaultSemiBold">Key Positions</ThemedText>
        {profile.keyPositions.map((position) => (
          <View key={position} style={ps.bulletRow}>
            <View style={[ps.bulletDot, { backgroundColor: theme.tint }]} />
            <ThemedText style={ps.bulletText}>{position}</ThemedText>
          </View>
        ))}
      </View>

      <View
        style={[
          ps.resultCard,
          ps.sectionCard,
          {
            backgroundColor: palette.cardBackground,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <ThemedText type="defaultSemiBold">Recent Headlines</ThemedText>
        {profile.recentNews.map((item) => (
          <View key={`${item.headline}-${item.date}`} style={ps.newsRow}>
            <ThemedText style={ps.newsHeadline}>{item.headline}</ThemedText>
            <ThemedText style={[ps.newsMeta, { color: theme.icon }]}>
              {item.source} - {item.date}
            </ThemedText>
          </View>
        ))}
      </View>

      <View
        style={[
          ps.resultCard,
          ps.sectionCard,
          {
            backgroundColor: palette.cardBackground,
            borderColor: palette.cardBorder,
          },
        ]}
      >
        <ThemedText type="defaultSemiBold" style={ps.chartTitle}>
          Approval Trend
        </ThemedText>
        <PoliticianLineChart />
      </View>
    </View>
  );
}
