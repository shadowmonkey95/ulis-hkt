import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Meta } from '../types';
import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';
import { formatDate } from './labels';

export interface SourceFooterProps {
  meta: Meta;
  /** Smaller inline variant (inside cards / chat bubbles). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const UNVERIFIED_LABEL = 'Nội dung mẫu – cần ULIS xác nhận';

/** "Nguồn: … · Cập nhật 03/11/2026" + "Nội dung mẫu" badge when unverified. Ends every content screen. */
export function SourceFooter({ meta, compact, style }: SourceFooterProps) {
  const { colors, spacing, radius } = useTheme();
  const date = meta.updatedAt ? formatDate(meta.updatedAt) : '';
  const line = `Nguồn: ${meta.source}${date ? ` · Cập nhật ${date}` : ''}`;
  return (
    <View
      accessible
      accessibilityLabel={`${line}${meta.verified ? '. Đã xác nhận' : `. ${UNVERIFIED_LABEL}`}`}
      style={[
        compact ? styles.compact : [styles.full, { borderTopColor: colors.border, marginTop: spacing.xl, paddingTop: spacing.md }],
        { gap: spacing.xs },
        style,
      ]}
    >
      <View style={styles.line}>
        <Feather name="file-text" size={compact ? 12 : 14} color={colors.textMuted} style={styles.icon} />
        <AppText variant="small" color="textMuted" style={styles.flex}>
          {line}
        </AppText>
      </View>
      {meta.verified ? (
        <View style={styles.line}>
          <Feather name="check-circle" size={12} color={colors.success} style={styles.icon} />
          <AppText variant="small" color="success" weight="600">
            Đã được ULIS xác nhận
          </AppText>
        </View>
      ) : (
        <View style={[styles.badge, { backgroundColor: colors.pillBg, borderColor: colors.outlineBorder, borderRadius: radius.pill }]}>
          <Feather name="alert-circle" size={12} color={colors.pillText} />
          <AppText variant="small" color={colors.pillText} weight="700">
            {UNVERIFIED_LABEL}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  full: { borderTopWidth: StyleSheet.hairlineWidth },
  compact: {},
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  icon: { marginTop: 3 },
  flex: { flex: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
});
