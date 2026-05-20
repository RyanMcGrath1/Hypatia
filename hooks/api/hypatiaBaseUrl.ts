import { Platform } from "react-native";

import { getNewsApiBaseUrl, getNewsApiNetworkErrorMessage } from "@/hooks/api/newsApi";

/**
 * Canonical hypatia-backend base URL (port 5001 by default).
 * Honors `EXPO_PUBLIC_HYPATIA_BASE_URL`, then news/env/proxy rules in {@link getNewsApiBaseUrl}.
 */
export function getHypatiaBackendBaseUrl(): string {
  const h = process.env.EXPO_PUBLIC_HYPATIA_BASE_URL?.trim();
  if (h) {
    return h.replace(/\/$/, "");
  }
  const legacy = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (legacy) {
    return legacy.replace(/\/$/, "");
  }
  return getNewsApiBaseUrl();
}

/** Shared network error copy for any hypatia-backend route. */
export function getHypatiaBackendNetworkErrorMessage(): string {
  if (Platform.OS === "web") {
    return getNewsApiNetworkErrorMessage();
  }
  return `Unable to reach Hypatia API at ${getHypatiaBackendBaseUrl()}. On a real device, use your dev machine's LAN IP (same as Metro), run the server on 0.0.0.0:5001, or set EXPO_PUBLIC_HYPATIA_BASE_URL.`;
}
