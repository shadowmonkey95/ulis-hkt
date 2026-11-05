import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import { cardShadow } from './theme';
import { focusRing, pointer, pressState } from './interaction';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Required for screen readers when `onPress` is set. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Inner padding; defaults to 16. */
  padding?: number;
  /** Tinted background instead of surface. */
  tone?: 'surface' | 'primary' | 'accent' | 'success' | 'muted';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, onPress, accessibilityLabel, accessibilityHint, padding, tone = 'surface', style, testID }: CardProps) {
  const { colors, radius, spacing, isDark } = useTheme();
  const bg = {
    surface: colors.surface,
    primary: colors.primary,
    accent: colors.accentSoft,
    success: colors.successSoft,
    muted: colors.surfaceAlt,
  }[tone];
  const base: ViewStyle = {
    backgroundColor: bg,
    borderRadius: radius.card,
    padding: padding ?? spacing.lg,
    borderWidth: tone === 'surface' ? 1 : 0,
    borderColor: colors.border,
  };
  const shadow = tone === 'surface' && !isDark ? cardShadow : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        testID={testID}
        style={(state) => {
          const s = pressState(state);
          return [
            base,
            shadow,
            { opacity: s.pressed ? 0.85 : 1 },
            s.hovered ? { borderColor: colors.cardHoverBorder, transform: [{ translateY: -2 }] } : null,
            s.hovered && tone === 'surface' && !isDark ? styles.shadowHover : null,
            pointer,
            focusRing(state, colors.primary),
            style,
          ];
        }}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, shadow, style]} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shadowHover: { shadowOpacity: 0.09, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
});
