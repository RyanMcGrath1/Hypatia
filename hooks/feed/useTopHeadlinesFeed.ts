import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  NEWS_FEED_PAGE_SIZE,
  fetchNewsTopHeadlines,
  getNewsApiNetworkErrorMessage,
  type NewsTopicId,
  type TopHeadlineItem,
} from "@/hooks/api/newsApi";

const DEFAULT_LANG = "en";

export function headlineKey(item: TopHeadlineItem, index: number): string {
  return item.url ?? `idx-${index}-${item.title}`;
}

function dedupeAppend(prev: TopHeadlineItem[], more: TopHeadlineItem[]): TopHeadlineItem[] {
  const seen = new Set<string>();
  for (const p of prev) {
    seen.add(headlineKey(p, 0));
  }
  const out = [...prev];
  let i = 0;
  for (const m of more) {
    const k = headlineKey(m, i);
    i += 1;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(m);
    }
  }
  return out;
}

export type UseTopHeadlinesFeedOptions = {
  /** BCP 47 language code for `lang=` (default `en`). */
  lang?: string;
};

/**
 * Paginated top-headlines feed: topic change resets to page 1; pull-to-refresh busts cache;
 * `onEndReached` debounced; load-more guarded and deduped by URL.
 */
export function useTopHeadlinesFeed(options?: UseTopHeadlinesFeedOptions) {
  const lang = options?.lang ?? DEFAULT_LANG;

  const [headlines, setHeadlines] = useState<TopHeadlineItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<NewsTopicId>("all");
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationError, setPaginationError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const feedGenerationRef = useRef(0);
  const loadingMoreInFlightRef = useRef(false);
  const lastEndReachedRef = useRef(0);

  const selectedTopicIdRef = useRef(selectedTopicId);
  selectedTopicIdRef.current = selectedTopicId;

  const categoryParam = useMemo(
    () => (selectedTopicId === "all" ? undefined : selectedTopicId),
    [selectedTopicId],
  );

  const fetchFeedOptions = useCallback(
    (page: number, bustCache: boolean) => ({
      lang,
      max: NEWS_FEED_PAGE_SIZE,
      page,
      category: categoryParam,
      bustCache,
    }),
    [categoryParam, lang],
  );

  const loadFirstPage = useCallback(
    async (opts: { bustCache: boolean; generation: number }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (!opts.bustCache) {
        setIsLoading(true);
      }
      setError(null);
      setPaginationError(null);

      try {
        const result = await fetchNewsTopHeadlines(controller.signal, fetchFeedOptions(1, opts.bustCache));
        if (opts.generation !== feedGenerationRef.current) {
          return;
        }
        setHeadlines(result.items);
        setHasMore(result.hasMore);
        setNextPage(result.nextPage);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (opts.generation !== feedGenerationRef.current) {
          return;
        }
        setHeadlines([]);
        setHasMore(false);
        setNextPage(null);
        const hint = getNewsApiNetworkErrorMessage();
        const detail = err instanceof Error && err.message ? err.message : null;
        setError(detail ? `${hint}\n\n${detail}` : hint);
      } finally {
        if (opts.generation !== feedGenerationRef.current) {
          return;
        }
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [fetchFeedOptions],
  );

  useEffect(() => {
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    loadingMoreInFlightRef.current = false;

    const generation = ++feedGenerationRef.current;
    setHeadlines([]);
    setHasMore(false);
    setNextPage(null);
    setError(null);
    setPaginationError(null);
    void loadFirstPage({ bustCache: false, generation });
    return () => {
      abortRef.current?.abort();
    };
  }, [selectedTopicId, loadFirstPage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMoreAbortRef.current?.abort();
    loadMoreAbortRef.current = null;
    loadingMoreInFlightRef.current = false;
    const generation = feedGenerationRef.current;
    void loadFirstPage({ bustCache: true, generation });
  }, [loadFirstPage]);

  const loadMoreHeadlines = useCallback(async () => {
    if (
      !hasMore ||
      nextPage === null ||
      loadingMoreInFlightRef.current ||
      isLoading ||
      refreshing
    ) {
      return;
    }

    const topicAtStart = selectedTopicIdRef.current;
    loadingMoreInFlightRef.current = true;
    setLoadingMore(true);
    setPaginationError(null);

    loadMoreAbortRef.current?.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    try {
      const result = await fetchNewsTopHeadlines(controller.signal, fetchFeedOptions(nextPage, false));
      if (selectedTopicIdRef.current !== topicAtStart) {
        return;
      }
      setHeadlines((prev) => dedupeAppend(prev, result.items));
      setHasMore(result.hasMore);
      setNextPage(result.nextPage);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (selectedTopicIdRef.current !== topicAtStart) {
        return;
      }
      setPaginationError("Could not load more stories.");
    } finally {
      loadingMoreInFlightRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchFeedOptions, hasMore, isLoading, nextPage, refreshing]);

  const onEndReached = useCallback(() => {
    const now = Date.now();
    if (now - lastEndReachedRef.current < 750) {
      return;
    }
    lastEndReachedRef.current = now;
    void loadMoreHeadlines();
  }, [loadMoreHeadlines]);

  const retryInitialLoad = useCallback(() => {
    void loadFirstPage({ bustCache: false, generation: feedGenerationRef.current });
  }, [loadFirstPage]);

  return {
    headlines,
    selectedTopicId,
    setSelectedTopicId,
    isLoading,
    loadingMore,
    refreshing,
    error,
    paginationError,
    onRefresh,
    onEndReached,
    loadMoreHeadlines,
    retryInitialLoad,
  };
}
