import type { NewsTopicId } from '@/hooks/api/newsApi';

/**
 * Ionicons (outline) per news topic — keeps chips visually scannable in the carousel.
 */
export const NEWS_TOPIC_ICON_NAMES = {
  all: 'layers-outline',
  general: 'newspaper-outline',
  business: 'briefcase-outline',
  technology: 'hardware-chip-outline',
  science: 'flask-outline',
  health: 'medical-outline',
  sports: 'trophy-outline',
  entertainment: 'film-outline',
} as const satisfies Record<NewsTopicId, string>;
