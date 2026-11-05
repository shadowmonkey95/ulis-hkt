import { router } from 'expo-router';
import { memo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MEDIUM_COLUMN_MAX_WIDTH,
  ProgressSummary,
  TaskDetailView,
  dayCounterLabel,
  filterTasks,
  resolveSelectedTask,
  getPhaseState,
  useJourney,
  useTaskToggle,
  type TaskFilter,
} from '@/journey';
import type { Phase, PhaseId, Task, TaskStatus } from '@/types';
import { AppText, CONTENT_MAX_WIDTH, Chip, EmptyState, PhaseHeader, TaskRow, useLayout, useTheme } from '@/ui';

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'mine', label: 'Của tôi' },
  { id: 'open', label: 'Chưa xong' },
  { id: 'required', label: 'Bắt buộc' },
];

interface JourneyRowProps {
  task: Task;
  status: TaskStatus;
  currentDay: number;
  phaseStartDay: number;
  isLast: boolean;
  hideOwner: boolean;
  /** Desktop master–detail: row is the one shown in the right panel. */
  selected: boolean;
  onToggle: (task: Task) => void;
  onOpen: (task: Task) => void;
}

const JourneyRow = memo(function JourneyRow({
  task,
  status,
  currentDay,
  phaseStartDay,
  isLast,
  hideOwner,
  selected,
  onToggle,
  onOpen,
}: JourneyRowProps) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessibilityState={selected ? { selected } : undefined}
      style={selected ? { backgroundColor: colors.primarySoft, borderRadius: radius.sm } : undefined}
    >
      <TaskRow
        task={task}
        status={status}
        currentDay={currentDay}
        phaseStartDay={phaseStartDay}
        divider={!isLast}
        hideOwner={hideOwner}
        // Own tasks may be completed early (spec decision); tasks owned by others stay disabled until unlocked.
        toggleDisabled={status === 'locked' && task.owner !== 'me'}
        onToggle={() => onToggle(task)}
        onPress={() => onOpen(task)}
      />
    </View>
  );
});

export default function JourneyScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isCompact, isWide } = useLayout();
  const { profile, tasks, phases, currentPhase, currentDay, phaseProgress, progress, statusOf, overdueTasks } = useJourney();
  const toggle = useTaskToggle();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [expanded, setExpanded] = useState<Partial<Record<PhaseId, boolean>>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const visible = filterTasks(tasks, filter, statusOf);
  const selectedTask = isWide ? resolveSelectedTask(selectedId, visible) : null;
  // Wide desktop: select into the right panel. Phones / medium: navigate to the detail route.
  const openTask = (task: Task) => {
    if (isWide) setSelectedId(task.id);
    else router.push({ pathname: '/task/[id]', params: { id: task.id } });
  };
  // Default: current phase + any phase holding overdue tasks are expanded.
  const isExpanded = (p: Phase) =>
    expanded[p.id] ?? (p.id === currentPhase.id || overdueTasks.some((t) => t.phaseId === p.id));

  const renderPhase = ({ item: phase, index }: { item: Phase; index: number }) => {
    const open = isExpanded(phase);
    const phaseTasks = visible.filter((t) => t.phaseId === phase.id);
    return (
      <PhaseHeader
        phase={phase}
        state={getPhaseState(phase, currentPhase, phaseProgress[phase.id])}
        progress={phaseProgress[phase.id]}
        expanded={open}
        isLast={index === phases.length - 1}
        onPress={() => setExpanded((e) => ({ ...e, [phase.id]: !open }))}
      >
        {open ? (
          phaseTasks.length > 0 ? (
            <View
              style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: spacing.xs }]}
            >
              {phaseTasks.map((t, i) => (
                <JourneyRow
                  key={t.id}
                  task={t}
                  status={statusOf(t.id)}
                  currentDay={currentDay}
                  phaseStartDay={phase.startDay}
                  isLast={i === phaseTasks.length - 1}
                  hideOwner={filter === 'mine'}
                  selected={selectedTask?.id === t.id}
                  onToggle={toggle}
                  onOpen={openTask}
                />
              ))}
            </View>
          ) : (
            <AppText variant="caption" color="textMuted">
              Không có việc nào khớp bộ lọc.
            </AppText>
          )
        ) : null}
      </PhaseHeader>
    );
  };

  const listHeader = (
    <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
      <AppText variant="title" accessibilityRole="header">
        Hành trình 30 ngày
      </AppText>
      <AppText variant="eyebrow">{`${dayCounterLabel(currentDay)} · ${currentPhase.title}`}</AppText>
      <ProgressSummary progress={progress} track={profile?.track} />
      <View style={[styles.filters, { gap: spacing.sm }]}>
        {FILTERS.map((f) => (
          <Chip
            key={f.id}
            label={f.label}
            selected={filter === f.id}
            onPress={() => setFilter(f.id)}
            accessibilityLabel={`Lọc: ${f.label}`}
          />
        ))}
      </View>
    </View>
  );

  const timeline = (
    <FlatList
      data={phases}
      keyExtractor={(p) => p.id}
      renderItem={renderPhase}
      extraData={[visible, expanded, currentDay, selectedTask?.id]}
      style={isWide ? [styles.master, { borderRightColor: colors.border }] : undefined}
      contentContainerStyle={[
        { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
        !isCompact && !isWide ? { width: '100%', maxWidth: MEDIUM_COLUMN_MAX_WIDTH, alignSelf: 'center', padding: spacing.xl } : null,
      ]}
      ListHeaderComponent={listHeader}
    />
  );

  if (!isWide) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]}>
        {timeline}
      </SafeAreaView>
    );
  }

  // Wide desktop (web ≥ 1024): master (timeline) – detail (selected task) side by side.
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <View style={[styles.wideRow, { maxWidth: CONTENT_MAX_WIDTH + 240 }]}>
        {timeline}
        <ScrollView
          style={styles.detail}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl * 2 }}
          accessibilityLabel="Chi tiết việc đã chọn"
        >
          {selectedTask ? (
            <View
              style={[
                styles.detailCard,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, padding: spacing.xl },
              ]}
            >
              <TaskDetailView key={selectedTask.id} task={selectedTask} inlineAction />
            </View>
          ) : (
            <EmptyState
              icon="mouse-pointer"
              title="Chọn một việc để xem chi tiết"
              message="Nhấn vào một việc ở cột bên trái – chi tiết, các bước và liên hệ sẽ hiện ở đây."
              style={styles.detailEmpty}
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { flexDirection: 'row', flexWrap: 'wrap' },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14 },
  wideRow: { flex: 1, flexDirection: 'row', width: '100%', alignSelf: 'center' },
  master: { flexGrow: 0, flexShrink: 0, width: '44%', minWidth: 420, maxWidth: 560, borderRightWidth: StyleSheet.hairlineWidth },
  detail: { flex: 1 },
  detailCard: { borderWidth: StyleSheet.hairlineWidth, maxWidth: 760 },
  detailEmpty: { marginTop: 96 },
});
