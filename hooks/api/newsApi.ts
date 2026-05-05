/**
 * News service (default port 5001): top headlines.
 */
import { Platform } from 'react-native';

import { WEB_NEWS_DEV_PROXY_PREFIX } from '@/constants/app/newsDevProxy';
import { fetchApiGet } from '@/hooks/api/httpGet';
import { getDevApiBaseUrlForPort } from '@/hooks/api/devServerBaseUrl';
import { parseTopHeadlinesPage } from '@/hooks/api/newsParse';
import type { TopHeadlinesPageResult } from '@/hooks/api/newsParse';

export type { TopHeadlineItem, TopHeadlinesPageResult } from '@/hooks/api/newsParse';
export { parseTopHeadlinesPage, parseTopHeadlinesResponse } from '@/hooks/api/newsParse';

/** True when env points at this machine’s loopback — browser CORS blocks cross-port unless we use the Metro proxy. */
function isLoopbackOrLocalhostNewsUrl(url: string): boolean {
  try {
    const normalized = url.includes('://') ? url : `http://${url}`;
    const u = new URL(normalized);
    const h = u.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  } catch {
    return false;
  }
}

export function getNewsApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_NEWS_API_BASE_URL?.trim();

  /**
   * Web **dev**: prefer same-origin Metro proxy (`metro.config.js`) so fetches are not cross-origin to :5001.
   * If `.env` sets `EXPO_PUBLIC_NEWS_API_BASE_URL` to `http://127.0.0.1:5001`, using it directly causes **CORS**
   * from the Expo tab — so we still use the proxy for loopback URLs unless you point at a remote API (LAN/public).
   */
  const useWebDevProxy =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    __DEV__ &&
    (!fromEnv || isLoopbackOrLocalhostNewsUrl(fromEnv));

  if (useWebDevProxy) {
    return `${window.location.origin}${WEB_NEWS_DEV_PROXY_PREFIX}`.replace(/\/$/, '');
  }

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  return getDevApiBaseUrlForPort(5001);
}

export function getNewsApiNetworkErrorMessage(): string {
  if (Platform.OS === 'web') {
    return __DEV__
      ? `Unable to reach the news API at ${getNewsApiBaseUrl()}.\n\nDev Web uses a Metro proxy (see metro.config.js) so localhost APIs avoid CORS — restart Expo after adding it, and ensure the service listens on 127.0.0.1:5001.\n\nIf you call the API URL directly instead, enable CORS on the server (scripts/flask_cors_local.py).`
      : 'Unable to reach the news API (enable CORS on the server for Expo web — see scripts/flask_cors_local.py)';
  }
  return `Unable to reach the news API at ${getNewsApiBaseUrl()}. On a real device, the app uses your dev machine's LAN IP (same as Metro). Run the server bound to all interfaces, or set EXPO_PUBLIC_NEWS_API_BASE_URL.`;
}

/** Default page size for `/api/news/top-headlines` (server clamps 1–50). */
export const NEWS_FEED_PAGE_SIZE = 10;

export type FetchNewsTopHeadlinesOptions = {
  /** Skip caches (extra query param so CDNs/proxies treat each pull-to-refresh as a new URL). */
  bustCache?: boolean;
  /**
   * Optional category/topic for the backend (e.g. NewsAPI-style slugs).
   * Omit or use `"all"` on the client to fetch without a category filter.
   */
  category?: string;
  /** 1-based page index (default 1). */
  page?: number;
  /** Page size; server default 20, clamped 1–50. */
  max?: number;
  /** e.g. `en` */
  lang?: string;
};

/** UI labels + query slug sent as `category` when not `"all"`. */
export const NEWS_TOPIC_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'business', label: 'Business' },
  { id: 'technology', label: 'Technology' },
  { id: 'science', label: 'Science' },
  { id: 'health', label: 'Health' },
  { id: 'sports', label: 'Sports' },
  { id: 'entertainment', label: 'Entertainment' },
] as const;

export type NewsTopicId = (typeof NEWS_TOPIC_OPTIONS)[number]['id'];

/**
 * `GET {newsBase}/api/news/top-headlines?lang=en&max=&page=&category=...`
 * Returns parsed rows + `hasMore` / `nextPage` for infinite scroll.
 */
export async function fetchNewsTopHeadlines(
  signal?: AbortSignal,
  options?: FetchNewsTopHeadlinesOptions,
): Promise<TopHeadlinesPageResult> {
  const maxRequested = options?.max ?? NEWS_FEED_PAGE_SIZE;
  const clampedMax = Math.min(50, Math.max(1, maxRequested));
  const params: Record<string, string> = {
    lang: options?.lang ?? 'en',
    max: String(clampedMax),
    page: String(options?.page ?? 1),
  };
  if (options?.category) {
    params.category = options.category;
  }
  if (options?.bustCache) {
    params._ = String(Date.now());
  }
  const raw = await fetchApiGet(getNewsApiBaseUrl(), '/api/news/top-headlines', params, signal);
  return parseTopHeadlinesPage(raw);
}
