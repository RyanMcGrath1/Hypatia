import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";

import { AppRoutes } from "@/constants/app/routes";
import {
  FEC_CANDIDATES_MIN_QUERY_LENGTH,
  FecCandidatesApiError,
  fetchFecCandidates,
  getFecCandidatesNetworkErrorMessage,
} from "@/hooks/api/fecCandidatesApi";
import { findPoliticianProfile } from "@/lib/politician/mockProfileSearch";
import { mapFecCandidatesToSuggestions } from "@/lib/politician/fecSearchSuggestion";
import type { PoliticianSearchSuggestion } from "@/lib/politician/fecSearchSuggestion";
import type { PoliticianProfile } from "@/lib/politician/types";

const SEARCH_DELAY_MS = 420;
const SUGGEST_DEBOUNCE_MS = 320;

export function usePoliticianSearch() {
  const [input, setInput] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<PoliticianProfile | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<PoliticianSearchSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestAbortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) {
      return;
    }
    setSubmittedQuery(query);
    setHasSearched(true);
    setIsLoading(true);
    setRecentSearches((current) =>
      [query, ...current.filter((item) => item !== query)].slice(0, 5),
    );

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedProfile(findPoliticianProfile(query));
      setIsLoading(false);
    }, SEARCH_DELAY_MS);
  }, []);

  const submitSearch = useCallback(() => {
    Keyboard.dismiss();
    setIsInputFocused(false);
    runSearch(input);
  }, [input, runSearch]);

  useEffect(() => {
    const q = input.trim();
    if (!q) {
      setSuggestions([]);
      setSuggestionsError(null);
      setSuggestionsLoading(false);
      return;
    }

    if (q.length < FEC_CANDIDATES_MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSuggestionsError(null);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    setSuggestionsError(null);

    const debounceId = setTimeout(() => {
      const controller = new AbortController();
      suggestAbortRef.current = controller;

      void (async () => {
        try {
          const data = await fetchFecCandidates({ q }, controller.signal);
          setSuggestions(mapFecCandidatesToSuggestions(data.results));
          setSuggestionsError(null);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }
          setSuggestions([]);
          if (err instanceof FecCandidatesApiError) {
            setSuggestionsError(err.message);
          } else if (err instanceof Error && err.message.startsWith("Network error")) {
            setSuggestionsError(getFecCandidatesNetworkErrorMessage());
          } else {
            setSuggestionsError(
              err instanceof Error ? err.message : "Could not load candidates.",
            );
          }
        } finally {
          if (!controller.signal.aborted) {
            setSuggestionsLoading(false);
          }
        }
      })();
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceId);
      suggestAbortRef.current?.abort();
    };
  }, [input]);

  const handleSelectSuggestion = useCallback((name: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    const q = name.trim();
    if (!q) {
      return;
    }
    setRecentSearches((current) =>
      [q, ...current.filter((item) => item !== q)].slice(0, 5),
    );
    setInput("");
    Keyboard.dismiss();
    setIsInputFocused(false);
    router.push({
      pathname: AppRoutes.politicianDetail,
      params: { name: q },
    });
  }, []);

  const onBlurSearchField = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsInputFocused(false);
    }, 120);
  }, []);

  const statusCopy = useMemo(() => {
    if (!hasSearched) {
      return null;
    }
    if (isLoading) {
      return "Building profile...";
    }
    if (!selectedProfile) {
      return `No profile found for "${submittedQuery}".`;
    }
    return `Showing profile for ${selectedProfile.name}`;
  }, [hasSearched, isLoading, selectedProfile, submittedQuery]);

  return {
    input,
    setInput,
    isInputFocused,
    setIsInputFocused,
    onBlurSearchField,
    submittedQuery,
    hasSearched,
    isLoading,
    selectedProfile,
    recentSearches,
    runSearch,
    submitSearch,
    suggestions,
    suggestionsLoading,
    suggestionsError,
    handleSelectSuggestion,
    statusCopy,
  };
}
