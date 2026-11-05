import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import type { ThemeColors, TypographyVariant } from './theme';

type ColorKey = Exclude<keyof ThemeColors, 'ownerChips' | 'tiles'>;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  /** Theme color key or a raw color string. */
  color?: ColorKey | (string & {});
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

/** Themed text. Always sets a generous lineHeight so diacritics never clip. */
export function AppText({ variant = 'body', color, align, weight, style, ...rest }: AppTextProps) {
  const { colors, type } = useTheme();
  const key = color ?? (variant === 'eyebrow' ? 'eyebrow' : 'text');
  const resolved = key in colors ? (colors[key as ColorKey] as string) : key;
  return (
    <Text
      {...rest}
      style={[type[variant], { color: resolved }, align ? { textAlign: align } : null, weight ? { fontWeight: weight } : null, style]}
    />
  );
}
