import { Stack } from "expo-router";

import { forgivingStackScreenOptions } from "@/constants/navigation/stackScreenOptions";

export default function EconomyTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...forgivingStackScreenOptions,
      }}
    />
  );
}
