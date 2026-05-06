import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts } from '@/constants/theme/Typography';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'para';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'tint');

  // @ts-ignore
  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: linkColor }] : undefined,
        type === 'para' ? styles.para : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

/** Hypatia Precision: body-lg, display-md, display-lg scale (Inter). */
const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 26,
  },
  defaultSemiBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 26,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.24,
  },
  subtitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0.14,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 26,
    fontSize: 16,
  },
  para: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.64,
  },
});
