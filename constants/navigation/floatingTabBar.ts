/** Layout for the bottom tab bar (docked to screen bottom + safe area inset). */
export const FLOATING_TAB_BAR = {
  /** Tab row height (icons + labels), excluding home-indicator padding. */
  contentHeight: 54,
  /** Rounded top corners only (bar is flush to bottom of screen). */
  topCornerRadius: 16,
  /**
   * Horizontal inset from screen edges (0 = full-width docked bar).
   * Previously used for a floating pill; keep 0 for edge-to-edge.
   */
  horizontalGutter: 0,
  /** Extra lift above the bottom safe area (0 = bar flush to screen bottom). */
  bottomOffset: 0,
} as const;
