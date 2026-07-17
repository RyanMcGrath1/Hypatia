import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polyline,
  Stop,
} from "react-native-svg";

import {
  InflationCpiObservation,
  InflationCpiResponse,
} from "@/components/economy/detail/inflation/inflationDetailData";
import { ThemedText } from "@/components/theme/ThemedText";
import { Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";

const CHART_H = 172;
const PAD_X = 4;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;

/**
 * Keeps the plotted line away from the exact top and bottom edges.
 *
 * The resulting normalized values run from 0.05 to 0.95 instead of
 * touching 0 and 1.
 */
const CHART_VALUE_PADDING = 0.05;

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:5001"
).replace(/\/$/, "");

type InflationCpiChartProps = {
  width?: number;
};

type ChartPoint = {
  x: number;
  y: number;
};

function formatCpiDate(dateString: string): string {
  const [yearString, monthString] = dateString.split("-");

  const year = Number(yearString);
  const month = Number(monthString);

  const monthLabels = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return dateString;
  }

  return `${monthLabels[month - 1]} ${String(year).slice(-2)}`;
}

/**
 * Converts actual CPI values into SVG Y-axis ratios.
 *
 * SVG Y coordinates increase downward, so the largest CPI value must
 * receive the smallest normalized Y value.
 */
function normalizeCpiValues(
  observations: InflationCpiObservation[],
): number[] {
  if (observations.length === 0) {
    return [];
  }

  const values = observations.map((observation) => observation.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;

  if (range === 0) {
    return values.map(() => 0.5);
  }

  const usableRange = 1 - CHART_VALUE_PADDING * 2;

  return values.map((value) => {
    const zeroToOne = (value - minimum) / range;

    // Invert the value because lower SVG Y coordinates appear higher.
    return CHART_VALUE_PADDING + (1 - zeroToOne) * usableRange;
  });
}

export function InflationCpiChart({ width }: InflationCpiChartProps) {
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();

  const [observations, setObservations] = useState<
    InflationCpiObservation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const chartWidth =
    measuredWidth > 0
      ? measuredWidth
      : Number.isFinite(width) && width! > 0
        ? width!
        : 360;

  useEffect(() => {
    const controller = new AbortController();

    async function loadCpiData() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await fetch(
          `${API_BASE_URL}/api/economy/cpi`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `CPI request failed with status ${response.status}`,
          );
        }

        const payload = (await response.json()) as InflationCpiResponse;

        if (!Array.isArray(payload.observations)) {
          throw new Error("CPI response does not contain observations.");
        }

        const validObservations = payload.observations.filter(
          (observation) =>
            typeof observation.date === "string" &&
            typeof observation.value === "number" &&
            Number.isFinite(observation.value),
        );

        /*
         * The backend returns newest first:
         * June, May, April, March, February.
         *
         * Graphs should run chronologically from left to right:
         * February, March, April, May, June.
         */
        setObservations(
          [...validObservations].sort((a, b) => a.date.localeCompare(b.date)),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Unable to load CPI data:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load CPI data.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCpiData();

    return () => {
      controller.abort();
    };
  }, []);

  const handleLayout = (nextWidth: number) => {
    if (
      Number.isFinite(nextWidth) &&
      nextWidth > 0 &&
      Math.abs(nextWidth - measuredWidth) > 0.5
    ) {
      setMeasuredWidth(nextWidth);
    }
  };

  const chartContent = useMemo(() => {
    const normalizedValues = normalizeCpiValues(observations);
    const labels = observations.map((observation) =>
      formatCpiDate(observation.date),
    );

    const safeWidth =
    Number.isFinite(chartWidth) && chartWidth > 0
      ? chartWidth
      : 300;
  
  const innerW = Math.max(safeWidth - PAD_X * 2, 1);
  const innerH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const pointCount = normalizedValues.length;
  
  const step =
    pointCount > 1
      ? innerW / (pointCount - 1)
      : 0;

    const points: ChartPoint[] = normalizedValues.map(
      (normalizedValue, index) => ({
        x:
          pointCount === 1
            ? safeWidth / 2
            : PAD_X + index * step,
        y: PAD_TOP + normalizedValue * innerH,
      }),
    );

    const linePoints = points
      .map((point) => `${point.x},${point.y}`)
      .join(" ");

    if (points.length === 0) {
      return {
        labels,
        points,
        linePoints: "",
        areaPath: "",
      };
    }

    const firstPoint = points[0]!;
    const lastPoint = points[points.length - 1]!;
    const baseY = PAD_TOP + innerH;

    const lineSegments = points
      .map((point) => `${point.x} ${point.y}`)
      .join(" L ");

    const areaPath =
      `M ${firstPoint.x} ${baseY} ` +
      `L ${lineSegments} ` +
      `L ${lastPoint.x} ${baseY} Z`;

    return {
      labels,
      points,
      linePoints,
      areaPath,
    };
  }, [observations, chartWidth]);

  if (isLoading) {
    return (
      <View
        style={[styles.wrap, styles.statusContainer]}
        onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
      >
        <ThemedText
          style={[styles.statusText, { color: semantic.mutedText }]}
        >
          Loading CPI data…
        </ThemedText>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View
        style={[styles.wrap, styles.statusContainer]}
        onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
      >
        <ThemedText
          style={[styles.statusText, { color: semantic.mutedText }]}
        >
          CPI data is currently unavailable.
        </ThemedText>
      </View>
    );
  }

  if (chartContent.points.length === 0) {
    return (
      <View
        style={[styles.wrap, styles.statusContainer]}
        onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
      >
        <ThemedText
          style={[styles.statusText, { color: semantic.mutedText }]}
        >
          No CPI observations are available.
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => handleLayout(event.nativeEvent.layout.width)}
    >
      {measuredWidth > 0 ? (
        <>
          <Svg
            width="100%"
            height={CHART_H}
            viewBox={`0 0 ${chartWidth} ${CHART_H}`}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient
                id="cpiFill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <Stop
                  offset="0"
                  stopColor={interactive.primary}
                  stopOpacity="0.35"
                />
                <Stop
                  offset="1"
                  stopColor={interactive.primary}
                  stopOpacity="0.02"
                />
              </LinearGradient>
            </Defs>

            <Path d={chartContent.areaPath} fill="url(#cpiFill)" />

            <Polyline
              points={chartContent.linePoints}
              fill="none"
              stroke={interactive.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chartContent.points.map((point, index) => (
              <Circle
                key={`${observations[index]!.date}-${observations[index]!.value}`}
                cx={point.x}
                cy={point.y}
                r={3.5}
                fill={interactive.primary}
              />
            ))}
          </Svg>

          <View style={[styles.xAxisRow, { width: chartWidth }]}>
            {chartContent.labels.map((label, index) => (
              <ThemedText
                key={`${observations[index]!.date}-${label}`}
                style={[
                  styles.xLabel,
                  {
                    left: chartContent.points[index]!.x - 18,
                    color: semantic.mutedText,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </ThemedText>
            ))}
          </View>
        </>
      ) : (
        <View style={{ height: CHART_H }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginTop: Spacing.sm,
  },
  statusContainer: {
    height: CHART_H,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    textAlign: "center",
  },
  xAxisRow: {
    position: "relative",
    height: 18,
    marginTop: 2,
  },
  xLabel: {
    position: "absolute",
    width: 36,
    fontSize: 9,
    fontFamily: Fonts.bodySemiBold,
    textAlign: "center",
  },
});