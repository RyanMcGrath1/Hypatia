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

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 20,
    lineHeight: 28,
  },
  link: {
    fontFamily: Fonts.body,
    lineHeight: 24,
    fontSize: 16,
  },
  para: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    lineHeight: 38,
  },
});
