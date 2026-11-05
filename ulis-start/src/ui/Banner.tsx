import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import type { FeatherName } from './Button';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer } from './interaction';

export type BannerVariant = 'info' | 'warning' | 'danger' | 'success';

export interface BannerProps {
  variant?: BannerVariant;
  title?: string;
  message: string;
  icon?: FeatherName;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const ICONS: Record<BannerVariant, FeatherName> = {
  info: 'info',
  warning: 'clock',
  danger: 'alert-triangle',
  success: 'check-circle',
};

export function Banner({ variant = 'info', title, message, icon, actionLabel, onAction, onDismiss, style, testID }: BannerProps) {
  const { colors, spacing } = useTheme();
  const tone = {
    info: { fg: colors.infoCalloutBorder, bg: colors.infoCalloutBg },
    warning: { fg: colors.warning, bg: colors.warningSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft },
    success: { fg: colors.success, bg: colors.successSoft },
  }[variant];

  return (
    <View
      accessibilityRole={variant === 'danger' || variant === 'warning' ? 'alert' : 'summary'}
      testID={testID}
      style={[
        styles.box,
        { backgroundColor: tone.bg, borderLeftColor: tone.fg, borderRadius: 9, paddingVertical: 15, paddingHorizontal: 17, gap: spacing.md },
        style,
      ]}
    >
      <Feather name={icon ?? ICONS[variant]} size={20} color={tone.fg} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <AppText variant="bodyStrong" color={variant === 'info' ? colors.infoCalloutText : 'text'}>
            {title}
          </AppText>
        ) : null}
        <AppText
          variant={title ? 'caption' : 'body'}
          color={variant === 'info' ? colors.infoCalloutText : title ? 'textMuted' : 'text'}
        >
          {message}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={(state) => [styles.action, { opacity: state.pressed ? 0.6 : 1 }, pointer, focusRing(state, tone.fg)]}
          >
            <AppText variant="bodyStrong" color={tone.fg}>
              {actionLabel}
            </AppText>
            <Feather name="arrow-right" size={16} color={tone.fg} />
          </Pressable>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Đóng thông báo" hitSlop={12} style={(state) => [styles.dismiss, pointer, focusRing(state, tone.fg)]}>
          <Feather name="x" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 4 },
  icon: { marginTop: 2 },
  body: { flex: 1, gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, alignSelf: 'flex-start' },
  dismiss: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
});
