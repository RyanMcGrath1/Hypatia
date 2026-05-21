import Feather from "@expo/vector-icons/Feather";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Polyline, Rect, Stop } from "react-native-svg";

import { laborMarketDetailStyles as parentStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import { ThemedText } from "@/components/theme/ThemedText";
import { ECONOMY_DASHBOARD_POSITIVE_GREEN } from "@/components/economy/detail/shared/EconomyDetailShell";
import type { EconomySectorResponse } from "@/hooks/api/economySectorApi";
import { Brand, Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import {
  buildLaborSectorHeatmapModel,
  heatmapFocusLine,
  type LaborSectorHeatmapTile,
} from "@/lib/economy/laborSectorHeatmapModel";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const GRID_COLS = 3;
const TILE_GAP = 8;
const LEGEND_H = 10;
const DETAIL_SPARK_W = 280;
const DETAIL_SPARK_H = 72;

type LaborSectorHeatmapProps = {
  data: EconomySectorResponse;
  width: number;
};

function buildSparklinePolyline(
  norm: number[],
  width: number,
  height: number,
): { line: string; area: string } | null {
  if (norm.length < 2) {
    return null;
  }
  const padX = 4;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const baselineY = height - padY;
  const pts: string[] = [];
  const areaPts: string[] = [`${padX},${baselineY}`];
  for (let i = 0; i < norm.length; i += 1) {
    const x = padX + (i / Math.max(norm.length - 1, 1)) * innerW;
    const y = padY + (1 - norm[i]!) * innerH;
    pts.push(`${x},${y}`);
    areaPts.push(`${x},${y}`);
  }
  areaPts.push(`${padX + innerW},${baselineY}`);
  return { line: pts.join(" "), area: areaPts.join(" ") };
}

function HeatmapLegend({ width }: { width: number }) {
  const gradId = "laborHeatmapLegend";
  return (
    <View style={styles.legendWrap}>
      <Svg width={width} height={LEGEND_H}>
        <Defs>
          <LinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#E8EEFF" />
            <Stop offset="50%" stopColor="#7A9AE8" />
            <Stop offset="100%" stopColor={Brand.primary} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={width}
          height={LEGEND_H}
          rx={LEGEND_H / 2}
          fill={`url(#${gradId})`}
        />
      </Svg>
    </View>
  );
}

function SectorDetailCard({
  tile,
  periodLabel,
  sparkWidth,
}: {
  tile: LaborSectorHeatmapTile;
  periodLabel: string;
  sparkWidth: number;
}) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();
  const green = ECONOMY_DASHBOARD_POSITIVE_GREEN;

  const spark = useMemo(
    () => buildSparklinePolyline(tile.sparklineNorm, sparkWidth, DETAIL_SPARK_H),
    [tile.sparklineNorm, sparkWidth],
  );

  const deltaColor =
    tile.deltaPositive === true
      ? green
      : tile.deltaPositive === false
        ? interactive.danger
        : semantic.mutedText;

  return (
    <View
      style={[
        styles.detailCard,
        {
          backgroundColor: semantic.cardSubtleBackground,
          borderColor: semantic.hairline,
        },
      ]}
    >
      <View style={styles.detailHeaderRow}>
        <ThemedText style={[styles.detailTitle, { color: theme.text }]} numberOfLines={2}>
          {tile.name}
        </ThemedText>
        <View style={[styles.selectedBadge, { backgroundColor: interactive.primary }]}>
          <ThemedText style={[styles.selectedBadgeText, { color: theme.background }]}>
            Selected
          </ThemedText>
        </View>
      </View>
      <ThemedText style={[styles.detailFocus, { color: interactive.primary }]}>
        {heatmapFocusLine(tile.pctChange)}
      </ThemedText>
      <View style={styles.detailMetricsRow}>
        <View style={styles.detailMetricCol}>
          <ThemedText style={[styles.detailMetricKicker, { color: semantic.mutedText }]}>
            JOBS ADDED/LOST
          </ThemedText>
          <View style={styles.detailMetricValueRow}>
            <ThemedText style={[styles.detailMetricValue, { color: deltaColor }]}>
              {tile.delta}
            </ThemedText>
            {tile.deltaPositive === true ? (
              <Feather name="arrow-up-right" size={14} color={green} />
            ) : tile.deltaPositive === false ? (
              <Feather name="arrow-down-right" size={14} color={interactive.danger} />
            ) : null}
          </View>
        </View>
        <View style={styles.detailMetricCol}>
          <ThemedText style={[styles.detailMetricKicker, { color: semantic.mutedText }]}>
            PERIOD GROWTH
          </ThemedText>
          <ThemedText
            style={[
              styles.detailMetricValue,
              {
                color:
                  tile.growthPositive === true
                    ? green
                    : tile.growthPositive === false
                      ? interactive.danger
                      : theme.text,
              },
            ]}
          >
            {tile.growth}
          </ThemedText>
        </View>
      </View>
      <View style={styles.sparkWrap}>
        {spark ? (
          <Svg width={sparkWidth} height={DETAIL_SPARK_H}>
            <Defs>
              <LinearGradient id="laborSectorSparkFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={interactive.primary} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={interactive.primary} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            <Path d={`M ${spark.area} Z`} fill="url(#laborSectorSparkFill)" />
            <Polyline
              points={spark.line}
              fill="none"
              stroke={interactive.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : (
          <ThemedText style={[styles.sparkPlaceholder, { color: semantic.mutedText }]}>
            Not enough history in this window
          </ThemedText>
        )}
        <ThemedText style={[styles.sparkCaption, { color: semantic.mutedText }]}>
          Growth vs. period start{periodLabel ? ` (${periodLabel})` : ""}
        </ThemedText>
      </View>
    </View>
  );
}

export function LaborSectorHeatmap({ data, width }: LaborSectorHeatmapProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];

  const model = useMemo(() => buildLaborSectorHeatmapModel(data), [data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (model?.defaultSelectedId) {
      setSelectedId(model.defaultSelectedId);
    }
  }, [model?.defaultSelectedId, data]);

  const tileSize = useMemo(() => {
    const inner = Math.max(width, 240);
    return (inner - TILE_GAP * (GRID_COLS - 1)) / GRID_COLS;
  }, [width]);

  const selectedTile = useMemo(() => {
    if (!model) {
      return null;
    }
    return (
      model.tiles.find((t) => t.id === selectedId) ??
      model.tiles.find((t) => t.id === model.defaultSelectedId) ??
      model.tiles[0] ??
      null
    );
  }, [model, selectedId]);

  if (!model) {
    return (
      <ThemedText
        style={[parentStyles.sectorStatusText, { color: semantic.mutedText }]}
      >
        Not enough sector data for heatmap.
      </ThemedText>
    );
  }

  return (
    <View style={styles.wrap}>
      <ThemedText style={[styles.subtitle, { color: semantic.mutedText }]}>
        {model.subtitle}
      </ThemedText>

      <View style={[styles.grid, { width }]}>
        {model.tiles.map((tile) => {
          const selected = tile.id === selectedId;
          return (
            <Pressable
              key={tile.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${tile.name}, ${tile.pctLabel} change`}
              onPress={() => setSelectedId(tile.id)}
              style={({ pressed }) => [
                styles.tile,
                {
                  width: tileSize,
                  height: tileSize,
                  backgroundColor: tile.backgroundColor,
                  borderColor: selected ? theme.text : "transparent",
                  borderWidth: selected ? 2.5 : 0,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <ThemedText
                style={[styles.tileAbbrev, { color: tile.labelColor }]}
                numberOfLines={1}
              >
                {tile.abbrev}
              </ThemedText>
              <ThemedText
                style={[styles.tilePct, { color: tile.labelColor }]}
                numberOfLines={1}
              >
                {tile.pctLabel}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legendLabelsRow}>
        <ThemedText style={[styles.legendLabel, { color: semantic.mutedText }]}>
          {model.legendLowLabel}
        </ThemedText>
        <ThemedText style={[styles.legendLabel, { color: semantic.mutedText }]}>
          {model.legendHighLabel}
        </ThemedText>
      </View>
      <HeatmapLegend width={width} />

      {selectedTile ? (
        <SectorDetailCard
          tile={selectedTile}
          periodLabel={model.periodRangeLabel}
          sparkWidth={Math.min(width, DETAIL_SPARK_W)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.sm,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Fonts.body,
    marginBottom: Spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TILE_GAP,
  },
  tile: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    gap: 2,
  },
  tileAbbrev: {
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.3,
  },
  tilePct: {
    fontSize: 11,
    fontFamily: Fonts.bodySemiBold,
  },
  legendLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  legendLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyMedium,
  },
  legendWrap: {
    marginBottom: Spacing.sm,
  },
  detailCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  detailTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.3,
  },
  selectedBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
  },
  detailFocus: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
  },
  detailMetricsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  detailMetricCol: {
    flex: 1,
    gap: 4,
  },
  detailMetricKicker: {
    fontSize: 9,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.35,
  },
  detailMetricValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailMetricValue: {
    fontSize: 18,
    fontFamily: Fonts.displayBold,
  },
  sparkWrap: {
    marginTop: Spacing.xs,
    alignItems: "center",
    minHeight: DETAIL_SPARK_H + 20,
  },
  sparkCaption: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: Fonts.body,
    textAlign: "center",
  },
  sparkPlaceholder: {
    fontSize: 12,
    fontFamily: Fonts.body,
    paddingVertical: Spacing.md,
  },
});
