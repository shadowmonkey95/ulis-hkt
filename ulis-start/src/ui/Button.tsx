import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';

export type FeatherName = ComponentProps<typeof Feather>['name'];
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: FeatherName;
  /** Icon after the label instead of before. */
  iconRight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to container width (default true). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Min height 48. Label wraps instead of clipping at large font sizes. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconRight,
  disabled,
  loading,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const { colors, radius, spacing } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryFg, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.primary, border: colors.outlineBorder },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
  }[variant];
  const inactive = disabled || loading;
  const iconEl = icon ? <Feather name={icon} size={18} color={palette.fg} /> : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      testID={testID}
      style={(state) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.button,
          paddingHorizontal: spacing.lg,
          opacity: inactive ? 0.5 : state.pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        !inactive && pressState(state).hovered
          ? variant === 'primary'
            ? { backgroundColor: colors.primaryHover, borderColor: colors.primaryHover }
            : variant === 'danger'
              ? null
              : { backgroundColor: colors.navActiveBg }
          : null,
        inactive ? null : pointer,
        focusRing(state, colors.primary),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {!iconRight && iconEl}
          <AppText variant="bodyStrong" color={palette.fg} align="center" style={styles.label}>
            {label}
          </AppText>
          {iconRight && iconEl}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
  label: { flexShrink: 1 },
});
