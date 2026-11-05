import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { AppText, Chip, UNVERIFIED_LABEL, formatDate, useTheme } from '../../ui';
import type { AssistantAction, AssistantReply } from '../types';

export interface ReplyBodyProps {
  reply: AssistantReply;
  onAction: (action: AssistantAction) => void;
  /** Hide "mark done" chips for tasks that are already done. */
  isTaskDone: (taskId: string) => boolean;
  /** The question was already sent to Phòng TCTT from this message. */
  sentToHr: boolean;
}

/** Steps, sources ("Nguồn: … · cập nhật …" + "Nội dung mẫu" badge) and action chips under an assistant bubble. */
export function ReplyBody({ reply, onAction, isTaskDone, sentToHr }: ReplyBodyProps) {
  const { colors, spacing, radius } = useTheme();
  const unverified = reply.sources.some((s) => !s.verified);

  return (
    <View style={{ gap: spacing.sm }}>
      {reply.steps && reply.steps.length > 0 ? (
        <View style={{ gap: spacing.xs }} accessibilityLabel={`Các bước: ${reply.steps.map((s, i) => `${i + 1}. ${s}`).join(' ')}`}>
          {reply.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primarySoft }]}>
                <AppText variant="small" color="primary" weight="700" maxFontSizeMultiplier={1.3}>
                  {i + 1}
                </AppText>
              </View>
              <AppText variant="caption" style={styles.flex} selectable>
                {step}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      {reply.sources.length > 0 ? (
        <View style={[styles.sources, { borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 }]}>
          {reply.sources.map((s) => (
            <View key={s.id} style={styles.sourceRow}>
              <Feather name="file-text" size={12} color={colors.textMuted} style={styles.icon} />
              <AppText variant="small" color="textMuted" style={styles.flex}>
                {`Nguồn: ${s.title} · cập nhật ${formatDate(s.updatedAt)}`}
              </AppText>
            </View>
          ))}
          {unverified ? (
            <View style={[styles.badge, { backgroundColor: colors.accentSoft, borderRadius: radius.chip, marginTop: spacing.xs }]}>
              <Feather name="alert-circle" size={12} color={colors.warning} />
              <AppText variant="small" color={colors.warning} weight="700">
                {UNVERIFIED_LABEL}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {reply.actions.length > 0 ? (
        <View style={[styles.actions, { gap: spacing.sm }]}>
          {reply.actions.map((a) => {
            if (a.kind === 'complete-task' && isTaskDone(a.taskId)) {
              return <Chip key={`done-${a.taskId}`} label="Việc này đã xong" icon="check" color={colors.success} />;
            }
            if (a.kind === 'ask-hr' && sentToHr) {
              return <Chip key="ask-hr-sent" label="Đã gửi tới Phòng TCTT" icon="check" color={colors.success} />;
            }
            return (
              <Chip
                key={`${a.kind}-${a.label}`}
                label={a.label}
                icon={a.icon}
                onPress={() => onAction(a)}
                color={a.kind === 'complete-task' ? colors.success : undefined}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepNum: { minWidth: 22, minHeight: 22, paddingHorizontal: 4, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  sources: { borderTopWidth: StyleSheet.hairlineWidth },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  icon: { marginTop: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
});
