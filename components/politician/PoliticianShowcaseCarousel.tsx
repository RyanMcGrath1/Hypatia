import { Image } from "expo-image";
import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/theme/ThemedText";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import type { PoliticianProfile } from "@/lib/politician/types";

const TICKER_TILE_W = 168;
const TICKER_STRIDE = TICKER_TILE_W + 14;
const TICKER_IMAGE_H = 214;

const tickerLoopDurationMs = (count: number) =>
  Math.min(42000, Math.max(16000, 9000 * count));

type PoliticianShowcaseCarouselProps = {
  profiles: PoliticianProfile[];
  borderColor: string;
  tileBackground: string;
};

/**
 * Continuous marquee of bordered portrait tiles (duplicated row + linear scroll),
 * similar to a stock ticker.
 */
export function PoliticianShowcaseCarousel({
  profiles,
  borderColor,
  tileBackground,
}: PoliticianShowcaseCarouselProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const stripBackground = semantic.cardSubtleBackground;
  const { width: windowWidth } = useWindowDimensions();
  const trackWidth = Math.max(0, windowWidth - 32);
  const translateX = useSharedValue(0);

  const dupProfiles = useMemo(
    () => [...profiles, ...profiles],
    [profiles],
  );

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;

    if (profiles.length === 0 || trackWidth <= 0) {
      return undefined;
    }

    const loopWidth = profiles.length * TICKER_STRIDE;
    translateX.value = withRepeat(
      withTiming(-loopWidth, {
        duration: tickerLoopDurationMs(profiles.length),
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(translateX);
    };
  }, [profiles, trackWidth, translateX]);

  if (profiles.length === 0 || trackWidth <= 0) {
    return null;
  }

  return (
    <View style={styles.showcaseSection}>
      <ThemedText type="defaultSemiBold" style={styles.showcaseHeading}>
        Featured
      </ThemedText>
      <View
        style={[
          styles.tickerClip,
          { width: trackWidth, borderColor, backgroundColor: stripBackground },
        ]}
      >
        <Animated.View
          style={[
            styles.tickerRow,
            rowStyle,
            { width: TICKER_STRIDE * dupProfiles.length },
          ]}
        >
          {dupProfiles.map((profile, index) => (
            <View
              key={`ticker-${profile.name}-${index}`}
              style={[styles.tickerStrideSlot, { width: TICKER_STRIDE }]}
            >
              <View
                style={[
                  styles.tickerTile,
                  {
                    width: TICKER_TILE_W,
                    borderColor,
                    backgroundColor: tileBackground,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tickerImageShell,
                    { backgroundColor: stripBackground },
                  ]}
                >
                  <Image
                    source={{ uri: profile.photoUrl }}
                    style={styles.tickerImageFill}
                    contentFit="cover"
                    transition={160}
                  />
                  <View style={styles.tickerCaptionBar}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.tickerNameFeatured}
                      numberOfLines={1}
                    >
                      {profile.name}
                    </ThemedText>
                    <ThemedText
                      style={styles.tickerRoleRight}
                      numberOfLines={2}
                    >
                      {profile.role}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  showcaseSection: {
    marginBottom: 14,
    gap: 6,
  },
  showcaseHeading: {
    fontSize: 14,
    marginBottom: 2,
  },
  tickerClip: {
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 10,
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  tickerStrideSlot: {
    justifyContent: "center",
  },
  tickerTile: {
    alignSelf: "flex-start",
    borderRadius: 14,
    borderWidth: 1,
    padding: 0,
    overflow: "hidden",
  },
  tickerImageShell: {
    width: "100%",
    height: TICKER_IMAGE_H,
    position: "relative",
    overflow: "hidden",
  },
  tickerImageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  tickerCaptionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 11,
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  tickerNameFeatured: {
    flexShrink: 1,
    maxWidth: "52%",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tickerRoleRight: {
    flex: 1,
    marginLeft: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
    color: "rgba(245,248,252,0.92)",
    textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
