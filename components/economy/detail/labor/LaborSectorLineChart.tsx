import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline, Rect } from "react-native-svg";

import { laborMarketDetailStyles as parentStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { ECONOMY_DASHBOARD_POSITIVE_GREEN } from "@/components/economy/detail/shared/EconomyDetailShell";
import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";
import { Colors } from "@/constants/theme/Colors";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import {
  buildLaborSectorLineChartModel,
  formatSectorPctChange,
} from "@/lib/economy/laborSectorLineChartModel";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

type LaborSectorLineChartProps = {
  data: EconomySectorResponse;
  width: number;
};

export function LaborSectorLineChart({ data, width }: LaborSectorLineChartProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const model = useMemo(
    () => buildLaborSectorLineChartModel(data, width),
    [data, width],
  );

  const legendLines = useMemo(() => {
    if (!model) {
      return [];
    }
    return [...model.lines].sort(
      (a, b) => b.latestPctChange - a.latestPctChange,
    );
  }, [model]);

  if (!model || model.lines.length === 0) {
    return (
      <ThemedText
        style={[parentStyles.sectorStatusText, { color: semantic.mutedText }]}
      >
        Not enough history to chart sectors.
      </ThemedText>
    );
  }

  return (
    <View style={styles.wrap}>
      <ThemedText
        style={[styles.chartSubtitle, { color: semantic.mutedText }]}
        numberOfLines={2}
      >
        {model.chartSubtitle}
      </ThemedText>

      <View style={styles.plotRow}>
        <View style={[styles.yAxisCol, { width: model.yAxisWidth }]}>
          <View
            style={[
              styles.yAxisTrack,
              { height: model.chartHeight - model.padBottom },
            ]}
          >
            {model.yTicks.map((tick) => (
              <ThemedText
                key={`y-${tick.pctValue}`}
                style={[
                  styles.yTick,
                  tick.emphasis ? styles.yTickEmphasis : null,
                  tick.bound ? styles.yTickBound : null,
                  {
                    top: tick.y - 7,
                    color: tick.emphasis
                      ? theme.text
                      : tick.bound
                        ? theme.text
                        : semantic.mutedText,
                  },
                ]}
                numberOfLines={1}
              >
                {tick.label}
              </ThemedText>
            ))}
          </View>
        </View>

        <View style={styles.plotMain}>
          <Svg width={model.plotSvgWidth} height={model.chartHeight}>
            {model.baselineY != null && model.dataCrossesZero ? (
              <>
                <Rect
                  x={model.padX}
                  y={model.padTop}
                  width={model.innerW}
                  height={Math.max(0, model.baselineY - model.padTop)}
                  fill={green}
                  opacity={0.07}
                />
                <Rect
                  x={model.padX}
                  y={model.baselineY}
                  width={model.innerW}
                  height={Math.max(
                    0,
                    model.padTop + model.innerH - model.baselineY,
                  )}
                  fill={interactive.danger}
                  opacity={0.07}
                />
              </>
            ) : null}
            {model.gridLineYs.map((gy, i) => (
              <Line
                key={`grid-${i}`}
                x1={model.padX}
                y1={gy}
                x2={model.padX + model.innerW}
                y2={gy}
                stroke={semantic.hairline}
                strokeWidth={StyleSheet.hairlineWidth}
                opacity={0.85}
              />
            ))}
            {model.baselineY != null && model.dataCrossesZero ? (
              <Line
                x1={model.padX}
                y1={model.baselineY}
                x2={model.padX + model.innerW}
                y2={model.baselineY}
                stroke={semantic.mutedText}
                strokeWidth={1.25}
                strokeDasharray="5 4"
                opacity={0.7}
              />
            ) : null}
            {model.lines.map((line) => (
              <Polyline
                key={line.id}
                points={line.polylinePoints}
                fill="none"
                stroke={line.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {model.lines.map((line) => (
              <Circle
                key={`dot-${line.id}`}
                cx={line.endDot.cx}
                cy={line.endDot.cy}
                r={3.5}
                fill={line.color}
                stroke={semantic.cardBackground}
                strokeWidth={1.5}
              />
            ))}
          </Svg>
          <View style={[styles.xAxisRow, { width: model.plotSvgWidth }]}>
            {model.xTicks.map((tick, i) => (
              <ThemedText
                key={`x-${tick.label}-${i}`}
                style={[
                  styles.xTick,
                  { left: tick.x - 14, color: semantic.mutedText },
                ]}
                numberOfLines={1}
              >
                {tick.label}
              </ThemedText>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.legendWrap}>
        {legendLines.map((line) => {
          const positive = line.latestPctChange > 0;
          const negative = line.latestPctChange < 0;
          const changeColor = positive
            ? green
            : negative
              ? interactive.danger
              : semantic.mutedText;
          return (
            <View key={line.id} style={styles.legendRow}>
              <View
                style={[styles.legendSwatch, { backgroundColor: line.color }]}
              />
              <ThemedText
                style={[styles.legendName, { color: semantic.mutedText }]}
                numberOfLines={1}
              >
                {line.label}
              </ThemedText>
              <ThemedText
                style={[styles.legendChange, { color: changeColor }]}
                numberOfLines={1}
              >
                {formatSectorPctChange(line.latestPctChange)}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.xs,
  },
  chartSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    lineHeight: 15,
    marginBottom: Spacing.sm,
  },
  plotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  yAxisCol: {
    flexShrink: 0,
    paddingRight: 4,
  },
  yAxisTrack: {
    position: "relative",
    width: "100%",
  },
  yTick: {
    position: "absolute",
    right: 0,
    fontSize: 9,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 14,
    textAlign: "right",
    width: "100%",
  },
  yTickEmphasis: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
  },
  yTickBound: {
    fontFamily: Fonts.bodyBold,
  },
  plotMain: {
    flex: 1,
    minWidth: 0,
  },
  xAxisRow: {
    position: "relative",
    height: 18,
    marginTop: 2,
  },
  xTick: {
    position: "absolute",
    width: 28,
    fontSize: 9,
    fontFamily: Fonts.bodySemiBold,
    textAlign: "center",
  },
  legendWrap: {
    gap: 6,
    marginTop: Spacing.md,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 3,
    borderRadius: 2,
    flexShrink: 0,
  },
  legendName: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
    flex: 1,
    minWidth: 0,
  },
  legendChange: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    minWidth: 52,
    textAlign: "right",
  },
});
