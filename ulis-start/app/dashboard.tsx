import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Platform, ScrollView, Share, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { loadHistory } from '@/assistant/history';
import { dashboard } from '@/content';
import { filterByTrack, pct, questionCounts, summarize, toCsv, withStatuses, type IssueFilter, type TrackFilter } from '@/dashboard/stats';
import { clearIssueStatuses, loadIssueStatuses, saveIssueStatuses } from '@/dashboard/storage';
import { listFeedback, type FeedbackEntry, type FeedbackKind } from '@/feedback/storage';
import { useJourney } from '@/journey';
import type { DashboardIssue, DashboardStaff, IssueStatus, Track } from '@/types';
import {
  AppText,
  Banner,
  Button,
  Card,
  Chip,
  Columns,
  Gradient,
  ProgressBar,
  Screen,
  Select,
  useLayout,
  useTheme,
  useToast,
  type FeatherName,
} from '@/ui';

// Short role names for the table (the onboarding labels are too long for a column).
const TRACK_SHORT: Record<Track, string> = { lecturer: 'Giảng viên', specialist: 'Chuyên viên', staff: 'Người lao động' };
const TRACK_FILTERS: { id: TrackFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả đối tượng' },
  { id: 'lecturer', label: 'Giảng viên' },
  { id: 'specialist', label: 'Chuyên viên' },
  { id: 'staff', label: 'Người lao động' },
];
const STATUS_LABELS: Record<IssueStatus, string> = { open: 'Chưa xử lý', inProgress: 'Đang xử lý', resolved: 'Đã xử lý' };
const STATUS_ORDER: IssueStatus[] = ['open', 'inProgress', 'resolved'];
const ISSUE_FILTERS: { id: IssueFilter; label: string }[] = [
  { id: 'all', label: 'Tất cả trạng thái' },
  ...STATUS_ORDER.map((id) => ({ id, label: STATUS_LABELS[id] })),
];
const FEEDBACK_TOPICS: Record<FeedbackKind, string> = {
  feedback: 'Góp ý',
  question: 'Câu hỏi',
  'content-error': 'Báo nội dung sai',
};
const SELF_ID = 'SELF';

/** Feedback and questions sent from this device show up as requests in "Thủ tục vướng mắc". */
function feedbackToIssue(f: FeedbackEntry, track: Track): DashboardIssue {
  return {
    id: f.id,
    name: f.name ? `${f.name} (hồ sơ demo)` : 'Ẩn danh (hồ sơ demo)',
    track,
    topic: FEEDBACK_TOPICS[f.kind] ?? 'Khác',
    detail: f.message,
    status: 'open',
  };
}

