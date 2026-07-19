import type {
  InflationCpiComponentMetric,
  InflationCpiComponentsResponse,
  InflationCpiMetric,
} from "@/hooks/api/economyInflationCpiComponentsApi";
import type { InflationComponentIcon } from "@/components/economy/detail/inflation/inflationDetailData";
import { CPI_COMPONENT_ICONS } from "@/components/economy/detail/inflation/inflationDetailData";

export type InflationCpiComponentViewModel = {
  key: string;
  icon: InflationComponentIcon;
  title: string;
  yoyLabel: string;
  yoyPositive: boolean | null;
  vsHeadlineLabel: string;
  nestedNote: string | null;
  hasError: boolean;
};

export type InflationCpiMetricTableRow = {
  key: string;
  metric: string;
  latest: string;
  previous: string;
  delta: string;
  deltaPositive: boolean | null;
};

export type InflationCpiComponentsViewModel = {
  observationDateLabel: string;
  headlineYoyLabel: string;
  components: InflationCpiComponentViewModel[];
  metricTable: InflationCpiMetricTableRow[];
};

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(1)}%`;
}

function formatDelta(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}pp`;
}

function deltaTrend(value: number | null | undefined): boolean | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  if (Math.abs(value) < 0.05) {
    return null;
  }
  return value < 0;
}

function formatObservationDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(isoDate);
  if (!match) {
    return isoDate;
  }
  const monthIndex = Number(match[2]) - 1;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[monthIndex];
  if (!month) {
    return isoDate;
  }
  return `${month} ${match[1]}`;
}

function yoyTrend(value: number | null, headline: number | null): boolean | null {
  if (value == null || headline == null || !Number.isFinite(value) || !Number.isFinite(headline)) {
    return null;
  }
  const delta = value - headline;
  if (Math.abs(delta) < 0.05) {
    return null;
  }
  return value < headline;
}

function vsHeadlineLabel(value: number | null, headline: number | null): string {
  if (value == null || headline == null || !Number.isFinite(value) || !Number.isFinite(headline)) {
    return "";
  }
  const delta = value - headline;
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}pp vs headline`;
}

function nestedNoteFor(component: InflationCpiComponentMetric): string | null {
  if (!component.includes_in?.includes("core_services")) {
    return null;
  }
  return "Part of core services";
}

function componentFromApi(
  component: InflationCpiComponentMetric,
  headlineValue: number | null,
): InflationCpiComponentViewModel {
  const icon = CPI_COMPONENT_ICONS[component.key] ?? "briefcase";
  return {
    key: component.key,
    icon,
    title: component.label,
    yoyLabel: formatPct(component.value),
    yoyPositive: yoyTrend(component.value, headlineValue),
    vsHeadlineLabel: vsHeadlineLabel(component.value, headlineValue),
    nestedNote: nestedNoteFor(component),
    hasError: Boolean(component.error),
  };
}

function metricTableRowFromApi(metric: InflationCpiMetric, key: string): InflationCpiMetricTableRow {
  return {
    key,
    metric: metric.label,
    latest: formatPct(metric.value),
    previous: formatPct(metric.previous_value),
    delta: formatDelta(metric.delta),
    deltaPositive: deltaTrend(metric.delta),
  };
}

/** Map CPI components API payload into breakdown cards. */
export function inflationCpiComponentsFromApi(
  api: InflationCpiComponentsResponse | null,
): InflationCpiComponentsViewModel {
  const headlineValue = api?.headline.value ?? null;
  const components = (api?.components ?? []).map((component) =>
    componentFromApi(component, headlineValue),
  );
  const metricTable: InflationCpiMetricTableRow[] = [];
  if (api?.headline) {
    metricTable.push(metricTableRowFromApi(api.headline, "headline"));
  }
  for (const component of api?.components ?? []) {
    metricTable.push(metricTableRowFromApi(component, component.key));
  }

  return {
    observationDateLabel: formatObservationDate(api?.observation_date),
    headlineYoyLabel: formatPct(headlineValue),
    components,
    metricTable,
  };
}
