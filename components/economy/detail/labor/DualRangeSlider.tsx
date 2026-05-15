import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Spacing } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";

const THUMB_R = 15;
const THUMB_SIZE = THUMB_R * 2;

/** Discrete stops on the payroll range filter track (steps 0 … value − 1). */
export const PAYROLL_RANGE_SLIDER_DISCRETE_POSITIONS = 480;

export type DualRangeThumbTooltip = {
  getLabel: (observationIndex: number) => string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
};

export type DualRangeSliderProps = {
  count: number;
  lowIndex: number;
  highIndex: number;
  onChange: (low: number, high: number) => void;
  /** When set, the track is divided into this many discrete stops (e.g. 480 → steps 0…479). Values map to observation indices by proportional rounding. */
  discretePositionCount?: number;
  /** While dragging a thumb, a small callout shows this label for the observation under that thumb. */
  thumbTooltip?: DualRangeThumbTooltip;
  trackColor: string;
  rangeColor: string;
  thumbBorder: string;
  thumbFill: string;
};

function resolveStepMax(count: number, discretePositionCount: number | undefined): number {
  if (count <= 1) {
    return 1;
  }
  if (discretePositionCount != null && discretePositionCount > 1) {
    return Math.max(1, discretePositionCount - 1);
  }
  return Math.max(1, count - 1);
}

function obsIndexToStep(
  obsIdx: number,
  count: number,
  stepMax: number,
): number {
  if (count <= 1) {
    return 0;
  }
  return Math.round((obsIdx / (count - 1)) * stepMax);
}

function stepToObsIndex(step: number, count: number, stepMax: number): number {
  if (count <= 1) {
    return 0;
  }
  return Math.round((step / stepMax) * (count - 1));
}

type SliderGestureCtx = {
  count: number;
  stepMax: number;
  lowIndex: number;
  highIndex: number;
  lowStep: number;
  highStep: number;
  fineSteps: boolean;
  pxPerStep: number;
  onChange: (low: number, high: number) => void;
  thumbTooltip?: DualRangeThumbTooltip;
};

const CALLOUT_WIDTH = 100;
const CALLOUT_HALF = CALLOUT_WIDTH / 2;
const THUMB_ROW_H = 44;
const CALLOUT_BOTTOM_OFFSET = THUMB_ROW_H + 6;

function CaretDown({ fill }: { fill: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        marginTop: -StyleSheet.hairlineWidth,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 7,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: fill,
      }}
    />
  );
}

type ThumbCalloutProps = {
  text: string;
  /** Horizontal center of the thumb (same coords as `centerXForStep`). */
  centerX: number;
  trackWidth: number;
  bottom: number;
  tooltip: DualRangeThumbTooltip;
};

