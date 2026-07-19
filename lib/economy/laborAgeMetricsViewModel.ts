import type {
  LaborDemographicAgeBucket,
  LaborDemographicAnalysisModel,
  LaborDemographicTab,
} from "@/lib/economy/laborDemographicTypes";
import { buildLaborDemographicComparisonChartModel } from "@/lib/economy/laborDemographicComparisonChartModel";
import type {
  LaborAgeMetricsMetric,
  LaborAgeMetricsResponse,
  LaborAgeMetricsSeries,
} from "@/lib/economy/laborAgeMetricsParse";

export const LABOR_AGE_METRIC_ID_BY_TAB: Record<LaborDemographicTab, string> = {
  unemployment: "unemployment_rate",
  participation: "labor_force_participation",
  employment_population: "employment_population_ratio",
};

const AGE_GROUP_ORDER = ["16-19", "20-24", "25-54", "55+"] as const;

function formatPct(value: number): string {
  const rounded =
    Math.abs(value - Math.round(value)) < 0.05
      ? value.toFixed(0)
      : value.toFixed(1);
  return `${rounded}%`;
}

function formatUpdateBadge(endDate: string): string {
  const d = new Date(`${endDate.trim().slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return "Latest Update";
  }
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${month} ${d.getFullYear()} Update`;
}

function ageGroupLabel(ageGroup: string): string {
  return `${ageGroup} Years`;
}

function numericValues(series: LaborAgeMetricsSeries): number[] {
  return series.observations
    .map((o) => o.value)
    .filter((v): v is number => v != null);
}

function latestValue(series: LaborAgeMetricsSeries): number | null {
  for (let i = series.observations.length - 1; i >= 0; i -= 1) {
    const v = series.observations[i]!.value;
    if (v != null) {
      return v;
    }
  }
  return null;
}

function normalizeMinMax(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  if (values.length === 1) {
    return [0.5];
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span <= 0) {
    return values.map(() => 0.5);
  }
  return values.map((v) => (v - min) / span);
}

function periodDelta(series: LaborAgeMetricsSeries): number | null {
  const vals = numericValues(series);
  if (vals.length < 2) {
    return null;
  }
  return vals[vals.length - 1]! - vals[0]!;
}

function buildInsight(
  metricId: string,
  metricName: string,
  buckets: LaborDemographicAgeBucket[],
  seriesByAge: Map<string, LaborAgeMetricsSeries>,
): LaborDemographicAnalysisModel["insight"] {
  const youth = buckets.find((b) => b.id === "16-19");
  const prime = buckets.find((b) => b.id === "25-54");
  const youthSeries = seriesByAge.get("16-19");
  const primeSeries = seriesByAge.get("25-54");
  const youthDelta = youthSeries ? periodDelta(youthSeries) : null;
  const primeDelta = primeSeries ? periodDelta(primeSeries) : null;

  let title = "Age Cohort Spread";
  let body = `Latest ${metricName.toLowerCase()} readings vary across age groups in the selected window.`;
  let resilienceLevel = "Moderate";
  let resilienceFill = 0.65;

  if (youth && prime) {
    if (metricId === "unemployment_rate") {
      title = "Youth Unemployment Elevated";
      body = `Youth (16–19) unemployment stands at ${youth.valueLabel} versus ${prime.valueLabel} for prime-age workers (25–54), highlighting persistent entry-level labor market friction in this window.`;
      if (primeDelta != null && primeDelta <= 0) {
        resilienceLevel = "High";
        resilienceFill = 0.82;
      }
    } else if (metricId === "labor_force_participation") {
      title = "Prime-Age Anchor";
      body = `Prime-age participation (${prime.valueLabel}) continues to lead the aggregate, while youth participation (${youth.valueLabel}) remains the main drag versus older cohorts in this period.`;
      if (primeDelta != null && primeDelta >= 0) {
        resilienceLevel = "High";
        resilienceFill = 0.8;
      }
    } else {
      title = "Employment Gap";
      body = `The employment-population ratio for youth (${youth.valueLabel}) trails prime-age workers (${prime.valueLabel}), suggesting job-finding—not attachment alone—remains the binding constraint for younger cohorts.`;
      if (youthDelta != null && youthDelta >= 0) {
        resilienceLevel = "High";
        resilienceFill = 0.78;
      }
    }
  }

  return {
    kicker: "Hypatia Insight",
    title,
    body,
    resilienceLabel: "Market Resilience",
    resilienceLevel,
    resilienceFill,
  };
}

function buildBuckets(metric: LaborAgeMetricsMetric): {
  buckets: LaborDemographicAgeBucket[];
  seriesByAge: Map<string, LaborAgeMetricsSeries>;
} {
  const seriesByAge = new Map<string, LaborAgeMetricsSeries>();
  for (const s of metric.series) {
    seriesByAge.set(s.ageGroup, s);
  }

  const latestValues = AGE_GROUP_ORDER.flatMap((age) => {
    const series = seriesByAge.get(age);
    if (!series) {
      return [];
    }
    const v = latestValue(series);
    return v != null ? [v] : [];
  });
  const maxLatest = latestValues.length > 0 ? Math.max(...latestValues) : 1;

  const buckets: LaborDemographicAgeBucket[] = [];
  for (const ageGroup of AGE_GROUP_ORDER) {
    const series = seriesByAge.get(ageGroup);
    if (!series) {
      continue;
    }
    const vals = numericValues(series);
    const latest = latestValue(series);
    const trendNorm = normalizeMinMax(vals);
    const delta = periodDelta(series);
    buckets.push({
      id: ageGroup,
      label: ageGroupLabel(ageGroup),
      valueLabel: latest != null ? formatPct(latest) : "—",
      trendNorm,
      barFill: latest != null && maxLatest > 0 ? latest / maxLatest : 0,
      trendStress:
        metric.id === "unemployment_rate" &&
        (ageGroup === "16-19" || (delta != null && delta > 0)),
    });
  }

  return { buckets, seriesByAge };
}

export function laborDemographicModelFromAgeMetrics(
  api: LaborAgeMetricsResponse,
  tab: LaborDemographicTab,
  chartWidth?: number,
): LaborDemographicAnalysisModel | null {
  const metricId = LABOR_AGE_METRIC_ID_BY_TAB[tab];
  const metric = api.metrics.find((m) => m.id === metricId);
  if (!metric) {
    return null;
  }

  const { buckets, seriesByAge } = buildBuckets(metric);
  if (buckets.length === 0) {
    return null;
  }

  return {
    updateBadge: formatUpdateBadge(api.endDate),
    chartTitle: `${metric.name} (%)`,
    chartSubtitle: "Comparative breakdown by age demographic",
    frequencyLabel: "Monthly",
    buckets,
    comparisonChart:
      chartWidth != null && chartWidth > 0
        ? buildLaborDemographicComparisonChartModel(metric, chartWidth)
        : null,
    insight: buildInsight(metric.id, metric.name, buckets, seriesByAge),
  };
}

export function laborDemographicModelsFromAgeMetrics(
  api: LaborAgeMetricsResponse,
): Partial<Record<LaborDemographicTab, LaborDemographicAnalysisModel>> {
  const out: Partial<Record<LaborDemographicTab, LaborDemographicAnalysisModel>> =
    {};
  for (const tab of Object.keys(LABOR_AGE_METRIC_ID_BY_TAB) as LaborDemographicTab[]) {
    const model = laborDemographicModelFromAgeMetrics(api, tab);
    if (model) {
      out[tab] = model;
    }
  }
  return out;
}
