/**
 * Hypatia palette — Onyx, Dark Slate Grey, Slate Grey, Lavender, Spring Green.
 * Legacy keys (`deepNavy`, `slateBlue`, …) keep existing imports working.
 */
export const Palette = {
  onyx: "#00120b",
  darkSlateGrey: "#35605a",
  slateGrey: "#6b818c",
  lavender: "#d8e4ff",
  springGreen: "#31e981",
} as const;

export const Brand = {
  ...Palette,
  deepNavy: Palette.onyx,
  slateBlue: Palette.slateGrey,
  offWhite: Palette.lavender,
  /** Legacy — secondary dark (charts); primary text uses `ink` / `onyx`. */
  charcoal: Palette.darkSlateGrey,
  teal: Palette.springGreen,
  paper: Palette.lavender,
  steel: Palette.slateGrey,
  ink: Palette.onyx,
  slate: Palette.darkSlateGrey,
  coral: Palette.springGreen,
} as const;

/** RGB tuples for chart kit / overlays that need `rgba(...)`. */
export const BrandRgb = {
  onyx: [0, 18, 11] as const,
  darkSlateGrey: [53, 96, 90] as const,
  slateGrey: [107, 129, 140] as const,
  lavender: [216, 228, 255] as const,
  springGreen: [49, 233, 129] as const,
  /** Legacy — same channels as palette names above */
  offWhite: [216, 228, 255] as const,
  teal: [49, 233, 129] as const,
  charcoal: [0, 18, 11] as const,
  slateBlue: [107, 129, 140] as const,
  deepNavy: [0, 18, 11] as const,
} as const;

const tintLight = Brand.springGreen;
const tintDark = Brand.springGreen;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.lavender,
    tint: tintLight,
    icon: Brand.steel,
    tabIconDefault: Brand.steel,
    tabIconSelected: tintLight,
  },
  dark: {
    text: Brand.lavender,
    background: Brand.onyx,
    tint: tintDark,
    icon: "rgba(216,228,255,0.55)",
    tabIconDefault: "rgba(216,228,255,0.45)",
    tabIconSelected: tintDark,
  },
};
