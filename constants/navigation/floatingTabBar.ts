/** Layout for the floating bottom tab bar (inset pill). */
export const FLOATING_TAB_BAR = {
  height: 62,
  borderRadius: 31,
  /**
   * Horizontal padding added on top of `useSafeAreaInsets().left` / `.right`.
   * Keeps the bar off curved corners, notches, and narrow portrait edges.
   */
  horizontalGutter: 40,
  /** Extra gap above the home indicator / system nav bar (added to safe-area bottom). */
  bottomOffset: 12,
} as const;
