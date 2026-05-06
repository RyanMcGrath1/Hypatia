/**
 * Hypatia Precision — Material-style tokens (YAML reference).
 * `Brand` legacy keys preserve older imports (e.g. `springGreen` → primary).
 */

export const Palette = {
  canvas: '#fbf8ff',
  white: '#ffffff',
  ink: '#1a1b23',
  muted: '#444655',
  border: '#c4c5d7',
  divider: '#e2e1ed',
  outline: '#747686',
  primary: '#264dd9',
  primarySoft: '#dde1ff',
  surfaceTint: '#294fdb',
  secondary: '#006780',
  secondarySoft: '#b7eaff',
  tertiary: '#974300',
  tertiarySoft: '#ffdbc9',
  /** Positive trends / success — calm green (not in YAML; pairs with data viz). */
  success: '#1d6f52',
  successSoft: '#d9eee6',
  warning: '#974300',
  warningSoft: '#ffdbc9',
  danger: '#ba1a1a',
  dangerSoft: '#ffdad6',
  info: '#006780',
  infoSoft: '#b7eaff',
  darkCanvas: '#1a1b23',
  darkElevated: '#2f3039',
  darkSurfaceHigh: '#3a3b47',
} as const;

/** Legacy names mapped to Precision tokens */
export const Brand = {
  ...Palette,
  onyx: Palette.darkCanvas,
  deepNavy: Palette.darkCanvas,
  charcoal: Palette.darkElevated,
  slate: Palette.darkElevated,
  darkSlateGrey: Palette.darkElevated,
  slateBlue: Palette.muted,
  slateGrey: Palette.muted,
  steel: Palette.outline,
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
  canvas: [251, 248, 255] as const,
  white: [255, 255, 255] as const,
  ink: [26, 27, 35] as const,
  muted: [68, 70, 85] as const,
  primary: [38, 77, 217] as const,
  success: [29, 111, 82] as const,
  danger: [186, 26, 26] as const,
  darkCanvas: [26, 27, 35] as const,
  darkElevated: [47, 48, 57] as const,
  /** Legacy aliases */
  onyx: [26, 27, 35] as const,
  lavender: [251, 248, 255] as const,
  offWhite: [251, 248, 255] as const,
  charcoal: [47, 48, 57] as const,
  teal: [38, 77, 217] as const,
  springGreen: [38, 77, 217] as const,
  slateGrey: [68, 70, 85] as const,
  slateBlue: [68, 70, 85] as const,
  deepNavy: [26, 27, 35] as const,
} as const;

const tintLight = Palette.primary;
/** Inverse primary — interactive accent on dark surfaces (DESIGN.md). */
const tintDark = '#b8c3ff';

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
    text: '#f1effb',
    background: Brand.darkCanvas,
    tint: tintDark,
    icon: 'rgba(241,239,251,0.55)',
    tabIconDefault: 'rgba(241,239,251,0.45)',
    tabIconSelected: tintDark,
  },
};
