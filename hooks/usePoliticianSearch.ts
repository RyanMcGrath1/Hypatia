import { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";

import {
  findPoliticianProfile,
  MOCK_POLITICIANS,
} from "@/lib/politician/mockProfileSearch";
import type { PoliticianProfile } from "@/lib/politician/types";

const SEARCH_DELAY_MS = 420;

export function usePoliticianSearch() {
  const [input, setInput] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<PoliticianProfile | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const suggestions = useMemo(() => {
    const query = input.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return MOCK_POLITICIANS.filter((profile) =>
      `${profile.name} ${profile.role} ${profile.location}`
        .toLowerCase()
        .includes(query),
    ).slice(0, 5);
  }, [input]);

  const handleSelectSuggestion = useCallback(
    (name: string) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }

      setInput(name);
      Keyboard.dismiss();
      setIsInputFocused(false);
      runSearch(name);
    },
    [runSearch],
  );

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
    handleSelectSuggestion,
    statusCopy,
  };
}
