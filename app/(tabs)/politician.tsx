import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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
  const [query, setQuery] = React.useState('');
  const { isLoading, error, apiData } = useFlaskHelloSearch(query);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');
  const placeholderColor = '#9ca3af';

  const showResultCard =
    !!query.trim() && !isLoading && !error && apiData !== null;

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
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search politicians..."
                  placeholderTextColor={placeholderColor}
                  style={[styles.searchInput, { color: textColor }]}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                <FontAwesome name="sliders" size={16} color={iconColor} />
              </View>
            </View>

            <ThemedText style={[styles.helperText, { color: theme.icon }]}>
              {!query.trim() && 'Type to search politicians'}
              {!!query.trim() && isLoading && 'Searching...'}
              {!!query.trim() && !isLoading && error && error}
              {!!query.trim() && !isLoading && !error && apiData !== null && `Received: ${summarizeForHelper(apiData)}`}
              {!!query.trim() && !isLoading && !error && apiData === null && `Searching for: "${query.trim()}"`}
            </ThemedText>

            <View style={styles.responseCenter}>
              {!query.trim() && (
                <ThemedText style={{ color: theme.icon }}>Search to load data from the API</ThemedText>
              )}
              {!!query.trim() && isLoading && (
                <ThemedText style={{ color: theme.icon }}>Waiting for response...</ThemedText>
              )}
              {!!query.trim() && !isLoading && error && (
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
