import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function RyanScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Ryan</ThemedText>
      <ThemedText style={{ marginTop: 8 }}>Add content for this tab here.</ThemedText>
    </ThemedView>
  );
}
