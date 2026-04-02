import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function PoliticianScreen() {
  const [query, setQuery] = React.useState('');
  const shouldDismissKeyboardOnPress = Platform.OS !== 'web';

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.container}
        onPress={shouldDismissKeyboardOnPress ? Keyboard.dismiss : undefined}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ParallaxScrollView
            headerBackgroundColor={{ light: '#d1d5db', dark: '#1f2937' }}
            headerImage={
              <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
              <ThemedText type="title">Politician</ThemedText>
            </ThemedView>

            <ThemedView style={styles.sectionContainer}>
              <View style={styles.searchContainer}>
                <FontAwesome name="search" size={16} color="#6b7280" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search politicians..."
                  placeholderTextColor="#9ca3af"
                  style={styles.searchInput}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                <FontAwesome name="sliders" size={16} color="#6b7280" />
              </View>

              <ThemedText style={styles.helperText}>
                {query.trim() ? `Searching for: "${query.trim()}"` : 'Type to search politicians'}
              </ThemedText>
            </ThemedView>
          </ParallaxScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionContainer: {
    gap: 14,
    marginBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  helperText: {
    color: '#6b7280',
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
