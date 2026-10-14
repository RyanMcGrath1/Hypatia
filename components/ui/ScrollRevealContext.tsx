import { createContext, useContext } from "react";
import type { SharedValue } from "react-native-reanimated";

/** Live scroll position and viewport height of the nearest scroll container. */
export type ScrollRevealState = {
  scrollY: SharedValue<number>;
  viewportHeight: SharedValue<number>;
};

export const ScrollRevealContext = createContext<ScrollRevealState | null>(null);

export function useScrollReveal(): ScrollRevealState | null {
  return useContext(ScrollRevealContext);
}
