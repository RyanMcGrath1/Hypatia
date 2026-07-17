import { describe, expect, it } from "vitest";

import type { InflationPceVsTargetResponse } from "@/hooks/api/economyInflationPceVsTargetApi";
import {
  computePceScaleMax,
  inflationPceVsTargetFromApi,
} from "@/lib/economy/inflationPceVsTargetViewModel";

describe("computePceScaleMax", () => {
  it("uses the minimum scale when no values are present", () => {
    expect(computePceScaleMax()).toBe(3.5);
    expect(computePceScaleMax(null, undefined)).toBe(3.5);
  });

  it("grows with the largest value so bars are not clipped", () => {
    expect(computePceScaleMax(4.07, 3.41, 2)).toBe(4.5);
  });
});

describe("inflationPceVsTargetFromApi", () => {
  it("maps headline, core, and target into bar percentages", () => {
    const api: InflationPceVsTargetResponse = {
      as_of: "2026-05-18T12:00:00+00:00",
      target: 2,
      headline: {
        series_id: "PCEPI",
        label: "PCE Headline",
        value: 2.4,
        observation_date: "2026-05-01",
      },
      core: {
        series_id: "PCEPILFE",
        label: "Core PCE",
        value: 2.8,
        observation_date: "2026-05-01",
      },
    };

    const vm = inflationPceVsTargetFromApi(api);
    expect(vm.headlineValueLabel).toBe("2.4%");
    expect(vm.coreValueLabel).toBe("2.8%");
    expect(vm.targetValueLabel).toBe("2.0%");
    expect(vm.scaleMax).toBe(3.5);
    expect(vm.headlinePct).toBeCloseTo((2.4 / 3.5) * 100, 5);
    expect(vm.corePct).toBeCloseTo((2.8 / 3.5) * 100, 5);
    expect(vm.targetPct).toBeCloseTo((2 / 3.5) * 100, 5);
  });

  it("uses live target from the API instead of a frontend placeholder", () => {
    const api: InflationPceVsTargetResponse = {
      target: 2.5,
      headline: {
        series_id: "PCEPI",
        label: "PCE Headline",
        value: 4.07,
        observation_date: "2026-05-01",
      },
      core: {
        series_id: "PCEPILFE",
        label: "Core PCE",
        value: 3.41,
        observation_date: "2026-05-01",
      },
    };

    const vm = inflationPceVsTargetFromApi(api);
    expect(vm.target).toBe(2.5);
    expect(vm.targetValueLabel).toBe("2.5%");
    expect(vm.scaleMax).toBe(4.5);
    expect(vm.headlinePct).toBeCloseTo((4.07 / 4.5) * 100, 5);
    expect(vm.corePct).toBeCloseTo((3.41 / 4.5) * 100, 5);
    expect(vm.targetPct).toBeCloseTo((2.5 / 4.5) * 100, 5);
  });

  it("returns placeholders when api is null", () => {
    const vm = inflationPceVsTargetFromApi(null);
    expect(vm.headlineValueLabel).toBe("—");
    expect(vm.coreValueLabel).toBe("—");
    expect(vm.target).toBeNull();
    expect(vm.targetValueLabel).toBe("—");
  });
});
