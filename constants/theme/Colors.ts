/**
 * Dashboard-inspired palette (reference: soft gray canvas, white cards, primary blue).
 * Legacy `Brand` keys keep older imports working (e.g. `springGreen` → primary accent).
 */

export const Palette = {
  canvas: "#F4F7F9",
  white: "#FFFFFF",
  ink: "#333333",
  muted: "#828282",
  border: "#E0E0E0",
  divider: "#F2F2F2",
  primary: "#4A6CF7",
  primarySoft: "#E8EEFF",
  success: "#6FCF97",
  successSoft: "#E3F7EB",
  warning: "#F2C94C",
  warningSoft: "#FFF8E5",
  danger: "#EB5757",
  dangerSoft: "#FFEAEA",
  info: "#56CCF2",
  infoSoft: "#E5F7FD",
  darkCanvas: "#1a1d26",
  darkElevated: "#242832",
} as const;

/** Legacy names mapped to dashboard tokens */
export const Brand = {
  ...Palette,
  onyx: Palette.darkCanvas,
  deepNavy: Palette.darkCanvas,
  charcoal: Palette.darkElevated,
  slate: Palette.darkElevated,
  darkSlateGrey: Palette.darkElevated,
  slateBlue: Palette.muted,
  slateGrey: Palette.muted,
  steel: Palette.muted,
  offWhite: Palette.canvas,
  paper: Palette.white,
  lavender: Palette.canvas,
  /** Primary accent (tabs, CTAs, links) — historically “spring green”. */
  springGreen: Palette.primary,
  teal: Palette.primary,
  /** Positive / economy accents — historically coral */
  coral: Palette.success,
} as const;

/** RGB tuples for charts and overlays. */
export const BrandRgb = {
  canvas: [244, 247, 249] as const,
  white: [255, 255, 255] as const,
  ink: [51, 51, 51] as const,
  muted: [130, 130, 130] as const,
  primary: [74, 108, 247] as const,
  success: [111, 207, 151] as const,
  danger: [235, 87, 87] as const,
  darkCanvas: [26, 29, 38] as const,
  darkElevated: [36, 40, 50] as const,
  /** Legacy aliases */
  onyx: [26, 29, 38] as const,
  lavender: [244, 247, 249] as const,
  offWhite: [244, 247, 249] as const,
  charcoal: [36, 40, 50] as const,
  teal: [74, 108, 247] as const,
  springGreen: [74, 108, 247] as const,
  slateGrey: [130, 130, 130] as const,
  slateBlue: [130, 130, 130] as const,
  deepNavy: [26, 29, 38] as const,
} as const;

const tintLight = Palette.primary;
const tintDark = Palette.primary;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.canvas,
    tint: tintLight,
    icon: Brand.muted,
    tabIconDefault: Brand.muted,
    tabIconSelected: tintLight,
  },
  dark: {
    text: "#E8EAED",
    background: Brand.darkCanvas,
    tint: tintDark,
    icon: "rgba(232,234,237,0.55)",
    tabIconDefault: "rgba(232,234,237,0.45)",
    tabIconSelected: "#8EA4FB",
  },
};
