import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Phase } from '../types';
import { AppText } from './AppText';
import { ProgressBar } from './ProgressBar';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer } from './interaction';
import { formatDay } from './labels';

/** `behind` = a past phase that still has overdue required tasks. */
export type PhaseState = 'done' | 'current' | 'upcoming' | 'behind';

export interface PhaseHeaderProps {
  phase: Phase;
  state: PhaseState;
  /** Required-task progress of this phase. */
  progress?: { done: number; total: number; pct: number };
  expanded?: boolean;
  /** Tap to expand/collapse. */
  onPress?: () => void;
  /** Hide the line below the dot (last phase). */
  isLast?: boolean;
  /** Rendered under the header, inside the timeline column (e.g. TaskRows). */
  children?: ReactNode;
}

/** Timeline item: dot + vertical line on the left, phase title/goal/progress on the right. */
export function PhaseHeader({ phase, state, progress, expanded, onPress, isLast, children }: PhaseHeaderProps) {
  const { colors, spacing } = useTheme();
  const range =
    phase.endDay <= 0
      ? 'Trước ngày đầu'
      : `${formatDay(Math.max(1, phase.startDay))}–${phase.endDay}`;
  // Derived from done/total so it works whether the engine's `pct` is 0..1 or 0..100.
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : null;
  const stateLabel =
    state === 'done' ? 'Đã hoàn thành' : state === 'current' ? 'Giai đoạn hiện tại' : state === 'behind' ? 'Còn việc quá hạn' : 'Sắp tới';

  const dot =
    state === 'done' ? (
      <View style={[styles.dot, { backgroundColor: colors.success, borderColor: colors.success }]}>
        <Feather name="check" size={12} color="#FFFFFF" />
      </View>
    ) : state === 'behind' ? (
      <View style={[styles.dot, { backgroundColor: colors.warning, borderColor: colors.warning }]}>
        <Feather name="alert-circle" size={12} color="#FFFFFF" />
      </View>
    ) : state === 'current' ? (
      <View style={[styles.dot, { borderColor: colors.primary, backgroundColor: colors.surface, borderWidth: 3 }]}>
        <View style={[styles.innerDot, { backgroundColor: colors.primary }]} />
      </View>
    ) : (
      <View style={[styles.dot, { borderColor: colors.border, backgroundColor: colors.bg }]} />
    );

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        {dot}
        {!isLast ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
      </View>
      <View style={[styles.body, { paddingBottom: isLast ? 0 : spacing.lg }]}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? 'button' : 'header'}
          accessibilityLabel={`${phase.title}. ${range}. ${stateLabel}${pct !== null ? `. ${pct}%` : ''}`}
          accessibilityState={onPress ? { expanded: !!expanded } : undefined}
          style={(state) => [styles.header, { opacity: state.pressed ? 0.7 : 1 }, onPress ? pointer : null, focusRing(state, colors.primary)]}
        >
          <View style={styles.flex}>
            <AppText
              variant="small"
              color={state === 'current' ? 'primary' : state === 'behind' ? 'warning' : 'textMuted'}
              weight="700"
            >
              {`${range.toUpperCase()}${state === 'current' ? ' · ĐANG DIỄN RA' : state === 'behind' ? ' · CÒN VIỆC QUÁ HẠN' : ''}`}
            </AppText>
            <AppText variant="h2" color={state === 'upcoming' ? 'textMuted' : 'text'}>
              {phase.title}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {phase.goal}
            </AppText>
          </View>
          <View style={styles.right}>
            {pct !== null ? (
              <AppText variant="caption" color={pct === 100 ? 'success' : 'textMuted'} weight="700">
                {`${pct}%`}
              </AppText>
            ) : null}
            {onPress ? <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} /> : null}
          </View>
        </Pressable>
        {progress && progress.total > 0 ? (
          <ProgressBar
            progress={progress.done / progress.total}
            height={6}
            style={{ marginTop: spacing.sm }}
            accessibilityLabel={`${progress.done}/${progress.total} việc bắt buộc`}
          />
        ) : null}
        {children ? <View style={{ marginTop: spacing.sm }}>{children}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rail: { width: 28, alignItems: 'center' },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  innerDot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 2, flex: 1, marginTop: 4 },
  body: { flex: 1, marginLeft: 10 },
  header: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 44, gap: 8 },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
});
