/**
 * Pure headline parsing for `/api/news/top-headlines` (no React Native / Expo).
 * Keeps Vitest and other Node tooling from loading the full Expo stack.
 */
import { topHeadlinesEnvelopeFieldsSchema } from '@/hooks/api/schemas/topHeadlinesEnvelope';

export type TopHeadlineItem = {
  title: string;
  description: string | null;
  url: string | null;
  /** Hero/thumbnail URL when the API provides one */
  imageUrl: string | null;
  /** Single line for source / date when present */
  meta: string | null;
};

export type TopHeadlinesPageResult = {
  items: TopHeadlineItem[];
  hasMore: boolean;
  /** Next 1-based page for `page=` query; null when no further pages. */
  nextPage: number | null;
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
    /** Prefer `items` then `articles` for paginated Flask responses. */
    const candidates = ['items', 'articles', 'headlines', 'data', 'results', 'news'];
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

/**
 * Parses paginated envelope + headline rows (`items` or `articles`).
 * Legacy array-only responses yield `hasMore: false`, `nextPage: null`.
 */
export function parseTopHeadlinesPage(payload: unknown): TopHeadlinesPageResult {
  const items = parseTopHeadlinesResponse(payload);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { items, hasMore: false, nextPage: null };
  }

  const envelope = topHeadlinesEnvelopeFieldsSchema.safeParse(payload);
  const o = payload as Record<string, unknown>;

  if (envelope.success) {
    const { hasMore: hm, nextPage: np } = envelope.data;
    const hasMore = typeof hm === 'boolean' ? hm : false;
    let nextPage: number | null = null;
    if (typeof np === 'number' && Number.isFinite(np)) {
      nextPage = np;
    } else if (np === null) {
      nextPage = null;
    }
    return { items, hasMore, nextPage };
  }

  const hasMore = typeof o.hasMore === 'boolean' ? o.hasMore : false;
  let nextPage: number | null = null;
  if (typeof o.nextPage === 'number' && Number.isFinite(o.nextPage)) {
    nextPage = o.nextPage;
  } else if (o.nextPage === null) {
    nextPage = null;
  }
  return { items, hasMore, nextPage };
}
