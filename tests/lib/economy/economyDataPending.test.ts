import { describe, expect, it } from "vitest";

import { isEconomyDataPending } from "@/lib/economy/economyDataPending";

describe("isEconomyDataPending", () => {
  it("is pending while loading without data", () => {
    expect(
      isEconomyDataPending({ isLoading: true, error: null, hasData: false }),
    ).toBe(true);
  });

  it("is pending on error when no cached data", () => {
    expect(
      isEconomyDataPending({
        isLoading: false,
        error: "Network request failed",
        hasData: false,
      }),
    ).toBe(true);
  });

  it("is not pending when data is present", () => {
    expect(
      isEconomyDataPending({
        isLoading: true,
        error: "stale error",
        hasData: true,
      }),
    ).toBe(false);
  });

  it("is not pending when idle with no error and no data", () => {
    expect(
      isEconomyDataPending({ isLoading: false, error: null, hasData: false }),
    ).toBe(false);
  });
});
