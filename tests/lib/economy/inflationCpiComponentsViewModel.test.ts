import { describe, expect, it } from "vitest";

import type { InflationCpiComponentsResponse } from "@/hooks/api/economyInflationCpiComponentsApi";
import { inflationCpiComponentsFromApi } from "@/lib/economy/inflationCpiComponentsViewModel";

describe("inflationCpiComponentsFromApi", () => {
  it("maps components with YoY labels and headline comparison", () => {
    const api: InflationCpiComponentsResponse = {
      observation_date: "2026-06-01",
      headline: {
        series_id: "CPIAUCSL",
        label: "Headline CPI",
        value: 3.5,
        observation_date: "2026-06-01",
        previous_value: 3.2,
        previous_observation_date: "2026-05-01",
        delta: 0.3,
      },
      components: [
        {
          key: "shelter",
          series_id: "CUSR0000SAH1",
          label: "Shelter",
          value: 3.3,
          observation_date: "2026-06-01",
          previous_value: 3.1,
          previous_observation_date: "2026-05-01",
          delta: 0.2,
          includes_in: ["core_services"],
        },
        {
          key: "energy",
          series_id: "CPIENGSL",
          label: "Energy",
          value: 15.7,
          observation_date: "2026-06-01",
        },
        {
          key: "core_goods",
          series_id: "CUSR0000SACL1E",
          label: "Core Goods",
          value: 0.8,
          observation_date: "2026-06-01",
        },
      ],
    };

    const vm = inflationCpiComponentsFromApi(api);
    expect(vm.observationDateLabel).toBe("Jun 2026");
    expect(vm.headlineYoyLabel).toBe("3.5%");
    expect(vm.components).toHaveLength(3);

    const shelter = vm.components[0];
    expect(shelter.key).toBe("shelter");
    expect(shelter.yoyLabel).toBe("3.3%");
    expect(shelter.yoyPositive).toBe(true);
    expect(shelter.vsHeadlineLabel).toBe("-0.2pp vs headline");
    expect(shelter.nestedNote).toBe("Part of core services");

    const energy = vm.components[1];
    expect(energy.yoyPositive).toBe(false);
    expect(energy.vsHeadlineLabel).toBe("+12.2pp vs headline");

    const coreGoods = vm.components[2];
    expect(coreGoods.icon).toBe("cube");
    expect(coreGoods.yoyPositive).toBe(true);

    expect(vm.metricTable).toHaveLength(4);
    expect(vm.metricTable[0]).toMatchObject({
      key: "headline",
      metric: "Headline CPI",
      latest: "3.5%",
      previous: "3.2%",
      delta: "+0.3pp",
      deltaPositive: false,
    });
    expect(vm.metricTable[1]).toMatchObject({
      key: "shelter",
      metric: "Shelter",
      latest: "3.3%",
      previous: "3.1%",
      delta: "+0.2pp",
    });
  });

  it("returns placeholders when api is null", () => {
    const vm = inflationCpiComponentsFromApi(null);
    expect(vm.observationDateLabel).toBe("");
    expect(vm.headlineYoyLabel).toBe("—");
    expect(vm.components).toEqual([]);
    expect(vm.metricTable).toEqual([]);
  });
});
