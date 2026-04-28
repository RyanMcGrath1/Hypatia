/**
 * News service (default port 5001): top headlines.
 */
import { Platform } from 'react-native';

import { fetchApiGet } from '@/hooks/api/httpGet';
import { getDevApiBaseUrlForPort } from '@/hooks/api/devServerBaseUrl';

export function getNewsApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_NEWS_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  return getDevApiBaseUrlForPort(5001);
}

export function getNewsApiNetworkErrorMessage(): string {
  if (Platform.OS === 'web') {
    return 'Unable to reach the news API (enable CORS on the server for Expo web — see scripts/flask_cors_local.py)';
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
};

/** `GET {newsBase}/api/news/top-headlines?lang=en&max=5` */
export async function fetchNewsTopHeadlines(
  signal?: AbortSignal,
  options?: FetchNewsTopHeadlinesOptions,
): Promise<TopHeadlineItem[]> {
  const params: Record<string, string> = { lang: 'en', max: '5' };
  if (options?.bustCache) {
    params._ = String(Date.now());
  }
  const raw = await fetchApiGet(getNewsApiBaseUrl(), '/api/news/top-headlines', params, signal);
  return parseTopHeadlinesResponse(raw);
}
