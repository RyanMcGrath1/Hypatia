import { fetchApiGet, HttpApiError } from "@/hooks/api/httpGet";
import { getHypatiaBackendBaseUrl } from "@/hooks/api/hypatiaBaseUrl";
import { HYPATIA_API_PATHS } from "@/hooks/api/hypatiaPaths";
import {
  parseEconomyDetailResponse,
  type EconomyDetailChart,
  type EconomyDetailHeadline,
  type EconomyDetailObservation,
  type EconomyDetailResponse,
  type EconomyDetailTopic,
} from "@/lib/economy/economyDetailTypes";

export type {
  EconomyDetailChart,
  EconomyDetailHeadline,
  EconomyDetailObservation,
  EconomyDetailResponse,
  EconomyDetailTopic,
};
export { parseEconomyDetailResponse };

export class EconomyDetailApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "EconomyDetailApiError";
  }
}

export type FetchEconomyDetailParams = {
  topic: EconomyDetailTopic;
  observation_end?: string;
};

export async function fetchEconomyDetail(
  params: FetchEconomyDetailParams,
  signal?: AbortSignal,
): Promise<EconomyDetailResponse> {
  const searchParams: Record<string, string> = { topic: params.topic };
  if (params.observation_end?.trim()) {
    searchParams.observation_end = params.observation_end.trim();
  }

  let body: unknown;
  try {
    body = await fetchApiGet(
      getHypatiaBackendBaseUrl(),
      HYPATIA_API_PATHS.economyDetail,
      searchParams,
      signal,
    );
  } catch (e) {
    if (e instanceof HttpApiError) {
      throw new EconomyDetailApiError(e.message, e.status, e.body);
    }
    throw e;
  }

  const parsed = parseEconomyDetailResponse(body);
  if (!parsed) {
    throw new EconomyDetailApiError("Invalid economy detail payload", 500, body);
  }
  return parsed;
}
