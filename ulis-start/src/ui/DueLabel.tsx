import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import type { TaskStatus } from '../types';
import { AppText } from './AppText';
import type { FeatherName } from './Button';
import { useTheme } from './ThemeProvider';
import { getDueInfo } from './labels';

export interface DueLabelProps {
  status: TaskStatus;
  dueDay: number;
  currentDay: number;
  /** Start day of the task's phase – used for "Mở vào ngày X" when locked. */
  phaseStartDay?: number;
}

/** "Đã xong" · "Chưa mở" – no deadlines or day counts (see getDueInfo). Renders nothing otherwise. */
export function DueLabel({ status }: DueLabelProps) {
  const { colors } = useTheme();
  const info = getDueInfo(status);
  if (!info) return null;
  const color = { success: colors.success, muted: colors.textMuted, warning: colors.warning, danger: colors.danger }[info.tone];
  const icon: FeatherName =
    status === 'done' ? 'check' : status === 'locked' ? 'lock' : status === 'overdue' ? 'alert-circle' : 'calendar';
  return (
    <View style={styles.row} accessible accessibilityLabel={info.text}>
      <Feather name={icon} size={12} color={color} />
      <AppText variant="small" color={color} weight={info.tone === 'danger' ? '700' : '500'}>
        {info.text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
