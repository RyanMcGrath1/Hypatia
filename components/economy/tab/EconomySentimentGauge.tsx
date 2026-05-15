import Feather from "@expo/vector-icons/Feather";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { economyDashboardStyles as styles } from "@/components/economy/tab/economyDashboardStyles";
import { ThemedText } from "@/components/theme/ThemedText";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type EconomySentimentGaugeProps = {
  score: number;
  isDark: boolean;
  mutedTextColor: string;
  positiveAccentColor: string;
};

export function EconomySentimentGauge({
  score,
  isDark,
  mutedTextColor,
  positiveAccentColor,
}: EconomySentimentGaugeProps) {
  const gaugeProgress = useRef(new Animated.Value(0)).current;
  const clampedScore = Math.max(0, Math.min(100, score));
  const size = 190;
  const center = size / 2;
  const radius = 66;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const trackColor = isDark ? "rgba(184, 195, 255, 0.16)" : "#f3f2fe";

  useEffect(() => {
    gaugeProgress.setValue(0);
    Animated.timing(gaugeProgress, {
      toValue: clampedScore / 100,
      duration: 1300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clampedScore, gaugeProgress]);

  const strokeDashoffset = gaugeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.gaugeRoot}>
      <View style={styles.gaugeGlow}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="sentimentGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#4A6CF7" />
              <Stop
                offset="100%"
                stopColor={isDark ? positiveAccentColor : "#2e7d32"}
              />
            </LinearGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#sentimentGaugeGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={center}
            originY={center}
          />
        </Svg>
      </View>
      <View style={styles.gaugeCenter}>
        <ThemedText style={styles.gaugeScore}>{Math.round(clampedScore)}</ThemedText>
        <View style={styles.gaugeStatusRow}>
          <ThemedText style={[styles.gaugeStatus, { color: positiveAccentColor }]}>
            OPTIMAL
          </ThemedText>
          <Feather name="trending-up" size={12} color={positiveAccentColor} />
        </View>
        <ThemedText style={[styles.gaugeSubtleLabel, { color: mutedTextColor }]}>
          ANNUAL AVG
        </ThemedText>
      </View>
    </View>
  );
}
