import Feather from '@expo/vector-icons/Feather';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import type { Task, TaskStatus } from '../types';
import { AppText } from './AppText';
import { DueLabel } from './DueLabel';
import { OwnerChip } from './OwnerChip';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';
import { OWNER_LABELS, getDueInfo } from './labels';

export interface TaskRowProps {
  task: Task;
  status: TaskStatus;
  currentDay: number;
  /** Start day of the task's phase, for "Mở vào ngày X". */
  phaseStartDay?: number;
  /** Checkbox handler. Omit to render a read-only status icon. */
  onToggle?: () => void;
  /** Row handler (open task detail). */
  onPress?: () => void;
  /** Disable the checkbox (e.g. locked non-`me` task). */
  toggleDisabled?: boolean;
  /** Hide the owner chip (e.g. when list is already filtered to "Của tôi"). */
  hideOwner?: boolean;
  /** Draw a bottom divider (default true). */
  divider?: boolean;
  testID?: string;
}

/**
 * checkbox · title · owner chip · due label · chevron.
 * The checkbox bounces when status turns `done`; haptics are the caller's job.
 */
export function TaskRow({
  task,
  status,
  currentDay,
  phaseStartDay,
  onToggle,
  onPress,
  toggleDisabled,
  hideOwner,
  divider = true,
  testID,
}: TaskRowProps) {
  const { colors, spacing, radius } = useTheme();
  const done = status === 'done';
  const muted = status === 'locked' || status === 'skipped';
  const isMine = task.owner === 'me';
  const scale = useState(() => new Animated.Value(1))[0];
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      scale.setValue(0.7);
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
    }
    prevDone.current = done;
  }, [done, scale]);

  const due = getDueInfo(status);
  const verb = isMine ? 'Đã làm' : 'Đã nhận';
  const checkLabel = done ? `Bỏ đánh dấu "${task.title}"` : `${verb}: ${task.title}`;

  const box = (
    <Animated.View
      style={[
        styles.box,
        {
          borderRadius: isMine ? radius.sm - 2 : 999,
          borderColor: done ? colors.primary : muted ? colors.border : colors.primary,
          backgroundColor: done ? colors.primary : colors.surface,
          transform: [{ scale }],
        },
      ]}
    >
      {done ? <Feather name="check" size={16} color="#FFFFFF" /> : null}
    </Animated.View>
  );

  return (
    <View
      testID={testID}
      style={[
        styles.row,
        { paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0 },
        // Reference `.onboard-task.completed`: soft pink row.
        done ? { backgroundColor: colors.completedBg, borderRadius: radius.tile, borderBottomWidth: 0, marginBottom: divider ? 2 : 0 } : null,
      ]}
    >
      {onToggle ? (
        <Pressable
          onPress={onToggle}
          disabled={toggleDisabled}
          accessibilityRole="checkbox"
          accessibilityLabel={checkLabel}
          accessibilityState={{ checked: done, disabled: !!toggleDisabled }}
          style={(state) => [styles.check, { opacity: toggleDisabled ? 0.4 : muted ? 0.6 : 1 }, toggleDisabled ? null : pointer, focusRing(state, colors.primary, -4)]}
        >
          {box}
        </Pressable>
      ) : (
        <View style={[styles.check, { opacity: muted ? 0.6 : 1 }]} accessibilityElementsHidden importantForAccessibility="no">
          {box}
        </View>
      )}

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${task.title}. ${OWNER_LABELS[task.owner]}${due ? `. ${due.text}` : ''}`}
        accessibilityHint={onPress ? 'Mở chi tiết việc' : undefined}
        style={(state) => [
          styles.main,
          { opacity: state.pressed ? 0.7 : muted ? 0.65 : 1, borderRadius: radius.sm },
          onPress && pressState(state).hovered ? { backgroundColor: colors.surfaceAlt } : null,
          onPress ? pointer : null,
          focusRing(state, colors.primary),
        ]}
      >
        <View style={styles.text}>
          <AppText
            variant="bodyStrong"
            color={done ? 'textMuted' : 'text'}
            style={done ? styles.doneTitle : undefined}
          >
            {task.title}
          </AppText>
          <View style={[styles.meta, { gap: spacing.sm, marginTop: spacing.xs }]}>
            {!hideOwner ? <OwnerChip owner={task.owner} /> : null}
            <DueLabel status={status} dueDay={task.dueDay} currentDay={currentDay} phaseStartDay={phaseStartDay} />
            {!task.required ? (
              <AppText variant="small" color="textMuted">
                Không bắt buộc
              </AppText>
            ) : null}
          </View>
          {!isMine && !done ? (
            <AppText variant="small" color="textMuted" style={{ marginTop: 2 }}>
              {`Đang chờ ${OWNER_LABELS[task.owner]} – bạn xác nhận khi đã nhận`}
            </AppText>
          ) : null}
        </View>
        {onPress ? <Feather name="chevron-right" size={20} color={colors.textMuted} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  check: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  box: { width: 26, height: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8, paddingVertical: 2 },
  text: { flex: 1 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  doneTitle: { textDecorationLine: 'line-through' },
});
