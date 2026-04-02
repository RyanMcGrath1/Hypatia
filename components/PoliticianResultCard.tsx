import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

type Props = {
  data: unknown;
  colorScheme: 'light' | 'dark';
};

export function PoliticianResultCard({ data, colorScheme }: Props) {
  const borderColor = colorScheme === 'dark' ? '#374151' : '#d1d5db';
  const surface = colorScheme === 'dark' ? '#1f2937' : '#ffffff';
  const muted = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  return (
    <View style={[styles.card, { borderColor, backgroundColor: surface }]}>
      <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
        Result
      </ThemedText>
      {renderPayload(data, muted, colorScheme)}
    </View>
  );
}

function renderPayload(
  data: unknown,
  muted: string,
  colorScheme: 'light' | 'dark'
): React.ReactNode {
  if (data === null || data === undefined) {
    return <ThemedText style={{ color: muted }}>No data</ThemedText>;
  }

  if (typeof data === 'string') {
    return <ThemedText style={styles.body}>{data}</ThemedText>;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return <ThemedText style={styles.body}>{String(data)}</ThemedText>;
  }

  if (Array.isArray(data)) {
    return (
      <View style={styles.list}>
        {data.map((item, index) => (
          <View key={index} style={styles.listRow}>
            <ThemedText style={[styles.muted, { color: muted }]}>{index + 1}.</ThemedText>
            <View style={styles.listItemBody}>
              {typeof item === 'object' && item !== null ? (
                <View style={[styles.nested, nestedSurface(colorScheme)]}>
                  {renderPayload(item, muted, colorScheme)}
                </View>
              ) : (
                <ThemedText style={styles.body}>{String(item)}</ThemedText>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    return (
      <View style={styles.kvList}>
        {entries.map(([key, value]) => (
          <View key={key} style={styles.kvRow}>
            <ThemedText style={[styles.key, { color: muted }]} numberOfLines={2}>
              {key}
            </ThemedText>
            <View style={styles.kvValue}>
              {value !== null && typeof value === 'object' ? (
                <View style={[styles.nested, nestedSurface(colorScheme)]}>
                  {renderPayload(value, muted, colorScheme)}
                </View>
              ) : (
                <ThemedText style={styles.body} selectable>
                  {formatPrimitive(value)}
                </ThemedText>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return <ThemedText style={styles.body}>{String(data)}</ThemedText>;
}

function nestedSurface(colorScheme: 'light' | 'dark') {
  return {
    borderColor: colorScheme === 'dark' ? '#4b5563' : '#e5e7eb',
    backgroundColor: colorScheme === 'dark' ? '#111827' : '#f9fafb',
  };
}

function formatPrimitive(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  muted: {
    fontSize: 14,
    marginRight: 8,
    minWidth: 20,
  },
  list: {
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  listItemBody: {
    flex: 1,
  },
  nested: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    width: '100%',
  },
  kvList: {
    gap: 12,
  },
  kvRow: {
    gap: 4,
  },
  key: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  kvValue: {
    marginTop: 2,
  },
});