export default function DashboardScreen() {
  const { colors, spacing, gradients, radius } = useTheme();
  const { isWide } = useLayout();
  const toast = useToast();
  const { profile, progress } = useJourney();

  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [statuses, setStatuses] = useState<Record<string, IssueStatus>>({});
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [asked, setAsked] = useState<string[]>([]);

  // Reload on focus: the user may have sent a question or chatted in another tab.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void Promise.all([loadIssueStatuses(), listFeedback(), loadHistory()]).then(([s, f, h]) => {
        if (!alive) return;
        setStatuses(s);
        setFeedback(f);
        setAsked(h.filter((m) => m.role === 'user').map((m) => m.text));
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const track: Track = profile?.track ?? 'lecturer';
  const allIssues = useMemo(
    () => withStatuses([...dashboard.issues, ...feedback.map((f) => feedbackToIssue(f, track))], statuses),
    [feedback, statuses, track],
  );
  const selfOpen = allIssues.filter((x) => x.id.startsWith('fb-') && x.status !== 'resolved').length;
  const allStaff: DashboardStaff[] = useMemo(
    () => [
      ...dashboard.staff,
      {
        id: SELF_ID,
        name: `${profile?.name ?? 'Tôi'} (hồ sơ demo)`,
        track,
        unit: profile?.unit || 'Chưa chọn đơn vị',
        done: progress.done,
        total: progress.total,
      },
    ],
    [profile, progress.done, progress.total, track],
  );

  const staff = filterByTrack(allStaff, trackFilter);
  const trackIssues = filterByTrack(allIssues, trackFilter);
  const issues = issueFilter === 'all' ? trackIssues : trackIssues.filter((x) => x.status === issueFilter);
  const summary = summarize(staff, trackIssues);
  const questions = questionCounts(dashboard.questions, asked);

  const setStatus = (id: string, status: IssueStatus) => {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    void saveIssueStatuses(next);
  };

  const exportCsv = async () => {
    const csv = toCsv(staff, (t) => TRACK_SHORT[t]);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      a.download = 'ULIS_START_dashboard_demo.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    await Share.share({ title: 'ULIS START – Dashboard', message: csv }).catch(() => undefined);
  };

  const reset = () => {
    setStatuses({});
    void clearIssueStatuses();
    toast.show('Đã đặt lại trạng thái xử lý về dữ liệu mẫu.', 'info');
  };

  const twoCol = isWide ? styles.row : null;

  return (
    <Screen back topLevel maxWidth={1280}>
      <Banner
        variant="warning"
        icon="lock"
        title="Trang dành riêng cho quản lý"
        message="Dashboard theo dõi hội nhập dành cho Phòng Tổ chức và Thanh tra. Bản demo chưa có đăng nhập và phân quyền."
        testID="dashboard-manager-notice"
      />

      {/* Header (reference `.dashboardhead`) */}
      <View style={[styles.head, { borderRadius: 21, borderColor: colors.heroBorder, marginTop: spacing.lg }]}>
        <Gradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.35 }} style={{ padding: isWide ? 27 : 20, gap: spacing.md }}>
          <View>
            <AppText variant="eyebrow">Dành cho Phòng Tổ chức và Thanh tra</AppText>
            <AppText variant="title" accessibilityRole="header" style={{ marginTop: 4 }}>
              Dashboard theo dõi hội nhập
            </AppText>
            <AppText color="textMuted">
              {`Dữ liệu giả định cho ${dashboard.staff.length} nhân sự và 1 hồ sơ trải nghiệm trên thiết bị này`}
            </AppText>
          </View>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {TRACK_FILTERS.map((f) => (
              <Chip
                key={f.id}
                label={f.label}
                selected={trackFilter === f.id}
                onPress={() => setTrackFilter(f.id)}
                accessibilityLabel={`Lọc nhóm nhân sự: ${f.label}`}
              />
            ))}
            <Chip icon="download" label="Xuất CSV" onPress={() => void exportCsv()} accessibilityLabel="Xuất bảng tiến độ ra tệp CSV" />
          </View>
        </Gradient>
      </View>

      {/* Stat row */}
      <Columns min={200} maxColumns={4} compactColumns={2} gap={spacing.md} style={{ marginTop: spacing.lg }}>
        <Stat label="Nhân sự theo dõi" value={String(summary.total)} hint="Hồ sơ trong phạm vi lọc" />
        <Stat label="Hoàn thành hội nhập" value={String(summary.completed)} hint={`${summary.completedPct}% nhân sự`} color={colors.success} />
        <Stat label="Tiến độ trung bình" value={`${summary.averagePct}%`} hint="Trên nhiệm vụ áp dụng" color={colors.primary} />
        <Stat label="Vướng mắc chưa giải quyết" value={String(summary.unresolved)} hint="Cần theo dõi" color={colors.warning} />
      </Columns>

      {/* Progress table + distribution */}
      <View style={[twoCol, { gap: spacing.lg, marginTop: spacing.lg }]}>
        <Panel title="Tiến độ từng nhân sự" right="Có thể lọc theo đối tượng" style={isWide ? styles.wide : null}>
          <Table
            columns={[
              { label: 'Nhân sự', width: 190 },
              { label: 'Đơn vị', width: 190 },
              { label: 'Đối tượng', width: 120 },
              { label: 'Hoàn thành', width: 90 },
              { label: 'Tiến độ', width: 170 },
            ]}
            rows={staff.map((x) => ({
              key: x.id,
              cells: [
                <AppText key="n" variant="caption" weight="700">
                  {x.name}
                </AppText>,
                <AppText key="u" variant="caption">
                  {x.unit}
                </AppText>,
                <AppText key="t" variant="caption">
                  {TRACK_SHORT[x.track]}
                </AppText>,
                <AppText key="d" variant="caption">{`${x.done}/${x.total}`}</AppText>,
                <View key="p" style={[styles.rowCenter, { gap: spacing.sm }]}>
                  <ProgressBar progress={x.total ? x.done / x.total : 0} style={styles.flex} accessibilityLabel={`Tiến độ ${x.name}`} />
                  <AppText variant="caption" weight="700">{`${pct(x.done, x.total)}%`}</AppText>
                </View>,
              ],
            }))}
            empty="Không có nhân sự phù hợp"
          />
        </Panel>

        <Panel title="Phân bố mức độ hoàn thành" style={isWide ? styles.narrow : null}>
          {(
            [
              ['Hoàn thành 100%', summary.distribution[0], colors.success],
              ['Từ 50% đến dưới 100%', summary.distribution[1], colors.primary],
              ['Dưới 50%', summary.distribution[2], colors.warning],
            ] as const
          ).map(([label, n, color]) => (
            <View key={label} style={[styles.rowCenter, { gap: spacing.md, marginVertical: spacing.sm }]}>
              <AppText variant="caption" style={{ width: 150 }}>
                {label}
              </AppText>
              <ProgressBar progress={summary.total ? n / summary.total : 0} color={color} style={styles.flex} accessibilityLabel={`${label}: ${n}`} />
              <AppText variant="caption" weight="800" style={{ width: 28, textAlign: 'right' }}>
                {String(n)}
              </AppText>
            </View>
          ))}
          <Banner variant="info" message="Số liệu để minh họa cách vận hành. Không phải thống kê nhân sự thực tế của Nhà trường." style={{ marginTop: spacing.md }} />
          <Button label="Trở về hành trình" variant="secondary" icon="map" fullWidth={false} onPress={() => router.navigate('/journey')} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }} />
        </Panel>
      </View>

      {/* Issues + popular questions */}
      <View style={[twoCol, { gap: spacing.lg, marginTop: spacing.lg }]}>
        <Panel title="Thủ tục vướng mắc" style={isWide ? styles.wide : null}>
          <View style={[styles.wrap, { gap: spacing.sm, marginBottom: spacing.md }]}>
            {ISSUE_FILTERS.map((f) => (
              <Chip key={f.id} label={f.label} selected={issueFilter === f.id} onPress={() => setIssueFilter(f.id)} accessibilityLabel={`Lọc trạng thái: ${f.label}`} />
            ))}
          </View>
          <Table
            columns={[
              { label: 'Người gửi', width: 170 },
              { label: 'Nhóm thủ tục', width: 140 },
              { label: 'Nội dung', width: 220 },
              { label: 'Trạng thái', width: 172, fixed: true },
            ]}
            rows={issues.map((x) => ({
              key: x.id,
              cells: [
                <AppText key="n" variant="caption" weight="700">
                  {x.name}
                </AppText>,
                <AppText key="t" variant="caption">
                  {x.topic}
                </AppText>,
                <AppText key="d" variant="caption">
                  {x.detail}
                </AppText>,
                <Select
                  key="s"
                  label={`Trạng thái ${x.id}`}
                  value={STATUS_LABELS[x.status]}
                  options={STATUS_ORDER.map((s) => STATUS_LABELS[s])}
                  onChange={(v) => {
                    const s = STATUS_ORDER.find((k) => STATUS_LABELS[k] === v);
                    if (s) setStatus(x.id, s);
                  }}
                />,
              ],
            }))}
            empty="Không có yêu cầu phù hợp"
          />
          <AppText variant="small" color="textMuted" style={{ marginTop: spacing.md }}>
            {selfOpen > 0
              ? `${selfOpen} góp ý/câu hỏi gửi từ thiết bị này đang chờ xử lý.`
              : 'Góp ý và câu hỏi gửi từ mục "Góp ý" hoặc Trợ lý sẽ xuất hiện tại đây.'}
          </AppText>
        </Panel>

        <Panel title="Câu hỏi phổ biến của nhân sự mới" style={isWide ? styles.narrow : null}>
          <AppText variant="small" color="textMuted">
            Số lượng câu hỏi là dữ liệu giả định; việc hỏi Trợ lý có thể tăng số lượt tương ứng.
          </AppText>
          {questions.map((q, i) => (
            <View
              key={q.id}
              style={[
                styles.rowCenter,
                { gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: i < questions.length - 1 ? 1 : 0, borderBottomColor: colors.border },
              ]}
            >
              <AppText variant="caption" style={styles.flex}>
                <AppText variant="caption" color="primary" weight="800">{`${i + 1}. `}</AppText>
                {q.question}
              </AppText>
              <View style={[styles.count, { backgroundColor: colors.primarySoft, borderRadius: radius.chip }]}>
                <AppText variant="small" color="primary" weight="800">{`${q.count} lượt`}</AppText>
              </View>
            </View>
          ))}
          <Button label="Thử hỏi Trợ lý" variant="secondary" icon="message-circle" fullWidth={false} onPress={() => router.navigate('/assistant')} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }} />
        </Panel>
      </View>

      {/* Suggestions */}
      <Panel title="Gợi ý nghiệp vụ cho Phòng TC&TT" style={{ marginTop: spacing.lg }}>
        <Columns min={220} maxColumns={3} gap={spacing.lg}>
          {dashboard.tips.map((t) => (
            <View key={t.title} style={{ gap: 4 }}>
              <Feather name={t.icon as FeatherName} size={22} color={colors.primary} />
              <AppText variant="bodyStrong">{t.title}</AppText>
              <AppText variant="small" color="textMuted">
                {t.body}
              </AppText>
            </View>
          ))}
        </Columns>
      </Panel>

      <Button label="Đặt lại trạng thái xử lý" variant="ghost" icon="rotate-ccw" fullWidth={false} onPress={reset} style={{ marginTop: spacing.lg, alignSelf: 'flex-start' }} />
      <AppText variant="small" color="textMuted" style={{ marginTop: spacing.lg }}>
        Lưu ý bảo mật: sản phẩm thực tế cần tài khoản đăng nhập, phân quyền, biện pháp bảo vệ dữ liệu cá nhân và quy trình xác nhận hoàn thành. Bản demo này không có cơ chế xác thực.
      </AppText>
    </Screen>
  );
}

