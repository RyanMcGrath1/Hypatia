import { Stack } from "expo-router";

import { forgivingStackScreenOptions } from "@/constants/navigation/stackScreenOptions";

export default function NewsTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...forgivingStackScreenOptions,
      }}
    />
  );
}
