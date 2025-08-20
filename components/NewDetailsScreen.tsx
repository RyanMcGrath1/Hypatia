import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";

export default function NewsDetailsScreen({ route }: { route: any }) {
  const { label, text } = route.params; // Retrieve parameters passed from NewsCard

  return (
    <View style={styles.container}>
      <ThemedText type="title">{label}</ThemedText>
      {text && <ThemedText>{text}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
});