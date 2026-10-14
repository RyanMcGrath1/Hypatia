import * as Haptics from "expo-haptics";
import { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { laborMarketDetailStyles } from "@/components/economy/detail/labor/LaborMarketDetailView.styles";
import {
  PAYROLL_BARS_ROW_PAD_TOP,
  PAYROLL_BREAK_EVEN_THOUSANDS,
  PAYROLL_DIVERGE_GUTTER_PX,
  PAYROLL_DIVERGE_HALF_PX,
  PAYROLL_TREND_WINDOW_MONTHS,
  PAYROLL_Y_AXIS_TRACK_H,
  groupBarsForAxis,
  payrollBarTone,
  payrollJobsSpoken,
  payrollMonthYearLabel,
  payrollMovingAverage,
  type PayrollAxisModel,
  type PayrollBarTone,
} from "@/components/economy/detail/labor/laborMarketPayrollChart";
import {
  formatPayemsMomDeltaShort,
  type PayrollChartFromFred,
} from "@/components/economy/detail/labor/payrollChartFromFred";
import { ThemedText } from "@/components/theme/ThemedText";
import { Fonts } from "@/constants/theme/Typography";

export type PayrollTrendBarChartColors = {
  aboveBreakEven: string;
  belowBreakEven: string;
  loss: string;
  /** Trend line; matches single-series lines elsewhere on the screen. */
  accent: string;
  text: string;
  mutedText: string;
  hairline: string;
  surface: string;
};

type PayrollTrendBarChartProps = {
  chart: PayrollChartFromFred;
  axis: PayrollAxisModel;
  selectedIndex: number | null;
  onSelectIndex: (index: number | null) => void;
  colors: PayrollTrendBarChartColors;
};

const PAD_H = 8;
const PLOT_H = PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_Y_AXIS_TRACK_H + 6;
const ZERO_Y =
  PAYROLL_BARS_ROW_PAD_TOP + PAYROLL_DIVERGE_HALF_PX + PAYROLL_DIVERGE_GUTTER_PX / 2;
const HALF_SPAN = PAYROLL_DIVERGE_HALF_PX + PAYROLL_DIVERGE_GUTTER_PX / 2;
const MIN_GROUP_LABEL_W = 20;
function barGap(count: number): number {
  if (count <= 12) return 4;
  if (count <= 24) return 2;
  return 1;
}

function toneColor(tone: PayrollBarTone, colors: PayrollTrendBarChartColors) {
  if (tone === "loss") return colors.loss;
  return tone === "aboveBreakEven" ? colors.aboveBreakEven : colors.belowBreakEven;
}

function describeMonth(
  chart: PayrollChartFromFred,
  index: number,
  averages: (number | null)[],
): string {
  const bar = chart.bars[index];
  if (!bar) return "";
  const month = payrollMonthYearLabel(bar.observationDate);
  const delta = bar.momVsPriorThousands;
  if (delta == null) return `${month}, no data`;
  const parts = [
    delta === 0
      ? `${month}, no change`
      : `${month}, ${payrollJobsSpoken(delta)} ${delta > 0 ? "added" : "lost"}`,
  ];
  const diff = Math.round(delta - PAYROLL_BREAK_EVEN_THOUSANDS);
  parts.push(
    diff === 0
      ? "at break-even"
      : `${payrollJobsSpoken(diff)} ${diff > 0 ? "above" : "below"} break-even`,
  );
  const avg = averages[index];
  if (avg != null) {
    parts.push(
      `${PAYROLL_TREND_WINDOW_MONTHS}-month average ${avg < 0 ? "minus " : ""}${payrollJobsSpoken(avg)}`,
    );
  }
  return parts.join(", ");
}

/** Monthly payroll change with a trailing-average trend line and a break-even reference. */
export function PayrollTrendBarChart({
  chart,
  axis,
  selectedIndex,
  onSelectIndex,
  colors,
}: PayrollTrendBarChartProps) {
  const [width, setWidth] = useState(0);
  const gesture = useRef({ index: -1, moved: false, wasSelected: false });

  const bars = chart.bars;
  const count = bars.length;
  const gap = barGap(count);
  const innerW = Math.max(0, width - PAD_H * 2);
  const slot = count > 0 ? Math.max(1, (innerW - gap * (count - 1)) / count) : 0;
  const scaleMax = axis.scaleMax;
  const averages = useMemo(() => payrollMovingAverage(bars), [bars]);

  const yFor = (value: number) =>
    scaleMax === 0 ? ZERO_Y : ZERO_Y - (value / scaleMax) * HALF_SPAN;
  const xFor = (i: number) => PAD_H + i * (slot + gap);
  const centerFor = (i: number) => xFor(i) + slot / 2;

  const latestIndex = useMemo(() => {
    for (let i = bars.length - 1; i >= 0; i--) {
      if (bars[i]!.momVsPriorThousands != null) return i;
    }
    return -1;
  }, [bars]);
  const focusIndex = selectedIndex ?? latestIndex;

  const trendPath = useMemo(() => {
    if (width === 0) return "";
    let d = "";
    let penDown = false;
    averages.forEach((avg, i) => {
      if (avg == null) {
        penDown = false;
        return;
      }
      d += `${penDown ? "L" : "M"}${centerFor(i).toFixed(1)},${yFor(avg).toFixed(1)}`;
      penDown = true;
    });
    return d;
    // centerFor/yFor derive from width, slot, scaleMax
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [averages, width, slot, scaleMax]);

  const xGroups = useMemo(() => groupBarsForAxis(bars), [bars]);
  const groupDividers = xGroups.map((g) => g.start).filter((i) => i > 0);

  const indexAt = (x: number) => {
    if (count === 0 || slot === 0) return -1;
    const i = Math.floor((x - PAD_H + gap / 2) / (slot + gap));
    return Math.min(count - 1, Math.max(0, i));
  };

  const select = (i: number) => {
    if (i < 0 || i === selectedIndex) return;
    onSelectIndex(i);
    if (process.env.EXPO_OS === "ios") {
      Haptics.selectionAsync();
    }
  };

  const onGrant = (e: GestureResponderEvent) => {
    const i = indexAt(e.nativeEvent.locationX);
    gesture.current = { index: i, moved: false, wasSelected: i === selectedIndex };
    select(i);
  };
  const onMove = (e: GestureResponderEvent) => {
    const i = indexAt(e.nativeEvent.locationX);
    if (i !== gesture.current.index) {
      gesture.current.index = i;
      gesture.current.moved = true;
      select(i);
    }
  };
  const onRelease = () => {
    if (!gesture.current.moved && gesture.current.wasSelected) {
      onSelectIndex(null);
    }
  };

  const step = (direction: 1 | -1) => {
    const start = focusIndex < 0 ? latestIndex : focusIndex;
    for (let i = start + direction; i >= 0 && i < count; i += direction) {
      if (bars[i]!.momVsPriorThousands != null) {
        onSelectIndex(i);
        return;
      }
    }
  };
  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === "increment") step(1);
    if (e.nativeEvent.actionName === "decrement") step(-1);
  };

  const breakEvenY = yFor(PAYROLL_BREAK_EVEN_THOUSANDS);
  const hasSelection = selectedIndex != null;
  const ax = laborMarketDetailStyles;

  return (
    <View>
      <View style={[ax.chartNativeWrap, { borderColor: colors.hairline }]}>
        <View style={ax.chartPlotRow}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[ax.yAxisColumn, { borderRightColor: colors.hairline }]}
          >
            <View style={ax.yAxisTrack}>
              {axis.ticks.map((t) => (
                <ThemedText
                  key={t.key}
                  style={[
                    ax.yAxisTick,
                    t.emphasis ? ax.yAxisTickEmphasis : null,
                    t.bottom != null ? { bottom: t.bottom } : { top: t.top ?? 0 },
                    { color: t.emphasis ? colors.text : colors.mutedText },
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </ThemedText>
              ))}
            </View>
          </View>

          <View
            style={styles.plot}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && w !== width) setWidth(w);
            }}
          >
            {width > 0 ? (
              <Svg width={width} height={PLOT_H}>
                {axis.midGuides.length > 0
                  ? [scaleMax / 2, -scaleMax / 2].map((v) => (
                      <Line
                        key={`grid-${v}`}
                        x1={0}
                        x2={width}
                        y1={yFor(v)}
                        y2={yFor(v)}
                        stroke={colors.hairline}
                        strokeWidth={StyleSheet.hairlineWidth}
                        opacity={0.85}
                      />
                    ))
                  : null}
                {groupDividers.map((i) => (
                  <Line
                    key={`year-${i}`}
                    x1={xFor(i) - gap / 2}
                    x2={xFor(i) - gap / 2}
                    y1={PAYROLL_BARS_ROW_PAD_TOP}
                    y2={PLOT_H}
                    stroke={colors.hairline}
                    strokeWidth={StyleSheet.hairlineWidth}
                  />
                ))}
                {bars.map((bar, i) => {
                  const v = bar.momVsPriorThousands;
                  if (v == null || v === 0) return null;
                  const y = yFor(v);
                  const top = v > 0 ? y : ZERO_Y;
                  const height = Math.max(1.5, Math.abs(y - ZERO_Y));
                  return (
                    <Rect
                      key={bar.observationDate}
                      x={xFor(i)}
                      y={top}
                      width={slot}
                      height={height}
                      rx={Math.min(2, slot / 4)}
                      fill={toneColor(payrollBarTone(v), colors)}
                      opacity={hasSelection && i !== selectedIndex ? 0.3 : 1}
                    />
                  );
                })}
                <Line
                  x1={0}
                  x2={width}
                  y1={ZERO_Y}
                  y2={ZERO_Y}
                  stroke={colors.mutedText}
                  strokeWidth={1}
                />
                <Line
                  x1={0}
                  x2={width}
                  y1={breakEvenY}
                  y2={breakEvenY}
                  stroke={colors.mutedText}
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                  opacity={0.7}
                />
                {trendPath ? (
                  <Path
                    d={trendPath}
                    stroke={colors.accent}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                ) : null}
                {focusIndex >= 0 && averages[focusIndex] != null ? (
                  <Circle
                    cx={centerFor(focusIndex)}
                    cy={yFor(averages[focusIndex]!)}
                    r={3.5}
                    fill={colors.accent}
                    stroke={colors.surface}
                    strokeWidth={1.5}
                  />
                ) : null}
              </Svg>
            ) : (
              <View style={{ height: PLOT_H }} />
            )}

            <ThemedText
              accessibilityElementsHidden
              importantForAccessibility="no"
              style={[
                styles.breakEvenTag,
                {
                  top: breakEvenY - 17,
                  color: colors.mutedText,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              Break-even {formatPayemsMomDeltaShort(PAYROLL_BREAK_EVEN_THOUSANDS)}
            </ThemedText>

            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Monthly job change by month"
              accessibilityHint="Swipe up or down to move between months."
              accessibilityValue={{
                text: focusIndex >= 0 ? describeMonth(chart, focusIndex, averages) : "No data",
              }}
              accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
              onAccessibilityAction={onAccessibilityAction}
              onStartShouldSetResponder={() => true}
              onResponderGrant={onGrant}
              onResponderMove={onMove}
              onResponderRelease={onRelease}
              onResponderTerminationRequest={() => true}
              style={styles.touchLayer}
            />

            <View
              style={styles.xLabelRow}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {xGroups.map((g) => {
                const left = xFor(g.start);
                const groupWidth = xFor(g.end) + slot - left;
                if (groupWidth < MIN_GROUP_LABEL_W) return null;
                const isSelected =
                  selectedIndex != null &&
                  selectedIndex >= g.start &&
                  selectedIndex <= g.end;
                return (
                  <ThemedText
                    key={g.key}
                    numberOfLines={1}
                    style={[
                      styles.xLabel,
                      isSelected ? styles.xLabelSelected : null,
                      {
                        left,
                        width: groupWidth,
                        color: isSelected ? colors.text : colors.mutedText,
                      },
                    ]}
                  >
                    {g.text}
                  </ThemedText>
                );
              })}
            </View>
          </View>
        </View>
      </View>

      <View
        style={styles.legend}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <LegendSwatch color={colors.aboveBreakEven} label="Above break-even" muted={colors.mutedText} />
        <LegendSwatch color={colors.belowBreakEven} label="Below break-even" muted={colors.mutedText} />
        <LegendSwatch color={colors.loss} label="Job losses" muted={colors.mutedText} />
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: colors.accent }]} />
          <ThemedText style={[styles.legendText, { color: colors.mutedText }]}>
            {PAYROLL_TREND_WINDOW_MONTHS}-month average
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function LegendSwatch({ color, label, muted }: { color: string; label: string; muted: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color }]} />
      <ThemedText style={[styles.legendText, { color: muted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  touchLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: PLOT_H,
  },
  breakEvenTag: {
    position: "absolute",
    right: 4,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.bodySemiBold,
    paddingHorizontal: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  xLabelRow: {
    height: 22,
    position: "relative",
  },
  xLabel: {
    position: "absolute",
    top: 4,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  xLabelSelected: {
    fontFamily: Fonts.bodyBold,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 6,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLine: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.bodySemiBold,
  },
});
