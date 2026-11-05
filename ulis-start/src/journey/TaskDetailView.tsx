// Task detail body, shared by the /task/[id] route and the desktop master–detail panel on Hành trình.
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { getContact, getGuide, getPhase, getResource } from '../content';
import type { Task } from '../types';
import {
  AppText,
  Button,
  Card,
  ContactCard,
  DueLabel,
  OWNER_LONG_LABELS,
  OwnerChip,
  RESOURCE_TYPE_LABELS,
  SourceFooter,
  openUrlSafe,
  useTheme,
  useToast,
} from '../ui';
import { getCheckinDayForTask } from './engine';
import { completeLabel } from './format';
import { useJourney } from './JourneyProvider';
import { useTaskToggle, type ToggleResult } from './useTaskToggle';

export interface TaskPrimaryButtonProps {
  task: Task;
  /** Called with the toggle result (e.g. the route goes back after 'done'). */
  onResult?: (result: ToggleResult) => void;
}

/** "Đánh dấu hoàn thành" / "Đã nhận" / "Trả lời khảo sát nhanh" / "… · Bỏ đánh dấu". */
export function TaskPrimaryButton({ task, onResult }: TaskPrimaryButtonProps) {
  const { statusOf } = useJourney();
  const toggle = useTaskToggle();
  const done = statusOf(task.id) === 'done';
  const mine = task.owner === 'me';
  const checkinDay = getCheckinDayForTask(task);
  const label = done
    ? mine
      ? 'Đã hoàn thành · Bỏ đánh dấu'
      : 'Đã nhận · Bỏ đánh dấu'
    : checkinDay !== null
      ? 'Trả lời khảo sát nhanh'
      : completeLabel(task.owner);
  return (
    <Button
      label={label}
      icon={done ? 'rotate-ccw' : checkinDay !== null ? 'smile' : 'check'}
      variant={done ? 'secondary' : 'primary'}
      onPress={() => {
        const result = toggle(task);
        onResult?.(result);
      }}
      accessibilityLabel={
        done ? `Bỏ đánh dấu: ${task.title}` : `${checkinDay !== null ? 'Trả lời khảo sát' : completeLabel(task.owner)}: ${task.title}`
      }
    />
  );
}

export interface TaskDetailViewProps {
  task: Task;
  /** Render the primary action inline (desktop / panel) instead of leaving it to a sticky footer. */
  inlineAction?: boolean;
  onResult?: (result: ToggleResult) => void;
}

