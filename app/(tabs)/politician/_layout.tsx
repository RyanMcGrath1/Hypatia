import { Stack } from "expo-router";

import { forgivingStackScreenOptions } from "@/constants/navigation/stackScreenOptions";

export default function PoliticianTabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        ...forgivingStackScreenOptions,
      }}
    />
  );
}
