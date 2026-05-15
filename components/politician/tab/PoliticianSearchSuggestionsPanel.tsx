import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  View,
} from "react-native";

import { politicianTabScreenStyles as styles } from "@/components/politician/tab/politicianTabScreenStyles";
import { ThemedText } from "@/components/theme/ThemedText";
import { FEC_CANDIDATES_MIN_QUERY_LENGTH } from "@/hooks/api/fecCandidatesApi";
import type { PoliticianSearchSuggestion } from "@/lib/politician/fecSearchSuggestion";

import type { ThemeInteractive } from "@/constants/theme/Colors";

type Palette = {
  cardBorder: string;
  sectionBackground: string;
  badgeBackground: string;
};

type Semantic = {
  mutedText: string;
  hairline: string;
  danger: string;
};

type ThemeTint = {
  tint: string;
  icon: string;
};

export type PoliticianSearchSuggestionsPanelProps = {
  visible: boolean;
  inputTrimmedLength: number;
  palette: Palette;
  semantic: Semantic;
  interactive: ThemeInteractive;
  theme: ThemeTint;
  suggestionsLoading: boolean;
  suggestionsError: string | null;
  suggestions: PoliticianSearchSuggestion[];
  onSelectSuggestion: (name: string) => void;
};

export function PoliticianSearchSuggestionsPanel({
  visible,
  inputTrimmedLength,
  palette,
  semantic,
  interactive,
  theme,
  suggestionsLoading,
  suggestionsError,
  suggestions,
  onSelectSuggestion,
}: PoliticianSearchSuggestionsPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.suggestionsList,
        {
          borderColor: palette.cardBorder,
          backgroundColor: palette.sectionBackground,
        },
      ]}
    >
      {inputTrimmedLength < FEC_CANDIDATES_MIN_QUERY_LENGTH ? (
        <View style={styles.minQueryHint}>
          <View
            style={[
              styles.minQueryHintIconWrap,
              { backgroundColor: interactive.primarySoft },
            ]}
          >
            <Ionicons name="text-outline" size={22} color={interactive.primary} />
          </View>
          <View style={styles.minQueryHintTextCol}>
            <ThemedText type="defaultSemiBold" style={styles.minQueryHintTitle}>
              Minimum {FEC_CANDIDATES_MIN_QUERY_LENGTH} characters
            </ThemedText>
            <ThemedText style={[styles.minQueryHintBody, { color: semantic.mutedText }]}>
              Keep typing. Federal candidate lookup runs only after you’ve entered at least{" "}
              {FEC_CANDIDATES_MIN_QUERY_LENGTH} characters.
            </ThemedText>
            <View style={styles.minQueryProgressRow}>
              {Array.from({ length: FEC_CANDIDATES_MIN_QUERY_LENGTH }, (_, i) => {
                const filled = i < inputTrimmedLength;
                return (
                  <View
                    key={i}
                    style={[
                      styles.minQueryProgressSegment,
                      {
                        backgroundColor: filled ? interactive.primary : semantic.hairline,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <ThemedText style={[styles.minQueryCounter, { color: semantic.mutedText }]}>
              {Math.min(inputTrimmedLength, FEC_CANDIDATES_MIN_QUERY_LENGTH)} of{" "}
              {FEC_CANDIDATES_MIN_QUERY_LENGTH} characters
            </ThemedText>
          </View>
        </View>
      ) : suggestionsLoading ? (
        <View style={styles.suggestionsStatusRow}>
          <ActivityIndicator color={theme.tint} />
          <ThemedText style={[styles.suggestionsStatusText, { color: semantic.mutedText }]}>
            Searching FEC records…
          </ThemedText>
        </View>
      ) : suggestionsError ? (
        <View style={styles.suggestionsStatusRow}>
          <ThemedText style={[styles.suggestionsErrorText, { color: semantic.danger }]}>
            {suggestionsError}
          </ThemedText>
        </View>
      ) : suggestions.length > 0 ? (
        suggestions.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.suggestionItem,
              {
                backgroundColor: pressed ? palette.badgeBackground : "transparent",
              },
            ]}
            onPress={() => onSelectSuggestion(item.name)}
          >
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            <ThemedText style={[styles.suggestionMeta, { color: theme.icon }]} numberOfLines={2}>
              {item.subtitle}
            </ThemedText>
          </Pressable>
        ))
      ) : (
        <View style={styles.suggestionsStatusRow}>
          <ThemedText style={[styles.suggestionsStatusText, { color: semantic.mutedText }]}>
            No candidates match that search.
          </ThemedText>
        </View>
      )}
    </View>
  );
}
