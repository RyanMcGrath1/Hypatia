import { StyleSheet, type StyleProp, type TextStyle } from "react-native";

import { ThemedText } from "@/components/theme/ThemedText";
import { Fonts } from "@/constants/theme/Typography";

type TabLargeTitleProps = {
  title: string;
  style?: StyleProp<TextStyle>;
};

/** Large title naming the current tab; brand identity lives in the top banner. */
export function TabLargeTitle({ title, style }: TabLargeTitleProps) {
  return (
    <ThemedText accessibilityRole="header" style={[styles.title, style]}>
      {title}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    lineHeight: 41,
    fontFamily: Fonts.displayBold,
    letterSpacing: -0.4,
  },
});
