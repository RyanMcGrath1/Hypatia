import { ThemedText } from '@/components/theme/ThemedText';
import { SectionCard } from '@/components/surfaces/SectionCard';

type EmptyStateProps = {
  title: string;
  body: string;
  borderColor: string;
  backgroundColor: string;
  bodyColor: string;
};

export function EmptyState({ title, body, borderColor, backgroundColor, bodyColor }: EmptyStateProps) {
  return (
    <SectionCard borderColor={borderColor} backgroundColor={backgroundColor}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText style={{ color: bodyColor }}>{body}</ThemedText>
    </SectionCard>
  );
}