function Stat({ label, value, hint, color }: { label: string; value: string; hint: string; color?: string }) {
  return (
    <Card accessibilityLabel={`${label}: ${value}. ${hint}`}>
      <AppText variant="small" color="textMuted">
        {label}
      </AppText>
      <AppText variant="title" weight="900" color={color} style={{ fontSize: 27, lineHeight: 38 }}>
        {value}
      </AppText>
      <AppText variant="small" color="textMuted">
        {hint}
      </AppText>
    </Card>
  );
}

function Panel({ title, right, children, style }: { title: string; right?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { spacing } = useTheme();
  return (
    <Card padding={22} style={style}>
      <View style={[styles.rowBetween, { gap: spacing.sm, marginBottom: spacing.md }]}>
        <AppText variant="h2" accessibilityRole="header">
          {title}
        </AppText>
        {right ? (
          <AppText variant="small" color="textMuted">
            {right}
          </AppText>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

interface TableProps {
  /** `fixed`: keep exactly `width` (controls like the status dropdown). */
  columns: { label: string; width: number; fixed?: boolean }[];
  rows: { key: string; cells: ReactNode[] }[];
  empty: string;
}

/** Simple table (reference `.table-wrap`): fixed column widths that grow to fill, scrolls sideways when narrow. */
function Table({ columns, rows, empty }: TableProps) {
  const { colors, spacing } = useTheme();
  const { isWide } = useLayout();
  // Wide screens: columns share the panel width by ratio. Narrow: fixed widths + sideways scroll.
  const minWidth = isWide ? undefined : columns.reduce((s, c) => s + c.width, 0);
  const sizing = (c: { width: number; fixed?: boolean } | undefined) =>
    c?.fixed ? { flexBasis: c.width, flexGrow: 0, flexShrink: 0 } : { flexBasis: isWide ? 0 : c?.width, flexGrow: c?.width ?? 1 };
  return (
    <Scroller wide={isWide}>
      <View style={{ minWidth, flexGrow: 1 }}>
        <View style={[styles.tr, { borderBottomColor: colors.border }]}>
          {columns.map((c) => (
            <View key={c.label} style={[styles.cell, { ...sizing(c), padding: spacing.sm + 4 }]}>
              <AppText variant="small" color="textMuted" weight="800" style={styles.th}>
                {c.label.toUpperCase()}
              </AppText>
            </View>
          ))}
        </View>
        {rows.length === 0 ? (
          <AppText variant="caption" color="textMuted" style={{ padding: spacing.md }}>
            {empty}
          </AppText>
        ) : (
          rows.map((r) => (
            <View key={r.key} style={[styles.tr, { borderBottomColor: colors.border }]}>
              {r.cells.map((cell, i) => (
                <View key={columns[i]?.label ?? i} style={[styles.cell, { ...sizing(columns[i]), padding: spacing.sm + 4 }]}>
                  {cell}
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </Scroller>
  );
}

/** Wide: plain block bound to the panel width. Narrow: sideways scroll for the fixed-width columns. */
function Scroller({ wide, children }: { wide: boolean; children: ReactNode }) {
  if (wide) return <View>{children}</View>;
  return (
    <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} showsHorizontalScrollIndicator>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  head: { borderWidth: 1, overflow: 'hidden' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' },
  wide: { flex: 1.8, minWidth: 0 },
  narrow: { flex: 1, minWidth: 280 },
  tr: { flexDirection: 'row', borderBottomWidth: 1, alignItems: 'center' },
  cell: { flexShrink: 1, minWidth: 0, justifyContent: 'center' },
  th: { fontSize: 11, letterSpacing: 0.8 },
  count: { paddingHorizontal: 10, paddingVertical: 4 },
});
