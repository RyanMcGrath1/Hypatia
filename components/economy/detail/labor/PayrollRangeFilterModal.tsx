import Feather from "@expo/vector-icons/Feather";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/theme/ThemedText";
import { Palette } from "@/constants/theme/Colors";
import {
  Radius,
  Spacing,
  getSemanticColors,
} from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeInteractive } from "@/hooks/useThemeInteractive";
import {
  PAYROLL_FILTER_SLIDER_FIRST_KEY,
  addPayrollMonthsWithinSeries,
  clampPayrollSeriesLastMonthKey,
  monthKeyFromPayrollFilterSliderStep,
  payrollFilterSliderStepFromMonthKey,
  payrollObservationWindowFromMonthKeys,
  payrollYtdMatchesMonthKeys,
  payrollYtdMonthKeysUtc,
} from "@/lib/economy/payrollMonthRange";

export type PayrollRangeFilterCloseReason = "confirm" | "dismiss";

export type PayrollRangeCommitPayload = {
  observationStart: string;
  observationEnd: string;
};

export type PayrollRangeFilterModalProps = {
  visible: boolean;
  onClose: (
    reason: PayrollRangeFilterCloseReason,
    commit?: PayrollRangeCommitPayload,
  ) => void;
  committedObservationStart: string;
  committedObservationEnd: string;
  seriesLastMonthKey: string;
};

type ActiveField = "start" | "end";
type PresetId = "ytd" | "12m" | "5y" | "10y" | "25y" | "max";

const MONTH_INDEX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** Full month names per calendar month 1–12 (avoids local-TZ off-by-one from `Date`). */
const MONTH_LONG_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function monthKeyFromYearMonth(y: number, month: number): string {
  return `${y}-${String(month).padStart(2, "0")}`;
}

