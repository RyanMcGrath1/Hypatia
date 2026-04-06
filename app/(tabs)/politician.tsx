import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import PoliticianLineChart from '@/components/PoliticianLineChart';
import { PoliticianResultCard } from '@/components/PoliticianResultCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFlaskHelloSearch } from '@/hooks/useFlaskHelloSearch';
import { useThemeColor } from '@/hooks/useThemeColor';

function summarizeForHelper(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }
  if (typeof data === 'string') {
    return data.length > 80 ? `${data.slice(0, 80)}…` : data;
  }
  try {
    const s = JSON.stringify(data);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  } catch {
    return '…';
  }
}

export default function PoliticianScreen() {
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const { isLoading, error, apiData } = useFlaskHelloSearch(submittedQuery);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const placeholderColor = '#9ca3af';

  const submitSearch = useCallback(() => {
    setSubmittedQuery(input.trim());
  }, [input]);

  const showResultCard =
    !!submittedQuery.trim() && !isLoading && !error && apiData !== null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            <ThemedText type="title" style={styles.title}>
              Politician
            </ThemedText>

            <PoliticianLineChart />

            <View style={styles.searchRowOuter}>
              <View
                style={[
                  styles.searchContainer,
                  {
                    borderColor: colorScheme === 'dark' ? '#4b5563' : '#d1d5db',
                    backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff',
                  },
                ]}>
                <FontAwesome name="search" size={16} color={iconColor} />
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Search politicians..."
                  placeholderTextColor={placeholderColor}
                  style={[styles.searchInput, { color: textColor }]}
                  returnKeyType="search"
                  submitBehavior="submit"
                  onSubmitEditing={submitSearch}
                  clearButtonMode="while-editing"
                />
                <FontAwesome name="sliders" size={16} color={iconColor} />
              </View>
            </View>

            <ThemedText style={[styles.helperText, { color: theme.icon }]}>
              {!input.trim() && !submittedQuery && 'Type a search and press Enter'}
              {!!input.trim() && !submittedQuery && 'Press Enter to search'}
              {!!submittedQuery && isLoading && 'Searching...'}
              {!!submittedQuery && !isLoading && error && error}
              {!!submittedQuery && !isLoading && !error && apiData !== null && `Received: ${summarizeForHelper(apiData)}`}
            </ThemedText>

            <View style={styles.responseCenter}>
              {!submittedQuery && (
                <ThemedText style={{ color: theme.icon }}>Press Enter in the search field to load data</ThemedText>
              )}
              {!!submittedQuery && isLoading && (
                <ThemedText style={{ color: theme.icon }}>Waiting for response...</ThemedText>
              )}
              {!!submittedQuery && !isLoading && error && (
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              )}
              {showResultCard && (
                <PoliticianResultCard data={apiData} colorScheme={colorScheme} />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  title: {
    marginBottom: 16,
  },
  searchRowOuter: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchContainer: {
    width: '60%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  helperText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  responseCenter: {
    flexGrow: 1,
    minHeight: 200,
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
