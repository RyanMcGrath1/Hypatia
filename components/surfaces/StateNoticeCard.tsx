import { Pressable } from "react-native";

import { SectionCard } from "@/components/surfaces/SectionCard";
import { ThemedText } from "@/components/theme/ThemedText";

type StateNoticeCardProps = {
  title: string;
  message: string;
  borderColor: string;
  backgroundColor: string;
  messageColor: string;
  actionLabel?: string;
  actionColor?: string;
  onActionPress?: () => void;
};

export function StateNoticeCard({
  title,
  message,
  borderColor,
  backgroundColor,
  messageColor,
  actionLabel,
  actionColor,
  onActionPress,
}: StateNoticeCardProps) {
  return (
    <SectionCard borderColor={borderColor} backgroundColor={backgroundColor}>
      <ThemedText type="defaultSemiBold">{title}</ThemedText>
      <ThemedText style={{ color: messageColor, lineHeight: 20 }}>
        {message}
      </ThemedText>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: 34,
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
          onPress={onActionPress}
        >
          <ThemedText
            style={{ color: actionColor ?? messageColor, fontWeight: "600" }}
          >
            {actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </SectionCard>
  );
}
