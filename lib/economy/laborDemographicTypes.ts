export type LaborDemographicTab =
  | "unemployment"
  | "participation"
  | "employment_population";

export const LABOR_DEMOGRAPHIC_TABS: {
  id: LaborDemographicTab;
  label: string;
}[] = [
  { id: "unemployment", label: "Unemployment" },
  { id: "participation", label: "Participation" },
  { id: "employment_population", label: "Employment-Population Ratio" },
];

export type LaborDemographicAgeBucket = {
  id: string;
  label: string;
  valueLabel: string;
  trendNorm: number[];
  barFill: number;
  trendStress?: boolean;
};

export type LaborDemographicAnalysisModel = {
  updateBadge: string;
  chartTitle: string;
  chartSubtitle: string;
  frequencyLabel: string;
  buckets: LaborDemographicAgeBucket[];
  varianceNorm: number[];
  insight: {
    kicker: string;
    title: string;
    body: string;
    resilienceLabel: string;
    resilienceLevel: string;
    resilienceFill: number;
  };
};
