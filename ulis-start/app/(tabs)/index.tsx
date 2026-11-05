import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { memo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPhase } from '@/content';
import {
  BADGES,
  CHECKINS,
  MEDIUM_COLUMN_MAX_WIDTH,
  ProgressSummary,
  givenName,
  sliceTodayTasks,
  useJourney,
  useTaskToggle,
} from '@/journey';
import type { Task, TaskStatus } from '@/types';
import { AppText, Banner, CONTENT_MAX_WIDTH, Card, Chip, EmptyState, HeroCard, ProgressRing, TaskRow, useLayout, useTheme } from '@/ui';

type ShortcutIcon = 'book' | 'users' | 'folder' | 'message-circle';
const SHORTCUTS: { label: string; icon: ShortcutIcon; href: Href }[] = [
  { label: 'Cẩm nang', icon: 'book', href: '/guide' },
  { label: 'Danh bạ', icon: 'users', href: '/contacts' },
  { label: 'Tài liệu', icon: 'folder', href: '/library' },
  { label: 'Hỏi trợ lý', icon: 'message-circle', href: '/assistant' },
];

interface RowProps {
  task: Task;
  status: TaskStatus;
  currentDay: number;
  phaseStartDay?: number;
  isLast: boolean;
  onToggle: (task: Task) => void;
}

const TodayRow = memo(function TodayRow({ task, status, currentDay, phaseStartDay, isLast, onToggle }: RowProps) {
  return (
    <TaskRow
      task={task}
      status={status}
      currentDay={currentDay}
      phaseStartDay={phaseStartDay}
      divider={!isLast}
      onToggle={() => onToggle(task)}
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
    />
  );
});

