import { getNewsApiBaseUrl } from "@/hooks/api/newsApi";

/** Same host as news/economy; optional single override for all Hypatia HTTP APIs. */
export function getHypatiaBackendBaseUrl(): string {
  const h = process.env.EXPO_PUBLIC_HYPATIA_BASE_URL?.trim();
  if (h) {
    return h.replace(/\/$/, "");
  }
  return getNewsApiBaseUrl();
}
