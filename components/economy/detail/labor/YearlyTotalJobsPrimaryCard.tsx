import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";

import { YearlyTotalJobsMetricSkeleton } from "@/components/economy/detail/labor/LaborDetailSkeletons";
import { formatPayemsMomDeltaShort } from "@/components/economy/detail/labor/payrollChartFromFred";
import { Radius, Spacing } from "@/constants/theme/ThemeTokens";
import { Fonts } from "@/constants/theme/Typography";

/**
 * YearlyTotalJobsPrimaryCard — layout anatomy (top → bottom, z-order):
 *
 *   ┌─ card (solid primary fill, xl radius, lg padding) ─────────────────┐
 *   │  ┌─ decorWrap: absolute top-right, z=0 (watermark; not interactive)   │
 *   │  │    Feather trending-up, low-opacity white                          │
 *   │  └────────────────────────────────────────────────────────────────────│
 *   │  ┌─ content: z=1, full width + right inset so text clears watermark ─│
 *   │  │  ① kicker     — "TOTAL JOBS" (uppercase label)                     │
 *   │  │  ② metricRow  — row: net jobs from chart (last−first level shown) + optional YoY pill   │
 *   │  │       OR loadingRow + ActivityIndicator                             │
 *   │  │  ③ footer     — optional caption (regular Inter, muted white)      │
 *   │  └────────────────────────────────────────────────────────────────────│
 *   └──────────────────────────────────────────────────────────────────────┘
 */

/** Hypatia Primary Metric — vibrant field (Hypatia spec). */
const HYPATIA_PRIMARY_METRIC_BG = "#4A6CF7";

const DECOR_ICON_COLOR = "rgba(255, 255, 255, 0.2)";

export type YearlyTotalJobsPrimaryCardProps = {
  /**
   * Net payroll change (thousands) for the PAYEMS chart: sum of MoM deltas in the visible window
   * — see `computeDisplayedChartNetLevelDeltaThousands`. Ignored when `heroValueLabel` is set.
   */
  netThousands: number | null;
  /** Shown when `netThousands` is null and `heroValueLabel` is unset. */
  fallbackValueLabel?: string;
  /** e.g. `+1.2% YoY` — optional pill in ② (right of hero value). */
  badgeLabel?: string;
  /** Optional ③ footer (accumulated growth copy, etc.). */
  subtitle?: string;
  /** When true, ② shows `loadingRow` instead of value + badge. */
  loading?: boolean;
  /** Overrides ① — default `TOTAL JOBS` (PAYEMS). */
  kickerLabel?: string;
  /**
   * When set, shown as the hero figure instead of formatting `netThousands` (e.g. economy detail headline
   * or API-derived net change string).
   */
  heroValueLabel?: string;
};

/**
 * Hypatia “Primary Metric” card: primary field + optional YoY pill + footer, Inter, decorative mark.
 */
export function YearlyTotalJobsPrimaryCard({
  netThousands,
  fallbackValueLabel = "—",
  badgeLabel,
  subtitle,
  loading,
  kickerLabel,
  heroValueLabel,
}: YearlyTotalJobsPrimaryCardProps) {
  const valueLabel =
    heroValueLabel != null && heroValueLabel.trim() !== ""
      ? heroValueLabel.trim()
      : netThousands != null
        ? formatPayemsMomDeltaShort(netThousands)
        : fallbackValueLabel;

  const a11y = [
    kickerLabel?.trim() || "Total jobs",
    valueLabel,
    badgeLabel,
    subtitle,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    /* ─── Root: primary surface + a11y summary ─── */
    <View style={styles.card} accessibilityLabel={a11y}>
      {/* ─── Layer 0: decorative watermark (ignored by screen readers) ─── */}
      <View
        style={styles.decorWrap}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        <Feather name="trending-up" size={40} color={DECOR_ICON_COLOR} />
      </View>

      {/* ─── Layer 1: text stack (sits above watermark) ─── */}
      <View style={styles.content}>
        {/* ① Header label */}
        <Text style={styles.kicker}>{kickerLabel?.trim() || "TOTAL JOBS"}</Text>

        {loading ? (
          <YearlyTotalJobsMetricSkeleton />
        ) : (
          /* ② Hero row: headline figure + optional YoY pill */
          <View style={styles.metricRow}>
            <Text
              style={styles.value}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {valueLabel}
            </Text>
            {badgeLabel ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {badgeLabel}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ③ Supporting line under the hero numbers */}
        {subtitle ? (
          <Text style={styles.footer} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Root container */
  card: {
    marginTop: Spacing.sm,
    backgroundColor: HYPATIA_PRIMARY_METRIC_BG,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  /* Watermark: pinned to card’s top-right, behind `content` */
  decorWrap: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    zIndex: 0,
  },
  /* Main column; right padding reserves space for `decorWrap` */
  content: {
    zIndex: 1,
    width: "100%",
    paddingRight: 56,
  },
  /* ① Kicker */
  kicker: {
    fontFamily: Fonts.displayBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.55,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  /* ② Row: hero value + badge */
  metricRow: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    flexWrap: "nowrap",
    gap: 10,
    minHeight: 44,
  },
  /* ②a Big number (shrinks first if row is tight) */
  value: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: Fonts.displayBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.75,
    color: "#FFFFFF",
  },
  /* ②b Frosted pill for YoY (optional) */
  badge: {
    flexShrink: 0,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: Radius.md,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  badgeText: {
    /* Label inside the YoY pill (`badge`) */
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.1,
    color: "#FFFFFF",
  },
  /* ③ Footer / description */
  footer: {
    marginTop: Spacing.md,
    fontFamily: Fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.72)",
  },
  /* Spinner row (same vertical slot as `metricRow`) */
  loadingRow: {
    marginTop: Spacing.md,
    minHeight: 44,
    justifyContent: "flex-start",
  },
});
