import { describe, expect, it } from "vitest";

import {
  appBannerShowsBack,
  isMainTabPathname,
} from "@/lib/navigation/appBannerBack";

describe("isMainTabPathname", () => {
  it.each([
    "/",
    "/(tabs)",
    "/(tabs)/",
    "/(tabs)/economy",
    "/(tabs)/explore",
    "/economy",
    "/explore",
    "/politician",
    "/index",
  ])("returns true for tab root %s", (pathname) => {
    expect(isMainTabPathname(pathname)).toBe(true);
    expect(appBannerShowsBack(pathname)).toBe(false);
  });

  it.each([
    "/economy/labor",
    "/economy/inflation",
    "/politician/alex-harper",
    "/article",
    "/profile",
  ])("returns false for detail route %s", (pathname) => {
    expect(isMainTabPathname(pathname)).toBe(false);
    expect(appBannerShowsBack(pathname)).toBe(true);
  });
});
