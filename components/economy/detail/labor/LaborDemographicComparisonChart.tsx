import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { laborDemographicAnalysisStyles as styles } from "@/components/economy/detail/labor/LaborDemographicAnalysisCard.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import type { AppColorScheme } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import type { LaborDemographicComparisonChartModel } from "@/lib/economy/laborDemographicComparisonChartModel";

type Semantic = ReturnType<
  typeof import("@/constants/theme/ThemeTokens").getSemanticColors
>;

function formatLatestPct(value: number): string {
  const rounded =
    Math.abs(value - Math.round(value)) < 0.05
      ? value.toFixed(0)
      : value.toFixed(1);
  return `${rounded}%`;
}

export type LaborDemographicComparisonChartProps = {
  model: LaborDemographicComparisonChartModel;
  colorScheme: AppColorScheme;
  semantic: Semantic;
};

export function LaborDemographicComparisonChart({
  model,
  colorScheme,
  semantic,
}: LaborDemographicComparisonChartProps) {
  const theme = Colors[colorScheme];

  return (
    <View
      style={[
        styles.comparisonChartWrap,
        {
          borderColor: semantic.hairline,
          backgroundColor: semantic.cardSubtleBackground,
        },
      ]}
    >
      <ThemedText
        style={[chartStyles.subtitle, { color: semantic.mutedText }]}
        numberOfLines={2}
      >
        {model.chartSubtitle}
      </ThemedText>

      <View style={chartStyles.plotRow}>
        <View style={[chartStyles.yAxisCol, { width: model.yAxisWidth }]}>
          <View
            style={[
              chartStyles.yAxisTrack,
              { height: model.chartHeight - model.padBottom },
            ]}
          >
            {model.yTicks.map((tick) => (
              <ThemedText
                key={`y-${tick.value}`}
                style={[
                  chartStyles.yTick,
                  tick.emphasis ? chartStyles.yTickEmphasis : null,
                  {
                    top: tick.y - 7,
                    color: tick.emphasis ? theme.text : semantic.mutedText,
                  },
                ]}
                numberOfLines={1}
              >
                {tick.label}
              </ThemedText>
            ))}
          </View>
        </View>

        <View style={chartStyles.plotMain}>
          <Svg width={model.plotSvgWidth} height={model.chartHeight}>
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
            {model.lines.map((line) =>
              line.polylinePoints ? (
                <Polyline
                  key={line.id}
                  points={line.polylinePoints}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null,
            )}
            {model.lines.map((line) =>
              line.endDot ? (
                <Circle
                  key={`dot-${line.id}`}
                  cx={line.endDot.cx}
                  cy={line.endDot.cy}
                  r={3.5}
                  fill={line.color}
                  stroke={semantic.cardBackground}
                  strokeWidth={1.5}
                />
              ) : null,
            )}
          </Svg>
          <View style={[chartStyles.xAxisRow, { width: model.plotSvgWidth }]}>
            {model.xTicks.map((tick, i) => (
              <ThemedText
                key={`x-${tick.label}-${i}`}
                style={[
                  chartStyles.xTick,
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

      <View style={chartStyles.legendWrap}>
        {model.lines.map((line) => (
          <View key={line.id} style={chartStyles.legendRow}>
            <View
              style={[chartStyles.legendSwatch, { backgroundColor: line.color }]}
            />
            <ThemedText
              style={[chartStyles.legendName, { color: semantic.mutedText }]}
              numberOfLines={1}
            >
              {line.label}
            </ThemedText>
            <ThemedText
              style={[chartStyles.legendValue, { color: theme.text }]}
              numberOfLines={1}
            >
              {line.latestValue != null
                ? formatLatestPct(line.latestValue)
                : "—"}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  plotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  yAxisCol: {
    flexShrink: 0,
    paddingRight: 2,
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
  plotMain: {
    flex: 1,
    minWidth: 0,
  },
  xAxisRow: {
    position: "relative",
    height: 18,
    marginTop: 2,
    marginBottom: 4,
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
    paddingHorizontal: 12,
    paddingBottom: 12,
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
  legendValue: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    minWidth: 40,
    textAlign: "right",
  },
});
