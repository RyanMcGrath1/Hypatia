/**
 * News service (default port 5001): top headlines.
 */
import { Platform } from 'react-native';

import { WEB_NEWS_DEV_PROXY_PREFIX } from '@/constants/newsDevProxy';
import { fetchApiGet } from '@/hooks/api/httpGet';
import { getDevApiBaseUrlForPort } from '@/hooks/api/devServerBaseUrl';

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

export type TopHeadlineItem = {
  title: string;
  description: string | null;
  url: string | null;
  /** Hero/thumbnail URL when the API provides one */
  imageUrl: string | null;
  /** Single line for source / date when present */
  meta: string | null;
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}

function extractHeadlineArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>;
    const candidates = ['items', 'headlines', 'articles', 'data', 'results', 'news'];
    for (const key of candidates) {
      const v = o[key];
      if (Array.isArray(v)) {
        return v;
      }
    }
  }
  return [];
}

/** Normalize `/api/news/top-headlines` JSON into headline rows. */
export function parseTopHeadlinesResponse(payload: unknown): TopHeadlineItem[] {
  const rows = extractHeadlineArray(payload);
  const out: TopHeadlineItem[] = [];

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const obj = raw as Record<string, unknown>;
    const title =
      pickString(obj, ['title', 'headline', 'name', 'head_line']) ?? 'Untitled';
    const description = pickString(obj, ['description', 'summary', 'abstract', 'snippet', 'content']);
    const url = pickString(obj, ['url', 'link', 'href']);

    let source = pickString(obj, ['source', 'source_name', 'publisher']);
    if (!source && obj.source && typeof obj.source === 'object') {
      source = pickString(obj.source as Record<string, unknown>, ['name', 'title']);
    }
    const published =
      pickString(obj, ['published_at', 'publishedAt', 'published', 'date', 'time']);

    let imageUrl = pickString(obj, [
      'urlToImage',
      'image_url',
      'imageUrl',
      'thumbnail',
      'thumbnail_url',
      'hero_image',
      'og_image',
      'picture',
      'image',
    ]);
    if (!imageUrl && obj.image && typeof obj.image === 'object') {
      imageUrl = pickString(obj.image as Record<string, unknown>, ['url', 'src', 'href', 'uri']);
    }

    let meta: string | null = null;
    if (source && published) {
      meta = `${source} · ${published}`;
    } else if (source) {
      meta = source;
    } else if (published) {
      meta = published;
    }

    out.push({ title, description, url, imageUrl, meta });
  }

  return out;
}

export type FetchNewsTopHeadlinesOptions = {
  /** Skip caches (extra query param so CDNs/proxies treat each pull-to-refresh as a new URL). */
  bustCache?: boolean;
  /**
   * Optional category/topic for the backend (e.g. NewsAPI-style slugs).
   * Omit or use `"all"` on the client to fetch without a category filter.
   */
  category?: string;
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

/** `GET {newsBase}/api/news/top-headlines?lang=en&max=2[&category=...]` */
export async function fetchNewsTopHeadlines(
  signal?: AbortSignal,
  options?: FetchNewsTopHeadlinesOptions,
): Promise<TopHeadlineItem[]> {
  const params: Record<string, string> = { lang: 'en', max: '2' };
  if (options?.category) {
    params.category = options.category;
  }
  if (options?.bustCache) {
    params._ = String(Date.now());
  }
  const raw = await fetchApiGet(getNewsApiBaseUrl(), '/api/news/top-headlines', params, signal);
  return parseTopHeadlinesResponse(raw);
}