export default function TodayScreen() {
  const { colors, spacing, radius } = useTheme();
  const {
    profile,
    currentDay,
    currentPhase,
    isDemoDay,
    progress,
    dueTasks,
    overdueTasks,
    health,
    helpContactId,
    pendingCheckin,
    nextMilestone,
    statusOf,
    phases,
    unlockedBadges,
  } = useJourney();
  const toggle = useTaskToggle();
  const { isCompact, isWide } = useLayout();
  // Phones / narrow web: 3 tasks (spec). Wide desktop: up to 5.
  const { visible: todayTasks, hidden: hiddenCount } = sliceTodayTasks(dueTasks, isWide);

  const name = profile ? givenName(profile.name) : '';
  const nextPhase = phases.find((p) => p.order === currentPhase.order + 1);

  // Soft gradient hero (reference `.hero`): ink greeting with the name in rose, ring on the right.
  const hero = (
    <HeroCard>
      <View style={[styles.hero, { gap: spacing.lg }]}>
        <View style={styles.flex}>
          <Pressable
            onLongPress={() => router.push('/demo')}
            delayLongPress={600}
            accessibilityRole="header"
            accessibilityLabel={`Chào ${name}`}
            accessibilityHint="Nhấn giữ để mở chế độ trình diễn"
            accessibilityActions={[{ name: 'longpress', label: 'Mở chế độ trình diễn' }]}
            onAccessibilityAction={(e) => {
              if (e.nativeEvent.actionName === 'longpress') router.push('/demo');
            }}
          >
            <AppText style={isWide ? styles.greetWide : styles.greet}>
              {'Chào '}
              <AppText color="primary" style={isWide ? styles.greetWide : styles.greet}>
                {name}
              </AppText>
              {'!'}
            </AppText>
          </Pressable>
          {isWide ? (
            <AppText color="textMuted" style={{ marginTop: spacing.sm }}>
              {`Mục tiêu giai đoạn: ${currentPhase.goal}`}
            </AppText>
          ) : null}
        </View>
        <ProgressRing
          progress={progress.total ? progress.done / progress.total : 0}
          size={isWide ? 132 : 92}
          strokeWidth={isWide ? 12 : 9}
          color={colors.primary}
          trackColor={colors.border}
          labelColor={colors.text}
          sublabel="hoàn thành"
          accessibilityLabel={`Tiến độ ${progress.pct}%, ${progress.done} trên ${progress.total} việc bắt buộc`}
        />
      </View>
    </HeroCard>
  );

  const progressCard = <ProgressSummary progress={progress} track={profile?.track} />;

  const demoChip = isDemoDay ? (
    <Chip
      label="Chế độ trình diễn"
      icon="sliders"
      onPress={() => router.push('/demo')}
      accessibilityLabel="Đang ở chế độ trình diễn, mở bảng điều khiển"
    />
  ) : null;

  const overdueBanner =
    health !== 'onTrack' ? (
      <Banner
        variant={health === 'needsHelp' ? 'danger' : 'warning'}
        title={health === 'needsHelp' ? `Bạn còn ${overdueTasks.length} việc nên làm sớm – cần hỗ trợ?` : undefined}
        message={
          health === 'needsHelp'
            ? 'Đừng lo, ai cũng cần thời gian. Liên hệ đầu mối để được hỗ trợ.'
            : `Bạn còn ${overdueTasks.length} việc nên làm sớm. Hãy xử lý khi có thể nhé.`
        }
        actionLabel={health === 'needsHelp' ? 'Liên hệ hỗ trợ' : 'Xem hành trình'}
        onAction={() =>
          health === 'needsHelp'
            ? router.push({ pathname: '/contacts/[id]', params: { id: helpContactId } })
            : router.push('/journey')
        }
      />
    ) : null;

  const sectionTitle = (
    <AppText variant="h2" accessibilityRole="header">
      Việc của hôm nay
    </AppText>
  );

  const moreLink =
    hiddenCount > 0 ? (
      <Pressable
        onPress={() => router.push('/journey')}
        accessibilityRole="link"
        accessibilityLabel={`Xem thêm ${hiddenCount} việc cần làm trong hành trình`}
        style={styles.moreLink}
      >
        <AppText variant="bodyStrong" color="primary">
          {`+${hiddenCount} việc khác cần làm`}
        </AppText>
        <Feather name="arrow-right" size={16} color={colors.primary} />
      </Pressable>
    ) : null;

  const checkinCard =
    pendingCheckin !== null ? (
      <Card
        tone="accent"
        onPress={() => router.push({ pathname: '/checkin/[day]', params: { day: String(pendingCheckin) } })}
        accessibilityLabel={`Trả lời khảo sát nhanh: ${CHECKINS[pendingCheckin].question}`}
      >
        <View style={[styles.row, { gap: spacing.md }]}>
          <Feather name="smile" size={28} color={colors.warning} />
          <View style={styles.flex}>
            <AppText variant="caption" color="textMuted">Khảo sát nhanh</AppText>
            <AppText variant="bodyStrong">{CHECKINS[pendingCheckin].question}</AppText>
            <AppText variant="caption" color="primary">
              Trả lời trong 5 giây →
            </AppText>
          </View>
        </View>
      </Card>
    ) : null;

  // Phones / medium: row of 4 tiles.
  const shortcutTiles = (
    <View style={[styles.shortcuts, { gap: spacing.sm }]}>
      {SHORTCUTS.map((s, i) => (
        <Pressable
          key={s.label}
          onPress={() => router.push(s.href)}
          accessibilityRole="button"
          accessibilityLabel={`Mở ${s.label}`}
          style={({ pressed }) => [
            styles.shortcut,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: colors.tiles[i % colors.tiles.length] }]}>
            <Feather name={s.icon} size={20} color={colors.primary} />
          </View>
          <AppText variant="small" align="center" weight="600">
            {s.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );

  // Wide desktop: vertical list with hover feedback.
  const shortcutList = (
    <Card padding={spacing.sm}>
      <AppText variant="caption" color="textMuted" weight="700" style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.xs }}>
        LỐI TẮT
      </AppText>
      {SHORTCUTS.map((s, i) => (
        <Pressable
          key={s.label}
          onPress={() => router.push(s.href)}
          accessibilityRole="link"
          accessibilityLabel={`Mở ${s.label}`}
          style={(state) => {
            // react-native-web adds `hovered` to the Pressable state.
            const hovered = Boolean((state as { hovered?: boolean }).hovered);
            return [
              styles.shortcutRow,
              {
                borderRadius: radius.sm,
                paddingHorizontal: spacing.sm,
                backgroundColor: state.pressed || hovered ? colors.surfaceAlt : 'transparent',
              },
            ];
          }}
        >
          <View style={[styles.shortcutIconSmall, { backgroundColor: colors.tiles[i % colors.tiles.length] }]}>
            <Feather name={s.icon} size={18} color={colors.primary} />
          </View>
          <AppText variant="bodyStrong" style={styles.flex}>
            {s.label}
          </AppText>
          <Feather name="chevron-right" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </Card>
  );

  const milestoneCard = nextMilestone ? (
    <Card tone="muted">
      <View style={[styles.row, { gap: spacing.md }]}>
        <Feather name={BADGES[nextMilestone.badge].icon} size={24} color={colors.accent} />
        <AppText style={styles.flex}>
          {nextMilestone.badge === 'connected'
            ? `Còn ${nextMilestone.remaining} bước để đạt huy hiệu ${BADGES.connected.title} (xem danh bạ, gặp người đồng hành)`
            : `Còn ${nextMilestone.remaining} việc để đạt huy hiệu ${BADGES[nextMilestone.badge].title}`}
        </AppText>
      </View>
    </Card>
  ) : null;

  const badgesCard = (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="caption" color="textMuted" weight="700">
          {`HUY HIỆU ĐÃ ĐẠT · ${unlockedBadges.length}/${Object.keys(BADGES).length}`}
        </AppText>
        {unlockedBadges.length === 0 ? (
          <AppText variant="caption" color="textMuted">
            Hoàn thành việc đầu tiên để nhận huy hiệu Khởi động.
          </AppText>
        ) : (
          <View style={[styles.row, { gap: spacing.sm }]}>
            {unlockedBadges.map((b) => (
              <Chip key={b} label={BADGES[b].title} icon={BADGES[b].icon} color={colors.accent} />
            ))}
          </View>
        )}
      </View>
    </Card>
  );

  const emptyState = (
    <EmptyState
      icon="check-circle"
      title="Hôm nay bạn đã xong việc!"
      message={nextPhase ? `Giai đoạn tiếp theo: ${nextPhase.title}` : undefined}
      actionLabel="Xem trước giai đoạn tiếp theo →"
      onAction={() => router.push('/journey')}
    />
  );

  const renderTask = (item: Task, index: number) => (
    <View
      key={item.id}
      style={[
        styles.rowCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          paddingHorizontal: spacing.sm,
          borderTopLeftRadius: index === 0 ? radius.card : 0,
          borderTopRightRadius: index === 0 ? radius.card : 0,
          borderBottomLeftRadius: index === todayTasks.length - 1 ? radius.card : 0,
          borderBottomRightRadius: index === todayTasks.length - 1 ? radius.card : 0,
        },
      ]}
    >
      <TodayRow
        task={item}
        status={statusOf(item.id)}
        currentDay={currentDay}
        phaseStartDay={getPhase(item.phaseId)?.startDay}
        isLast={index === todayTasks.length - 1}
        onToggle={toggle}
      />
    </View>
  );

  // Wide desktop (web ≥ 1024): full-width hero, then 2/3 tasks + 1/3 side cards.
  if (isWide) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={[
            styles.wideContent,
            { padding: spacing.xl, paddingBottom: spacing.xxl * 2, gap: spacing.xl, maxWidth: CONTENT_MAX_WIDTH },
          ]}
        >
          {hero}
          {demoChip}
          {progressCard}
          <View style={[styles.wideColumns, { gap: spacing.xl }]}>
            <View style={[styles.mainCol, { gap: spacing.lg }]}>
              {overdueBanner}
              {sectionTitle}
              {todayTasks.length > 0 ? <View>{todayTasks.map(renderTask)}</View> : emptyState}
              {moreLink}
            </View>
            <View style={[styles.sideCol, { gap: spacing.lg }]}>
              {checkinCard}
              {milestoneCard}
              {badgesCard}
              {shortcutList}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Phones / narrow web (unchanged) and medium web (same single column, wider + centered).
  const header = (
    <View style={{ gap: spacing.lg }}>
      {hero}
      {demoChip}
      {progressCard}
      {overdueBanner}
      {sectionTitle}
    </View>
  );

  const footer = (
    <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
      {moreLink}
      {checkinCard}
      {shortcutTiles}
      {milestoneCard}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]}>
      <FlatList
        data={todayTasks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={[
          { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
          isCompact ? null : { width: '100%', maxWidth: MEDIUM_COLUMN_MAX_WIDTH, alignSelf: 'center', padding: spacing.xl },
        ]}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: spacing.sm }}
        ListFooterComponent={footer}
        ListEmptyComponent={emptyState}
        renderItem={({ item, index }) => renderTask(item, index)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  hero: { flexDirection: 'row', alignItems: 'center' },
  greet: { fontSize: 28, lineHeight: 38, fontWeight: '800', letterSpacing: -0.4 },
  greetWide: { fontSize: 32, lineHeight: 42, fontWeight: '800', letterSpacing: -0.6 },
  rowCard: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth },
  moreLink: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  shortcuts: { flexDirection: 'row' },
  shortcut: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, borderWidth: StyleSheet.hairlineWidth, minHeight: 84 },
  shortcutIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  shortcutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 6 },
  shortcutIconSmall: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  wideContent: { width: '100%', alignSelf: 'center' },
  wideColumns: { flexDirection: 'row', alignItems: 'flex-start' },
  mainCol: { flex: 2, minWidth: 0 },
  sideCol: { flex: 1, minWidth: 280 },
});
