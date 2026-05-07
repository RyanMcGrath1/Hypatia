import { Spacing } from "@/constants/theme/ThemeTokens";

/**
 * Tab root scroll padding so the Hypatia brand row (icon + wordmark) lines up
 * across News, Economy, Politician, and Explore.
 */
export const TAB_SCREEN_CONTENT_INSETS = {
  paddingHorizontal: Spacing.lg,
  paddingTop: Spacing.xs,
} as const;