export function TaskDetailView({ task, inlineAction, onResult }: TaskDetailViewProps) {
  const { colors, spacing, radius } = useTheme();
  const { statusOf, currentDay } = useJourney();
  const toast = useToast();

  const status = statusOf(task.id);
  const phase = getPhase(task.phaseId);
  const guide = task.guideId ? getGuide(task.guideId) : undefined;
  const contact = task.contactId ? getContact(task.contactId) : undefined;
  const forms = task.formIds.map(getResource).filter((r) => r !== undefined);
  const mine = task.owner === 'me';

  const openLink = async (url: string) => {
    if (!url || url === '#') {
      toast.show('Liên kết mẫu – ULIS sẽ bổ sung đường dẫn chính thức', 'info');
      return;
    }
    if (!(await openUrlSafe(url))) toast.show('Không mở được liên kết', 'warning');
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        {phase ? (
          <AppText variant="small" color="primary" weight="700">
            {phase.title.toUpperCase()}
          </AppText>
        ) : null}
        <AppText variant="title" accessibilityRole="header">
          {task.title}
        </AppText>
        <View style={[styles.wrap, { gap: spacing.sm }]}>
          <OwnerChip owner={task.owner} long />
          <DueLabel status={status} dueDay={task.dueDay} currentDay={currentDay} phaseStartDay={phase?.startDay} />
          <AppText variant="small" color="textMuted">
            {`${task.required ? 'Bắt buộc' : 'Không bắt buộc'} · khoảng ${task.estimatedMinutes} phút`}
          </AppText>
        </View>
      </View>

      {inlineAction ? (
        <View style={styles.inlineAction}>
          <TaskPrimaryButton task={task} onResult={onResult} />
        </View>
      ) : null}

      <Card tone="muted">
        <AppText variant="caption" color="textMuted" weight="700">
          VÌ SAO QUAN TRỌNG
        </AppText>
        <AppText>{task.why}</AppText>
      </Card>

      {!mine ? (
        <Card tone="accent">
          <View style={[styles.rowTop, { gap: spacing.sm }]}>
            <Feather name="clock" size={18} color={colors.warning} style={styles.iconTop} />
            <AppText style={styles.flex}>
              {`${OWNER_LONG_LABELS[task.owner]} sẽ làm – bạn cần: làm theo các bước dưới đây và bấm "Đã nhận" khi đã nhận kết quả.`}
            </AppText>
          </View>
        </Card>
      ) : null}

      {status === 'locked' ? (
        <AppText variant="caption" color="textMuted">
          {`Giai đoạn này mở vào ngày ${phase?.startDay ?? task.dueDay}. ${mine ? 'Bạn vẫn có thể làm trước nếu muốn.' : ''}`}
        </AppText>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <AppText variant="h2" accessibilityRole="header">
          {mine ? 'Các bước thực hiện' : 'Phần việc của bạn'}
        </AppText>
        {task.steps.map((s, i) => (
          <View key={i} style={[styles.rowTop, { gap: spacing.md }]}>
            <View style={[styles.stepNum, { backgroundColor: colors.primarySoft, borderRadius: radius.pill }]}>
              <AppText variant="caption" color="primary" weight="700" maxFontSizeMultiplier={1.3}>
                {String(i + 1)}
              </AppText>
            </View>
            <View style={styles.flex}>
              <AppText>{s.text}</AppText>
              {s.link ? (
                <Pressable
                  onPress={() => void openLink(s.link ?? '')}
                  accessibilityRole="link"
                  accessibilityLabel={`Mở liên kết của bước ${i + 1}`}
                  style={styles.linkRow}
                >
                  <Feather name="external-link" size={14} color={colors.primary} />
                  <AppText variant="caption" color="primary">
                    Mở liên kết
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {forms.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="h2" accessibilityRole="header">
            Biểu mẫu & tài liệu
          </AppText>
          {forms.map((r) => (
            <Card key={r.id} onPress={() => void openLink(r.url)} accessibilityLabel={`Mở tài liệu: ${r.title}`} padding={spacing.md}>
              <View style={[styles.row, { gap: spacing.md }]}>
                <Feather name={r.type === 'video' ? 'play-circle' : 'file-text'} size={20} color={colors.primary} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{r.title}</AppText>
                  <AppText variant="small" color="textMuted">
                    {RESOURCE_TYPE_LABELS[r.type]}
                  </AppText>
                </View>
                <Feather name="download" size={18} color={colors.textMuted} />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {contact ? (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="h2" accessibilityRole="header">
            Liên hệ
          </AppText>
          <ContactCard contact={contact} onPress={() => router.push({ pathname: '/contacts/[id]', params: { id: contact.id } })} />
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {guide ? (
          <Button
            label="Mở hướng dẫn chi tiết"
            icon="book-open"
            variant="secondary"
            onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })}
            accessibilityLabel={`Mở hướng dẫn chi tiết: ${guide.title}`}
          />
        ) : null}
        <Button
          label="Hỏi trợ lý về việc này"
          icon="message-circle"
          variant="secondary"
          onPress={() => router.push({ pathname: '/assistant', params: { taskId: task.id } })}
          accessibilityLabel={`Hỏi trợ lý về việc: ${task.title}`}
        />
      </View>

      <SourceFooter meta={task} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  iconTop: { marginTop: 3 },
  stepNum: { minWidth: 28, minHeight: 28, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  inlineAction: { maxWidth: 420 },
});
