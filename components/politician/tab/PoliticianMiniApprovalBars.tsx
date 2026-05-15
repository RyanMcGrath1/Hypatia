import { StyleSheet, View } from "react-native";

export function PoliticianMiniApprovalBars({
  color,
  variant,
}: {
  color: string;
  variant: "blue" | "red";
}) {
  const heights =
    variant === "blue" ? [14, 22, 18, 28, 24] : [26, 22, 16, 14, 12];
  return (
    <View style={styles.miniBarsWrap}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.miniBar, { height: h, backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  miniBarsWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 32,
  },
  miniBar: {
    width: 14,
    borderRadius: 3,
    minHeight: 4,
  },
});