function formatCardMonthYear(monthKey: string): string {
  const d = new Date(`${monthKey.slice(0, 7)}-01T12:00:00Z`);
  if (Number.isNaN(d.getTime())) {
    return monthKey;
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function decadeStartList(seriesLastMonthKey: string): number[] {
  const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
  const ly = parseInt(last.slice(0, 4), 10);
  const low = Math.floor(1948 / 10) * 10;
  const high = Math.floor(ly / 10) * 10;
  const out: number[] = [];
  for (let d = high; d >= low; d -= 10) {
    out.push(d);
  }
  return out;
}

function yearsInDecade(decadeBase: number, seriesLastMonthKey: string): number[] {
  const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
  const ly = parseInt(last.slice(0, 4), 10);
  const lm = parseInt(last.slice(5, 7), 10);
  const ys: number[] = [];
  for (let y = decadeBase + 9; y >= decadeBase; y--) {
    if (y >= 1948 && y <= ly) {
      ys.push(y);
    }
  }
  if (ys.length === 0 && ly >= decadeBase && ly < decadeBase + 10) {
    return [ly];
  }
  return ys;
}

function monthSelectable(
  y: number,
  month: number,
  seriesLastMonthKey: string,
): boolean {
  const key = monthKeyFromYearMonth(y, month);
  if (key < PAYROLL_FILTER_SLIDER_FIRST_KEY) {
    return false;
  }
  const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
  if (key > last) {
    return false;
  }
  return true;
}

export function PayrollRangeFilterModal({
  visible,
  onClose,
  committedObservationStart,
  committedObservationEnd,
  seriesLastMonthKey,
}: PayrollRangeFilterModalProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "light";
  const semantic = getSemanticColors(colorScheme);
  const interactive = useThemeInteractive();
  const isDark = colorScheme === "dark";

  const [rangeStartKey, setRangeStartKey] = useState(PAYROLL_FILTER_SLIDER_FIRST_KEY);
  const [rangeEndKey, setRangeEndKey] = useState(
    clampPayrollSeriesLastMonthKey(seriesLastMonthKey),
  );
  const [activeField, setActiveField] = useState<ActiveField>("start");
  const [presetId, setPresetId] = useState<PresetId | null>("ytd");
  const [uiDecadeBase, setUiDecadeBase] = useState(2020);
  const [uiYear, setUiYear] = useState(2024);
  const selectYtdOnNextOpenRef = useRef(true);

  const ink = isDark ? Palette.darkOnSurface : Palette.ink;
  const muted = semantic.mutedText;
  const primary = interactive.primary;
  const panelTint = isDark ? "rgba(184, 195, 255, 0.12)" : "rgba(228, 232, 255, 0.95)";
  const panelBorder = isDark ? "rgba(142, 144, 160, 0.25)" : "rgba(38, 77, 217, 0.12)";
  const selectedDecadeRail = primary;

  const decades = useMemo(
    () => decadeStartList(seriesLastMonthKey),
    [seriesLastMonthKey],
  );

  const years = useMemo(
    () => yearsInDecade(uiDecadeBase, seriesLastMonthKey),
    [uiDecadeBase, seriesLastMonthKey],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    const k0 = committedObservationStart.trim().slice(0, 10);
    const k1 = committedObservationEnd.trim().slice(0, 10);
    const m0 = k0.slice(0, 7);
    const m1 = k1.slice(0, 7);
    const lo = m0 <= m1 ? m0 : m1;
    const hi = m0 <= m1 ? m1 : m0;
    setRangeStartKey(lo);
    setRangeEndKey(hi);
    setActiveField("start");
    const isYtdRange = payrollYtdMatchesMonthKeys(lo, hi);
    if (selectYtdOnNextOpenRef.current || isYtdRange) {
      setPresetId("ytd");
      selectYtdOnNextOpenRef.current = false;
    } else {
      setPresetId(null);
    }
    const startYear = parseInt(lo.slice(0, 4), 10);
    if (Number.isFinite(startYear)) {
      setUiDecadeBase(Math.floor(startYear / 10) * 10);
      setUiYear(startYear);
    }
  }, [
    visible,
    committedObservationStart,
    committedObservationEnd,
  ]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const key = activeField === "start" ? rangeStartKey : rangeEndKey;
    const y = parseInt(key.slice(0, 4), 10);
    if (!Number.isFinite(y)) {
      return;
    }
    const dec = Math.floor(y / 10) * 10;
    setUiDecadeBase(dec);
    setUiYear(y);
  }, [visible, activeField, rangeStartKey, rangeEndKey]);

  useEffect(() => {
    if (years.length === 0) {
      return;
    }
    if (!years.includes(uiYear)) {
      setUiYear(years[0]!);
    }
  }, [years, uiYear]);

  const applyPreset = useCallback(
    (id: PresetId) => {
      const last = clampPayrollSeriesLastMonthKey(seriesLastMonthKey);
      let start: string;
      let end = last;
      switch (id) {
        case "ytd": {
          const ytd = payrollYtdMonthKeysUtc();
          start = ytd.start;
          end = ytd.end;
          break;
        }
        case "12m":
          start = addPayrollMonthsWithinSeries(last, -(12 - 1), seriesLastMonthKey);
          break;
        case "5y":
          start = addPayrollMonthsWithinSeries(last, -(60 - 1), seriesLastMonthKey);
          break;
        case "10y":
          start = addPayrollMonthsWithinSeries(last, -(120 - 1), seriesLastMonthKey);
          break;
        case "25y":
          start = addPayrollMonthsWithinSeries(last, -(300 - 1), seriesLastMonthKey);
          break;
        case "max":
          start = PAYROLL_FILTER_SLIDER_FIRST_KEY;
          break;
        default:
          start = PAYROLL_FILTER_SLIDER_FIRST_KEY;
      }
      let lo = start;
      let hi = end;
      if (lo > hi) {
        const t = lo;
        lo = hi;
        hi = t;
      }
      setRangeStartKey(lo);
      setRangeEndKey(hi);
      setPresetId(id);
    },
    [seriesLastMonthKey],
  );

  const commitMonthToActiveField = useCallback(
    (y: number, month: number) => {
      const raw = monthKeyFromYearMonth(y, month);
      const step = payrollFilterSliderStepFromMonthKey(raw, seriesLastMonthKey);
      const clamped = monthKeyFromPayrollFilterSliderStep(step, seriesLastMonthKey);
      let lo = rangeStartKey;
      let hi = rangeEndKey;
      if (activeField === "start") {
        lo = clamped;
        if (lo > hi) {
          hi = lo;
        }
      } else {
        hi = clamped;
        if (hi < lo) {
          lo = hi;
        }
      }
      setRangeStartKey(lo);
      setRangeEndKey(hi);
      setPresetId(null);
    },
    [
      activeField,
      rangeEndKey,
      rangeStartKey,
      seriesLastMonthKey,
    ],
  );

  const confirmClose = useCallback(() => {
    const commit = payrollObservationWindowFromMonthKeys(rangeStartKey, rangeEndKey);
    onClose("confirm", commit);
  }, [onClose, rangeEndKey, rangeStartKey]);

  const activeEditingKey = activeField === "start" ? rangeStartKey : rangeEndKey;
  const editingYearNum = parseInt(activeEditingKey.slice(0, 4), 10);
  const editingMonthNum = parseInt(activeEditingKey.slice(5, 7), 10);

  const presetPills: { id: PresetId; label: string }[] = [
    { id: "ytd", label: "YTD" },
    { id: "12m", label: "Last 12 Months" },
    { id: "5y", label: "Last 5 Years" },
    { id: "10y", label: "Last 10 Years" },
    { id: "25y", label: "Last 25 Years" },
    { id: "max", label: "Max Range" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => onClose("dismiss")}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss time range picker"
          style={[styles.scrim, { backgroundColor: semantic.overlayScrim }]}
          onPress={() => onClose("dismiss")}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: semantic.cardBackground,
              borderTopColor: semantic.hairline,
            },
          ]}
        >
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
                onPress={() => onClose("dismiss")}
                style={styles.headerSideBtn}
              >
                <Feather name="x" size={24} color={primary} />
              </Pressable>
              <ThemedText style={[styles.headerTitle, { color: primary }]}>
                Select Date Range
              </ThemedText>
              <View style={styles.headerSideBtn} accessibilityElementsHidden />
            </View>

            <View style={styles.dateCardsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: activeField === "start" }}
                onPress={() => {
                  setActiveField("start");
                  setPresetId(null);
                }}
                style={[
                  styles.dateCard,
                  styles.dateCardFlex,
                  {
                    borderColor: semantic.hairline,
                    backgroundColor: semantic.screenBackground,
                  },
                  activeField === "start" && { borderColor: primary, borderWidth: 2 },
                ]}
              >
                <ThemedText style={[styles.dateCardKicker, { color: muted }]}>
                  START DATE
                </ThemedText>
                <View style={styles.dateCardRow}>
                  <Feather name="calendar" size={20} color={primary} />
                  <ThemedText
                    style={[styles.dateCardValue, { color: ink }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {formatCardMonthYear(rangeStartKey)}
                  </ThemedText>
                </View>
              </Pressable>

              <View style={styles.rangeDashWrap} accessibilityElementsHidden>
                <ThemedText style={[styles.rangeDash, { color: muted }]}>—</ThemedText>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: activeField === "end" }}
                onPress={() => {
                  setActiveField("end");
                  setPresetId(null);
                }}
                style={[
                  styles.dateCard,
                  styles.dateCardFlex,
                  {
                    borderColor: semantic.hairline,
                    backgroundColor: semantic.screenBackground,
                  },
                  activeField === "end" && { borderColor: primary, borderWidth: 2 },
                ]}
              >
                <ThemedText style={[styles.dateCardKicker, { color: muted }]}>
                  END DATE
                </ThemedText>
                <View style={styles.dateCardRow}>
                  <Feather name="calendar" size={20} color={primary} />
                  <ThemedText
                    style={[styles.dateCardValue, { color: ink }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {formatCardMonthYear(rangeEndKey)}
                  </ThemedText>
                </View>
              </Pressable>
            </View>

            <ThemedText style={[styles.sectionLabel, { color: muted }]}>
              QUICK PRESETS
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetScroll}
              nestedScrollEnabled
            >
              {presetPills.map((p) => {
                const selected = presetId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => applyPreset(p.id)}
                    style={[
                      styles.presetPill,
                      {
                        borderColor: semantic.hairline,
                        backgroundColor: semantic.cardBackground,
                      },
                      selected && {
                        backgroundColor: primary,
                        borderColor: primary,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.presetPillText,
                        { color: ink },
                        selected && { color: "#FFFFFF" },
                      ]}
                    >
                      {p.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View
              style={[
                styles.pickerShell,
                { backgroundColor: panelTint, borderColor: panelBorder },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.decadeScroll}
                nestedScrollEnabled
              >
                {decades.map((d) => {
                  const isSel = uiDecadeBase === d;
                  const show = `${Math.floor(d / 10)}0s`;

                  return (
                    <Pressable
                      key={d}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSel }}
                      onPress={() => {
                        setUiDecadeBase(d);
                        const ys = yearsInDecade(d, seriesLastMonthKey);
                        if (ys[0]) {
                          setUiYear(ys[0]);
                        }
                        setPresetId(null);
                      }}
                      style={[
                        styles.decadeCell,
                        isSel && {
                          backgroundColor: isDark ? "rgba(184,195,255,0.08)" : "rgba(221,225,255,0.6)",
                          borderLeftWidth: 3,
                          borderLeftColor: selectedDecadeRail,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.decadeCellText,
                          { color: isSel ? primary : ink },
                        ]}
                      >
                        {show}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearStrip}
                nestedScrollEnabled
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Earlier years"
                  hitSlop={8}
                  onPress={() => {
                    const prev = decades.findIndex((x) => x === uiDecadeBase);
                    if (prev >= 0 && prev < decades.length - 1) {
                      const nextDec = decades[prev + 1]!;
                      setUiDecadeBase(nextDec);
                      const ys = yearsInDecade(nextDec, seriesLastMonthKey);
                      if (ys[0]) {
                        setUiYear(ys[0]);
                      }
                    }
                  }}
                >
                  <Feather name="chevron-left" size={22} color={muted} />
                </Pressable>
                {years.map((y) => (
                  <Pressable
                    key={y}
                    accessibilityRole="button"
                    accessibilityState={{ selected: uiYear === y }}
                    onPress={() => {
                      setUiYear(y);
                      setPresetId(null);
                    }}
                    style={[styles.yearCell, uiYear === y && styles.yearCellSelected]}
                  >
                    <ThemedText
                      style={[
                        styles.yearCellText,
                        { color: uiYear === y ? primary : ink },
                      ]}
                    >
                      {y}
                    </ThemedText>
                    {uiYear === y ? (
                      <View
                        style={[styles.yearUnderline, { backgroundColor: primary }]}
                      />
                    ) : null}
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Later years"
                  hitSlop={8}
                  onPress={() => {
                    const prev = decades.findIndex((x) => x === uiDecadeBase);
                    if (prev > 0) {
                      const nextDec = decades[prev - 1]!;
                      setUiDecadeBase(nextDec);
                      const ys = yearsInDecade(nextDec, seriesLastMonthKey);
                      if (ys[0]) {
                        setUiYear(ys[0]);
                      }
                    }
                  }}
                >
                  <Feather name="chevron-right" size={22} color={muted} />
                </Pressable>
              </ScrollView>

              <View style={styles.monthGrid}>
                {MONTH_INDEX.map((month) => {
                  const ok = monthSelectable(uiYear, month, seriesLastMonthKey);
                  const isSelected =
                    ok &&
                    Number.isFinite(editingYearNum) &&
                    Number.isFinite(editingMonthNum) &&
                    uiYear === editingYearNum &&
                    month === editingMonthNum;

                  const label = MONTH_LONG_EN[month - 1];

                  return (
                    <Pressable
                      key={month}
                      accessibilityRole="button"
                      accessibilityState={{
                        disabled: !ok,
                        selected: Boolean(isSelected),
                      }}
                      disabled={!ok}
                      onPress={() => commitMonthToActiveField(uiYear, month)}
                      style={[
                        styles.monthTile,
                        {
                          borderColor: semantic.hairline,
                          backgroundColor: semantic.cardBackground,
                        },
                        isSelected && {
                          backgroundColor: primary,
                          borderColor: primary,
                        },
                        !ok && styles.monthTileDisabled,
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.monthTileText,
                          { color: isSelected ? "#FFFFFF" : ink },
                          !ok && { opacity: 0.35 },
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + Spacing.sm,
                borderTopColor: semantic.hairline,
                backgroundColor: semantic.cardBackground,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apply date range"
              onPress={confirmClose}
              style={({ pressed }) => [
                styles.doneBtn,
                {
                  backgroundColor: primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <ThemedText style={styles.doneBtnText}>Apply</ThemedText>
            </Pressable>
          </View>
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
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "92%",
    maxHeight: "92%",
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    flexDirection: "column",
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  footer: {
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  headerSideBtn: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: Fonts.bodyBold,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  dateCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dateCard: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: Spacing.sm,
  },
  dateCardFlex: {
    flex: 1,
    minWidth: 0,
  },
  rangeDashWrap: {
    justifyContent: "center",
    paddingTop: 18,
  },
  rangeDash: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    lineHeight: 16,
  },
  dateCardKicker: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.55,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  dateCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateCardValue: {
    fontSize: 17,
    fontFamily: Fonts.bodyBold,
    letterSpacing: -0.35,
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.bodyBold,
    letterSpacing: 0.55,
    marginTop: Spacing.xs,
    textTransform: "uppercase",
  },
  presetScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
    flexGrow: 0,
  },
  presetPill: {
    paddingVertical: 9,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetPillText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
  },
  pickerShell: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    marginTop: Spacing.xs,
  },
  decadeScroll: {
    flexDirection: "row",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 4,
  },
  decadeCell: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  decadeCellText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
  },
  yearStrip: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  yearCell: {
    minWidth: 48,
    alignItems: "center",
    paddingBottom: 4,
  },
  yearCellSelected: {},
  yearCellText: {
    fontSize: 17,
    fontFamily: Fonts.bodyBold,
  },
  yearUnderline: {
    marginTop: 4,
    height: 3,
    width: "85%",
    borderRadius: 2,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  monthTile: {
    width: "31%",
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTileDisabled: {
    opacity: 0.45,
  },
  monthTileText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    textAlign: "center",
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: Radius.md,
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