function ThumbCallout({ text, centerX, trackWidth, bottom, tooltip }: ThumbCalloutProps) {
  const maxLeft = Math.max(0, trackWidth - CALLOUT_WIDTH);
  const left = Math.max(0, Math.min(maxLeft, centerX - CALLOUT_HALF));

  return (
    <View
      pointerEvents="none"
      style={[styles.calloutWrap, { left, bottom }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={[
          styles.calloutBubble,
          {
            backgroundColor: tooltip.backgroundColor,
            borderColor: tooltip.borderColor,
          },
        ]}
      >
        <ThemedText
          numberOfLines={1}
          style={[styles.calloutText, { color: tooltip.textColor }]}
        >
          {text}
        </ThemedText>
      </View>
      <CaretDown fill={tooltip.backgroundColor} />
    </View>
  );
}

export function DualRangeSlider({
  count,
  lowIndex,
  highIndex,
  onChange,
  discretePositionCount,
  thumbTooltip,
  trackColor,
  rangeColor,
  thumbFill,
  thumbBorder,
}: DualRangeSliderProps) {
  const [trackW, setTrackW] = useState(0);
  const grantLoStep = useRef(0);
  const grantHiStep = useRef(0);

  const stepMax = useMemo(
    () => resolveStepMax(count, discretePositionCount),
    [count, discretePositionCount],
  );

  const fineSteps =
    discretePositionCount != null &&
    discretePositionCount > 1 &&
    count > 1;

  const loFineDragStep = useRef<number | null>(null);
  const hiFineDragStep = useRef<number | null>(null);
  const activeThumbRef = useRef<"lo" | "hi" | null>(null);
  const [, bumpFineRender] = useReducer((x: number) => x + 1, 0);

  const ctxRef = useRef<SliderGestureCtx>({
    count: 0,
    stepMax: 1,
    lowIndex: 0,
    highIndex: 0,
    lowStep: 0,
    highStep: 0,
    fineSteps: false,
    pxPerStep: 1,
    onChange: () => {},
    thumbTooltip: undefined,
  });

  useEffect(() => {
    loFineDragStep.current = null;
    hiFineDragStep.current = null;
    activeThumbRef.current = null;
  }, [count, stepMax]);

  const lowStep = useMemo(
    () => obsIndexToStep(lowIndex, count, stepMax),
    [lowIndex, count, stepMax],
  );
  const highStep = useMemo(
    () => obsIndexToStep(highIndex, count, stepMax),
    [highIndex, count, stepMax],
  );

  const pxPerStep = useMemo(() => {
    const inner = Math.max(0, trackW - 2 * THUMB_R);
    if (inner <= 0) {
      return 1;
    }
    return inner / stepMax;
  }, [trackW, stepMax]);

  ctxRef.current = {
    count,
    stepMax,
    lowIndex,
    highIndex,
    lowStep,
    highStep,
    fineSteps,
    pxPerStep,
    onChange,
    thumbTooltip,
  };

  const loVisualStep =
    fineSteps && loFineDragStep.current != null ? loFineDragStep.current : lowStep;
  const hiVisualStep =
    fineSteps && hiFineDragStep.current != null ? hiFineDragStep.current : highStep;

  const setActiveThumb = (which: "lo" | "hi") => {
    if (ctxRef.current.thumbTooltip == null) {
      return;
    }
    activeThumbRef.current = which;
    bumpFineRender();
  };

  const loPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const c = ctxRef.current;
          grantLoStep.current = loFineDragStep.current ?? c.lowStep;
          setActiveThumb("lo");
        },
        onPanResponderMove: (_, gs) => {
          const c = ctxRef.current;
          const hiCap = hiFineDragStep.current ?? c.highStep;
          const px = c.pxPerStep > 0 ? c.pxPerStep : 1;
          const nextStep = Math.max(
            0,
            Math.min(hiCap, Math.round(grantLoStep.current + gs.dx / px)),
          );
          const nextObs = Math.min(
            c.highIndex,
            stepToObsIndex(nextStep, c.count, c.stepMax),
          );
          if (c.fineSteps) {
            loFineDragStep.current = nextStep;
            bumpFineRender();
          } else if (c.thumbTooltip != null && activeThumbRef.current === "lo") {
            bumpFineRender();
          }
          if (nextObs !== c.lowIndex) {
            c.onChange(nextObs, c.highIndex);
          }
        },
        onPanResponderRelease: () => {
          const c = ctxRef.current;
          if (c.fineSteps) {
            loFineDragStep.current = null;
          }
          activeThumbRef.current = null;
          bumpFineRender();
        },
        onPanResponderTerminate: () => {
          const c = ctxRef.current;
          if (c.fineSteps) {
            loFineDragStep.current = null;
          }
          activeThumbRef.current = null;
          bumpFineRender();
        },
      }),
    [bumpFineRender],
  );

  const hiPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const c = ctxRef.current;
          grantHiStep.current = hiFineDragStep.current ?? c.highStep;
          setActiveThumb("hi");
        },
        onPanResponderMove: (_, gs) => {
          const c = ctxRef.current;
          const loCap = loFineDragStep.current ?? c.lowStep;
          const px = c.pxPerStep > 0 ? c.pxPerStep : 1;
          const nextStep = Math.max(
            loCap,
            Math.min(c.stepMax, Math.round(grantHiStep.current + gs.dx / px)),
          );
          const nextObs = Math.max(
            c.lowIndex,
            stepToObsIndex(nextStep, c.count, c.stepMax),
          );
          if (c.fineSteps) {
            hiFineDragStep.current = nextStep;
            bumpFineRender();
          } else if (c.thumbTooltip != null && activeThumbRef.current === "hi") {
            bumpFineRender();
          }
          if (nextObs !== c.highIndex) {
            c.onChange(c.lowIndex, nextObs);
          }
        },
        onPanResponderRelease: () => {
          const c = ctxRef.current;
          if (c.fineSteps) {
            hiFineDragStep.current = null;
          }
          activeThumbRef.current = null;
          bumpFineRender();
        },
        onPanResponderTerminate: () => {
          const c = ctxRef.current;
          if (c.fineSteps) {
            hiFineDragStep.current = null;
          }
          activeThumbRef.current = null;
          bumpFineRender();
        },
      }),
    [bumpFineRender],
  );

  const centerXForStep = (step: number) => {
    if (trackW <= 0) {
      return THUMB_R;
    }
    return THUMB_R + (step / stepMax) * Math.max(0, trackW - 2 * THUMB_R);
  };

  const loLeft = centerXForStep(loVisualStep) - THUMB_R;
  const hiLeft = centerXForStep(hiVisualStep) - THUMB_R;
  const rangeLeft = centerXForStep(loVisualStep);
  const rangeWidth = Math.max(
    0,
    centerXForStep(hiVisualStep) - centerXForStep(loVisualStep),
  );

  const showCallout =
    trackW > 8 && thumbTooltip != null && activeThumbRef.current != null;
  const rootH = showCallout ? 80 : THUMB_ROW_H;

  const loObsForLabel = stepToObsIndex(loVisualStep, count, stepMax);
  const hiObsForLabel = stepToObsIndex(hiVisualStep, count, stepMax);
  const loLabel = thumbTooltip?.getLabel(loObsForLabel) ?? "";
  const hiLabel = thumbTooltip?.getLabel(hiObsForLabel) ?? "";

  return (
    <View
      style={[styles.sliderRoot, { minHeight: rootH }]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      <View style={[styles.thumbRow, { height: THUMB_ROW_H }]}>
        <View style={[styles.trackLine, { backgroundColor: trackColor }]} />
        <View
          pointerEvents="none"
          style={[
            styles.trackRange,
            {
              left: rangeLeft,
              width: rangeWidth,
              backgroundColor: rangeColor,
            },
          ]}
        />
        <View
          {...loPan.panHandlers}
          style={[
            styles.thumb,
            {
              left: loLeft,
              borderColor: thumbBorder,
              backgroundColor: thumbFill,
            },
          ]}
          accessibilityLabel="Adjust range start month"
          accessibilityRole="adjustable"
        />
        <View
          {...hiPan.panHandlers}
          style={[
            styles.thumb,
            {
              left: hiLeft,
              borderColor: thumbBorder,
              backgroundColor: thumbFill,
            },
          ]}
          accessibilityLabel="Adjust range end month"
          accessibilityRole="adjustable"
        />
      </View>

      {showCallout && thumbTooltip && activeThumbRef.current === "lo" && loLabel.length > 0 ? (
        <ThumbCallout
          text={loLabel}
          centerX={centerXForStep(loVisualStep)}
          trackWidth={trackW}
          bottom={CALLOUT_BOTTOM_OFFSET}
          tooltip={thumbTooltip}
        />
      ) : null}
      {showCallout && thumbTooltip && activeThumbRef.current === "hi" && hiLabel.length > 0 ? (
        <ThumbCallout
          text={hiLabel}
          centerX={centerXForStep(hiVisualStep)}
          trackWidth={trackW}
          bottom={CALLOUT_BOTTOM_OFFSET}
          tooltip={thumbTooltip}
        />
      ) : null}
    </View>
  );
}

export const dualRangeSliderPadStyle = {
  paddingVertical: Spacing.sm,
  paddingHorizontal: 4,
  marginBottom: Spacing.md,
};

const styles = StyleSheet.create({
  sliderRoot: {
    position: "relative",
    justifyContent: "flex-end",
  },
  thumbRow: {
    position: "relative",
    width: "100%",
    justifyContent: "center",
  },
  trackLine: {
    position: "absolute",
    left: THUMB_R,
    right: THUMB_R,
    height: 4,
    borderRadius: 2,
    top: "50%",
    marginTop: -2,
  },
  trackRange: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    top: "50%",
    marginTop: -2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_R,
    top: "50%",
    marginTop: -THUMB_R,
    borderWidth: 2,
    zIndex: 2,
  },
  calloutWrap: {
    position: "absolute",
    width: CALLOUT_WIDTH,
    zIndex: 6,
    alignItems: "center",
  },
  calloutBubble: {
    maxWidth: CALLOUT_WIDTH,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  calloutText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    textAlign: "center",
  },
});
