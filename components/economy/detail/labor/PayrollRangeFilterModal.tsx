import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DualRangeSlider,
  dualRangeSliderPadStyle,
} from "@/components/economy/detail/labor/DualRangeSlider";
import { ThemedText } from "@/components/theme/ThemedText";
import { Colors } from "@/constants/theme/Colors";
import { Radius, Spacing, getSemanticColors } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import type { FredObservationRow } from "@/hooks/api/fredObservations";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import {
  clampPayrollRangeIndices,
  findPayrollEndIndex,
  findPayrollStartIndex,
  formatMonthYearShortDisplay,
  parsePayrollFilterMonthInput,
} from "@/lib/economy/payrollMonthRange";

export type PayrollRangeFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  observations: FredObservationRow[];
  startIdx: number;
  endIdx: number;
  onChangeRange: (startIdx: number, endIdx: number) => void;
};

export function PayrollRangeFilterModal({
  visible,
  onClose,
  observations,
  startIdx,
  endIdx,
  onChangeRange,
}: PayrollRangeFilterModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const theme = Colors[colorScheme];
  const interactive = useThemeInteractive();

  const { lo, hi } = useMemo(
    () => clampPayrollRangeIndices(observations, startIdx, endIdx),
    [observations, startIdx, endIdx],
  );

  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");

  useEffect(() => {
    if (!visible || observations.length === 0) {
      return;
    }
    setDraftStart(formatMonthYearShortDisplay(observations[lo]?.date));
    setDraftEnd(formatMonthYearShortDisplay(observations[hi]?.date));
  }, [visible, lo, hi, observations]);

  const count = observations.length;

  const applyDrafts = useCallback(() => {
    if (observations.length === 0) {
      return;
    }
    const a = parsePayrollFilterMonthInput(draftStart);
    const b = parsePayrollFilterMonthInput(draftEnd);
    if (a == null || b == null) {
      return;
    }
    let nextLo = findPayrollStartIndex(observations, a);
    let nextHi = findPayrollEndIndex(observations, b);
    if (nextLo > nextHi) {
      const t = nextLo;
      nextLo = nextHi;
      nextHi = t;
    }
    const c = clampPayrollRangeIndices(observations, nextLo, nextHi);
    onChangeRange(c.lo, c.hi);
    setDraftStart(formatMonthYearShortDisplay(observations[c.lo]?.date));
    setDraftEnd(formatMonthYearShortDisplay(observations[c.hi]?.date));
  }, [draftEnd, draftStart, observations, onChangeRange]);

  const onSliderChange = useCallback(
    (low: number, high: number) => {
      const c = clampPayrollRangeIndices(observations, low, high);
      onChangeRange(c.lo, c.hi);
    },
    [observations, onChangeRange],
  );

  const trackMuted = semantic.hairline;
  const rangeTint = interactive.primarySoft;
  const thumbFill = semantic.cardBackground;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss time range picker"
          style={styles.scrim}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + Spacing.md,
              backgroundColor: semantic.cardBackground,
              borderTopColor: semantic.hairline,
            },
          ]}
        >
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Chart time range
          </ThemedText>
          <ThemedText style={[styles.hint, { color: semantic.mutedText }]}>
            Drag both points or type months as Jan, 2026 (short month, comma, year). Oldest on the
            left, newest on the right.
          </ThemedText>

          {count >= 1 ? (
            <>
              <View style={dualRangeSliderPadStyle}>
                <DualRangeSlider
                  count={count}
                  lowIndex={lo}
                  highIndex={hi}
                  onChange={onSliderChange}
                  trackColor={trackMuted}
                  rangeColor={rangeTint}
                  thumbBorder={interactive.primary}
                  thumbFill={thumbFill}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldCol}>
                  <ThemedText style={[styles.fieldLabel, { color: semantic.mutedText }]}>
                    Start month
                  </ThemedText>
                  <TextInput
                    value={draftStart}
                    onChangeText={setDraftStart}
                    onSubmitEditing={applyDrafts}
                    onBlur={applyDrafts}
                    placeholder="Jan, 2026"
                    placeholderTextColor={semantic.mutedText}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: semantic.hairline,
                        backgroundColor: semantic.screenBackground,
                      },
                    ]}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <ThemedText style={[styles.fieldLabel, { color: semantic.mutedText }]}>
                    End month
                  </ThemedText>
                  <TextInput
                    value={draftEnd}
                    onChangeText={setDraftEnd}
                    onSubmitEditing={applyDrafts}
                    onBlur={applyDrafts}
                    placeholder="Jan, 2026"
                    placeholderTextColor={semantic.mutedText}
                    keyboardType="numbers-and-punctuation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        borderColor: semantic.hairline,
                        backgroundColor: semantic.screenBackground,
                      },
                    ]}
                  />
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.doneBtn,
                  {
                    backgroundColor: interactive.primary,
                    opacity: pressed ? 0.88 : 1,
                  },
                ]}
              >
                <ThemedText style={styles.doneBtnText}>Done</ThemedText>
              </Pressable>
            </>
          ) : (
            <ThemedText style={[styles.empty, { color: semantic.mutedText }]}>
              No payroll data to filter.
            </ThemedText>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    maxHeight: "72%",
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.4,
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    lineHeight: 17,
    marginBottom: Spacing.md,
  },
  fieldRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  fieldCol: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.35,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Fonts.bodySemiBold,
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: Radius.sm,
    marginTop: Spacing.xs,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  empty: {
    fontSize: 13,
    fontFamily: Fonts.body,
    paddingVertical: Spacing.md,
  },
});
