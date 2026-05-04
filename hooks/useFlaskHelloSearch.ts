import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

type UseFlaskHelloSearchResult = {
  isLoading: boolean;
  error: string | null;
  /** Parsed JSON object/array, or raw string if response is not JSON */
  apiData: unknown | null;
};

function parseResponseBody(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return text;
  }
}

/**
 * LAN IP of the machine running Metro (e.g. 192.168.1.71), when using Expo Go / dev.
 * Physical devices must call this host — 127.0.0.1 on the phone is the phone itself.
 */
function getExpoDevHostIp(): string | null {
  if (!__DEV__) {
    return null;
  }

  const manifest = Constants.manifest;
  if (manifest && typeof manifest === "object" && "debuggerHost" in manifest) {
    const dh = (manifest as { debuggerHost?: string }).debuggerHost;
    if (typeof dh === "string" && dh.length > 0) {
      const host = dh.split(":")[0];
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return host;
      }
    }
  }

  const m2 = Constants.manifest2 as
    | {
        extra?: {
          expoGo?: { debuggerHost?: string };
          expoClient?: { hostUri?: string };
        };
      }
    | null
    | undefined;

  const goDh = m2?.extra?.expoGo?.debuggerHost;
  if (typeof goDh === "string" && goDh.length > 0) {
    const host = goDh.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  const hostUri = m2?.extra?.expoClient?.hostUri;
  if (typeof hostUri === "string" && hostUri.length > 0) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return host;
    }
  }

  return null;
}

function isProbablyAndroidEmulator(): boolean {
  if (Platform.OS !== "android") {
    return false;
  }
  const c = Platform.constants as {
    Brand?: string;
    Model?: string;
    Manufacturer?: string;
  };
  const model = (c.Model ?? "").toLowerCase();
  const brand = (c.Brand ?? "").toLowerCase();
  return (
    model.includes("google_sdk") ||
    model.includes("emulator") ||
    model.includes("sdk_gphone") ||
    model.includes("sdk") ||
    brand === "generic"
  );
}

/** Dev/simulator/real-device URL for a local HTTP API on `port`, mirroring Metro LAN discovery. */
function getDevApiBaseUrlForPort(port: number): string {
  if (Platform.OS === "web") {
    return `http://127.0.0.1:${port}`;
  }

  if (Platform.OS === "android" && isProbablyAndroidEmulator()) {
    return `http://10.0.2.2:${port}`;
  }

  const devHost = getExpoDevHostIp();
  if (devHost) {
    return `http://${devHost}:${port}`;
  }

  return Platform.OS === "android"
    ? `http://10.0.2.2:${port}`
    : `http://127.0.0.1:${port}`;
}

export function getFlaskApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return getDevApiBaseUrlForPort(5001);
}

export function getNewsApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_NEWS_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return getDevApiBaseUrlForPort(5001);
}

export function getFlaskHelloNetworkErrorMessage(): string {
  if (Platform.OS === "web") {
    return "Unable to reach Flask (enable CORS on the server for Expo web — see scripts/flask_cors_local.py)";
  }
  return `Unable to reach Flask at ${getFlaskApiBaseUrl()}. On a real device, the app uses your dev machine's LAN IP (same as Metro). Run Flask bound to all interfaces, e.g. flask run --host=0.0.0.0 --port=5001, or set EXPO_PUBLIC_API_BASE_URL.`;
}

export function getNewsApiNetworkErrorMessage(): string {
  if (Platform.OS === "web") {
    return "Unable to reach the news API (enable CORS on the server for Expo web — see scripts/flask_cors_local.py)";
  }
  return `Unable to reach the news API at ${getNewsApiBaseUrl()}. On a real device, the app uses your dev machine's LAN IP (same as Metro). Run the server bound to all interfaces, or set EXPO_PUBLIC_NEWS_API_BASE_URL.`;
}

