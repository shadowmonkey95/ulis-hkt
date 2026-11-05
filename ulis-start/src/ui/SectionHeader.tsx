import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer } from './interaction';

export interface SectionHeaderProps {
  title: string;
  /** Optional leading number badge (e.g. guide 6-part structure). */
  index?: number;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, index, actionLabel, onAction, style }: SectionHeaderProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { marginTop: spacing.xl, marginBottom: spacing.sm, gap: spacing.sm }, style]}>
      {index !== undefined ? (
        <View style={[styles.index, { backgroundColor: colors.primary }]}>
          <AppText variant="small" color="primaryFg" weight="700" maxFontSizeMultiplier={1.3}>
            {String(index)}
          </AppText>
        </View>
      ) : null}
      <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={actionLabel} hitSlop={10} style={(state) => [styles.action, pointer, focusRing(state, colors.primary)]}>
          <AppText variant="caption" color="primary" weight="700">
            {actionLabel}
          </AppText>
          <Feather name="chevron-right" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  index: { minWidth: 26, minHeight: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  action: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
