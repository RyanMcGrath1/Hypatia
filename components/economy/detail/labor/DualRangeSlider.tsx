import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme/ThemeTokens";

const THUMB_R = 15;
const THUMB_SIZE = THUMB_R * 2;

export type DualRangeSliderProps = {
  count: number;
  lowIndex: number;
  highIndex: number;
  onChange: (low: number, high: number) => void;
  trackColor: string;
  rangeColor: string;
  thumbBorder: string;
  thumbFill: string;
};

export function DualRangeSlider({
  count,
  lowIndex,
  highIndex,
  onChange,
  trackColor,
  rangeColor,
  thumbBorder,
  thumbFill,
}: DualRangeSliderProps) {
  const [trackW, setTrackW] = useState(0);
  const grantLo = useRef(0);
  const grantHi = useRef(0);

  const span = Math.max(1, count - 1);

  const pxPerIndex = useMemo(() => {
    const inner = Math.max(0, trackW - 2 * THUMB_R);
    if (inner <= 0) {
      return 1;
    }
    return inner / span;
  }, [trackW, span]);

  const indexFromDx = useCallback(
    (grantIdx: number, dx: number): number => {
      return Math.round(grantIdx + dx / pxPerIndex);
    },
    [pxPerIndex],
  );

  const loPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          grantLo.current = lowIndex;
        },
        onPanResponderMove: (_, gs) => {
          const next = indexFromDx(grantLo.current, gs.dx);
          const clamped = Math.max(0, Math.min(highIndex, next));
          if (clamped !== lowIndex) {
            onChange(clamped, highIndex);
          }
        },
      }),
    [highIndex, lowIndex, onChange, indexFromDx],
  );

  const hiPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          grantHi.current = highIndex;
        },
        onPanResponderMove: (_, gs) => {
          const next = indexFromDx(grantHi.current, gs.dx);
          const clamped = Math.max(lowIndex, Math.min(count - 1, next));
          if (clamped !== highIndex) {
            onChange(lowIndex, clamped);
          }
        },
      }),
    [count, highIndex, lowIndex, onChange, indexFromDx],
  );

  const centerX = (idx: number) => {
    if (trackW <= 0) {
      return THUMB_R;
    }
    return THUMB_R + (idx / span) * Math.max(0, trackW - 2 * THUMB_R);
  };

  const loLeft = centerX(lowIndex) - THUMB_R;
  const hiLeft = centerX(highIndex) - THUMB_R;
  const rangeLeft = centerX(lowIndex);
  const rangeWidth = Math.max(0, centerX(highIndex) - centerX(lowIndex));

  return (
    <View
      style={styles.sliderRoot}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
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
  );
}

export const dualRangeSliderPadStyle = {
  paddingVertical: Spacing.sm,
  paddingHorizontal: 4,
  marginBottom: Spacing.md,
};

const styles = StyleSheet.create({
  sliderRoot: {
    height: 44,
    justifyContent: "center",
    position: "relative",
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
});