async function fetchApiGet(
  apiBaseUrl: string,
  path: string,
  searchParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const qs =
    searchParams && Object.keys(searchParams).length > 0
      ? `?${new URLSearchParams(searchParams).toString()}`
      : "";
  const url = `${apiBaseUrl}${normalizedPath}${qs}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
      signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Network error for ${url}: ${msg}`);
  }

  const text = await response.text();
  if (!response.ok) {
    const snippet = text.trim().slice(0, 400);
    throw new Error(
      `HTTP ${response.status} ${response.statusText} for ${url}${snippet ? ` — ${snippet}` : ""}`,
    );
  }
  return parseResponseBody(text);
}

async function fetchFlaskGet(
  path: string,
  searchParams: Record<string, string> | undefined,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  return fetchApiGet(getFlaskApiBaseUrl(), path, searchParams, signal);
}

/** `GET {base}/hello` — same contract as `curl http://127.0.0.1:5001/hello` when using default base on web/simulator. */
export async function fetchFlaskHello(signal?: AbortSignal): Promise<unknown> {
  return fetchFlaskGet("/hello", undefined, signal);
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

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim();
    }
  }
  return null;
}

function extractHeadlineArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    const candidates = [
      "items",
      "headlines",
      "articles",
      "data",
      "results",
      "news",
    ];
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
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const obj = raw as Record<string, unknown>;
    const title =
      pickString(obj, ["title", "headline", "name", "head_line"]) ?? "Untitled";
    const description = pickString(obj, [
      "description",
      "summary",
      "abstract",
      "snippet",
      "content",
    ]);
    const url = pickString(obj, ["url", "link", "href"]);

    let source = pickString(obj, ["source", "source_name", "publisher"]);
    if (!source && obj.source && typeof obj.source === "object") {
      source = pickString(obj.source as Record<string, unknown>, [
        "name",
        "title",
      ]);
    }
    const published = pickString(obj, [
      "published_at",
      "publishedAt",
      "published",
      "date",
      "time",
    ]);

    let imageUrl = pickString(obj, [
      "urlToImage",
      "image_url",
      "imageUrl",
      "thumbnail",
      "thumbnail_url",
      "hero_image",
      "og_image",
      "picture",
      "image",
    ]);
    if (!imageUrl && obj.image && typeof obj.image === "object") {
      imageUrl = pickString(obj.image as Record<string, unknown>, [
        "url",
        "src",
        "href",
        "uri",
      ]);
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

/** `GET {newsBase}/api/news/top-headlines?lang=en&max=5` */
export async function fetchNewsTopHeadlines(
  signal?: AbortSignal,
): Promise<TopHeadlineItem[]> {
  const raw = await fetchApiGet(
    getNewsApiBaseUrl(),
    "/api/news/top-headlines",
    { lang: "en", max: "1" },
    signal,
  );
  return parseTopHeadlinesResponse(raw);
}

/** Sample address matching `curl "http://127.0.0.1:5001/api/civic/representatives?address=1600%20Pennsylvania%20..."`. */
export const DEFAULT_CIVIC_SAMPLE_ADDRESS =
  "1600 Pennsylvania Avenue NW Washington DC";

/** `GET {base}/api/civic/representatives?address=...` — base URL follows the same rules as `/hello`. */
export async function fetchCivicRepresentatives(
  address: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return fetchFlaskGet(
    "/api/civic/representatives",
    { address: address.trim() },
    signal,
  );
}

/** Sample address for divisions-by-address (e.g. ZIP `07834`), matching Postman `?address=07834`. */
export const DEFAULT_CIVIC_DIVISIONS_SAMPLE_ADDRESS = "07834";

/** `GET {base}/api/civic/divisions-by-address?address=...` — base URL follows the same rules as `/hello`. */
export async function fetchCivicDivisionsByAddress(
  address: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return fetchFlaskGet(
    "/api/civic/divisions-by-address",
    { address: address.trim() },
    signal,
  );
}

export function useFlaskHelloSearch(query: string): UseFlaskHelloSearchResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiData, setApiData] = useState<unknown | null>(null);
  const apiBaseUrl = getFlaskApiBaseUrl();

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setIsLoading(false);
      setError(null);
      setApiData(null);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchFlaskHello(controller.signal);
        if (!cancelled) {
          setApiData(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setError(getFlaskHelloNetworkErrorMessage());
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [apiBaseUrl, query]);

  return { isLoading, error, apiData };
}
