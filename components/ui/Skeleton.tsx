import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Radius, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";

export type SkeletonTone = "surface" | "onPrimary";

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  tone?: SkeletonTone;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width = "100%",
  height = 14,
  borderRadius = Radius.sm,
  tone = "surface",
  style,
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.55)).current;
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const backgroundColor =
    tone === "onPrimary"
      ? "rgba(255, 255, 255, 0.28)"
      : semantic.cardSubtleBackground;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

type SkeletonRowProps = {
  gap?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonRow({ gap = 8, children, style }: SkeletonRowProps) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
