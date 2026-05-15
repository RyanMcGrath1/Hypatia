import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { RefObject } from "react";
import { Pressable, TextInput, View } from "react-native";

import { politicianTabScreenStyles as styles } from "@/components/politician/tab/politicianTabScreenStyles";

export type PoliticianSearchFieldProps = {
  searchRef: RefObject<TextInput | null>;
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
  placeholder: string;
  placeholderTextColor: string;
  textColor: string;
  iconColor: string;
  searchShellStyle: object[];
  onClear: () => void;
};

export function PoliticianSearchField({
  searchRef,
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSubmitEditing,
  placeholder,
  placeholderTextColor,
  textColor,
  iconColor,
  searchShellStyle,
  onClear,
}: PoliticianSearchFieldProps) {
  return (
    <View style={searchShellStyle}>
      <Ionicons name="search" size={20} color={placeholderTextColor} />
      <TextInput
        ref={searchRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[styles.searchInput, { color: textColor }]}
        returnKeyType="search"
        blurOnSubmit
        onSubmitEditing={onSubmitEditing}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={onClear}
        >
          <FontAwesome name="times-circle" size={16} color={iconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}
