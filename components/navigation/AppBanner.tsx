import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { usePathname, useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppRoutes } from "@/constants/app/routes";
import { Brand, Colors } from "@/constants/theme/Colors";
import { getSemanticColors } from "@/constants/theme/ThemeTokens";
import { useColorScheme } from "@/hooks/useColorScheme";
import { appBannerShowsBack } from "@/lib/navigation/appBannerBack";

export function AppBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const semantic = getSemanticColors(colorScheme);
  const showBack = appBannerShowsBack(pathname);
  const bannerLogo = useMemo(
    () => require("@/assets/images/hypatia-logo-mark.png"),
    [],
  );

  const openProfile = () => {
    if (pathname !== AppRoutes.profile) {
      router.push(AppRoutes.profile);
    }
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backHitArea,
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
      ) : null}

      <Image
        source={bannerLogo}
        style={styles.image}
        contentFit="contain"
        accessibilityLabel="App banner"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profile"
        accessibilityHint="Opens your profile"
        hitSlop={8}
        style={({ pressed }) => [
          styles.profileHitArea,
          { opacity: pressed ? 0.82 : 1 },
        ]}
        onPress={openProfile}
      >
        <View
          style={[
            styles.profileAvatar,
            {
              borderColor: Brand.border,
              backgroundColor: semantic.cardSubtleBackground,
            },
          ]}
        >
          <FontAwesome name="user" size={15} color={theme.icon} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 2,
    position: "relative",
    zIndex: 20,
  },
  backHitArea: {
    position: "absolute",
    left: 4,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  profileHitArea: {
    position: "absolute",
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
    minHeight: 44,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: 38,
    height: 38,
  },
});
