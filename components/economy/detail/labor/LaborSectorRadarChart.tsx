import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import { laborMarketDetailStyles as parentStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { ECONOMY_DASHBOARD_POSITIVE_GREEN } from "@/components/economy/detail/shared/EconomyDetailShell";
import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import {
  buildLaborSectorRadarChartModel,
  formatSectorPctChange,
} from "@/lib/economy/laborSectorRadarChartModel";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

type LaborSectorRadarChartProps = {
  data: EconomySectorResponse;
  width: number;
};

const LABEL_LINE_H = 14;

function leaderLineEnd(spoke: {
  labelLeft: number;
  labelTop: number;
  labelWidth: number;
  labelTextAlign: "left" | "center" | "right";
}): { x: number; y: number } {
  const y = spoke.labelTop + LABEL_LINE_H;
  if (spoke.labelTextAlign === "left") {
    return { x: spoke.labelLeft, y };
  }
  if (spoke.labelTextAlign === "right") {
    return { x: spoke.labelLeft + spoke.labelWidth, y };
  }
  return { x: spoke.labelLeft + spoke.labelWidth / 2, y };
}

export function LaborSectorRadarChart({ data, width }: LaborSectorRadarChartProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const model = useMemo(
    () => buildLaborSectorRadarChartModel(data, width),
    [data, width],
  );

  const legendSpokes = useMemo(() => {
    if (!model) {
      return [];
    }
    return [...model.spokes].sort((a, b) => b.pctChange - a.pctChange);
  }, [model]);

  if (!model) {
    return (
      <ThemedText
        style={[parentStyles.sectorStatusText, { color: semantic.mutedText }]}
      >
        Not enough sector data for radar chart.
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

      <View
        style={[
          styles.plotBox,
          {
            width: model.size,
            height: model.size,
            maxWidth: width,
            alignSelf: "center",
          },
        ]}
      >
        <Svg width={model.size} height={model.size}>
          <Polygon
            points={model.innerFloorRing.points}
            fill="none"
            stroke={semantic.hairline}
            strokeWidth={StyleSheet.hairlineWidth}
            opacity={0.45}
          />
          {model.gridRings.map((ring) =>
            ring.fraction === model.zeroRing.fraction ? null : (
              <Polygon
                key={`ring-${ring.fraction}`}
                points={ring.points}
                fill="none"
                stroke={semantic.hairline}
                strokeWidth={StyleSheet.hairlineWidth}
                opacity={0.9}
              />
            ),
          )}
          <Polygon
            points={model.zeroRing.points}
            fill="none"
            stroke={semantic.mutedText}
            strokeWidth={1.25}
            strokeDasharray="4 3"
            opacity={0.75}
          />
          {model.axisLines.map((axis, i) => (
            <Line
              key={`axis-${i}`}
              x1={axis.x1}
              y1={axis.y1}
              x2={axis.x2}
              y2={axis.y2}
              stroke={semantic.hairline}
              strokeWidth={StyleSheet.hairlineWidth}
              opacity={0.85}
            />
          ))}
          {model.spokes.map((spoke) => {
            const end = leaderLineEnd(spoke);
            return (
              <Line
                key={`leader-${spoke.id}`}
                x1={spoke.labelAnchorX}
                y1={spoke.labelAnchorY}
                x2={end.x}
                y2={end.y}
                stroke={semantic.mutedText}
                strokeWidth={StyleSheet.hairlineWidth}
                opacity={0.45}
              />
            );
          })}
          <Polygon
            points={model.polygonPoints}
            fill={interactive.primary}
            fillOpacity={0.18}
            stroke={interactive.primary}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {model.spokes.map((spoke) => (
            <Circle
              key={`dot-${spoke.id}`}
              cx={spoke.vertexX}
              cy={spoke.vertexY}
              r={4}
              fill={spoke.color}
              stroke={semantic.cardBackground}
              strokeWidth={1.5}
            />
          ))}
        </Svg>

        {model.spokes.map((spoke) => (
          <ThemedText
            key={`lbl-${spoke.id}`}
            style={[
              styles.spokeLabel,
              {
                left: spoke.labelLeft,
                top: spoke.labelTop,
                width: spoke.labelWidth,
                color: theme.text,
                textAlign: spoke.labelTextAlign,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {spoke.label}
          </ThemedText>
        ))}
      </View>

      <View
        style={[
          styles.dataPanel,
          {
            backgroundColor: semantic.cardSubtleBackground,
            borderColor: semantic.hairline,
          },
        ]}
      >
        <View style={styles.tableHead}>
          <ThemedText style={[styles.th, { color: semantic.mutedText }]}>
            SECTOR
          </ThemedText>
          <ThemedText style={[styles.th, styles.thNum, { color: semantic.mutedText }]}>
            % VS START
          </ThemedText>
        </View>

        {legendSpokes.map((spoke) => {
          const positive = spoke.pctChange > 0;
          const negative = spoke.pctChange < 0;
          const changeColor = positive
            ? green
            : negative
              ? interactive.danger
              : semantic.mutedText;
          return (
            <View
              key={spoke.id}
              style={[styles.tr, { borderTopColor: semantic.hairline }]}
            >
              <View style={styles.sectorNameCell}>
                <View
                  style={[styles.sectorDot, { backgroundColor: spoke.color }]}
                />
                <ThemedText
                  style={[styles.sectorNameText, { color: theme.text }]}
                  numberOfLines={2}
                >
                  {spoke.label}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.tdNum, { color: changeColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {formatSectorPctChange(spoke.pctChange)}
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
    alignItems: "stretch",
    width: "100%",
  },
  chartSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.bodyMedium,
    lineHeight: 15,
    marginBottom: Spacing.sm,
    alignSelf: "stretch",
  },
  plotBox: {
    position: "relative",
    alignSelf: "center",
  },
  spokeLabel: {
    position: "absolute",
    fontSize: 10,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 12,
  },
  dataPanel: {
    alignSelf: "stretch",
    marginTop: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: 6,
  },
  th: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.35,
    flex: 1.15,
  },
  thNum: {
    flex: 0.75,
    textAlign: "right",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 6,
    minHeight: 40,
  },
  sectorNameCell: {
    flex: 1.15,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  sectorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  sectorNameText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    lineHeight: 17,
  },
  tdNum: {
    flex: 0.75,
    textAlign: "right",
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    lineHeight: 18,
    minWidth: 56,
  },
});
