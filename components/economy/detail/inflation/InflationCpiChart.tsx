import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polyline, Stop } from "react-native-svg";

import { ThemedText } from "@/components/theme/ThemedText";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import {
  INFLATION_CPI_CHART_LABELS,
  INFLATION_CPI_SERIES,
} from "@/components/economy/detail/inflation/inflationDetailData";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const CHART_H = 128;
const PAD_X = 4;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

type InflationCpiChartProps = {
  width: number;
};

export function InflationCpiChart({ width }: InflationCpiChartProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  const { linePoints, areaPath } = useMemo(() => {
    const innerW = Math.max(width - PAD_X * 2, 120);
    const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;
    const n = INFLATION_CPI_SERIES.length;
    const step = innerW / Math.max(n - 1, 1);
    const segments: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const x = PAD_X + i * step;
      const y = PAD_TOP + INFLATION_CPI_SERIES[i]! * innerH;
      segments.push(`${x},${y}`);
    }
    const firstX = PAD_X;
    const lastX = PAD_X + (n - 1) * step;
    const baseY = PAD_TOP + innerH;
    const area = `M ${firstX} ${baseY} L ${segments.join(" L ")} L ${lastX} ${baseY} Z`;
    return { linePoints: segments.join(" "), areaPath: area };
  }, [width]);

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={CHART_H}>
        <Defs>
          <LinearGradient id="cpiFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={interactive.primary} stopOpacity="0.35" />
            <Stop offset="1" stopColor={interactive.primary} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#cpiFill)" />
        <Polyline
          points={linePoints}
          fill="none"
          stroke={interactive.primary}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <View style={styles.labelsRow}>
        {INFLATION_CPI_CHART_LABELS.map((label) => (
          <ThemedText key={label} style={[styles.xLabel, { color: semantic.mutedText }]} numberOfLines={1}>
            {label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.sm,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    paddingHorizontal: 2,
  },
  xLabel: {
    fontSize: 9,
    fontFamily: Fonts.bodySemiBold,
    flex: 1,
    textAlign: "center",
  },
});
