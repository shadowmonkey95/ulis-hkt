import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  DEMO_MAX_DAY,
  DEMO_MIN_DAY,
  HEALTH_LABELS,
  addDays,
  dayCounterLabel,
  daysBetween,
  formatDateVi,
  getCurrentDay,
  parseLocalDate,
  startOfDay,
  toDateKey,
  useJourney,
  FORM_MAX_WIDTH,
} from '@/journey';
import type { Track } from '@/types';
import { AppText, Banner, Button, Card, Chip, Screen, TRACK_LABELS, useLayout, useTheme, useToast } from '@/ui';

const QUICK_DAYS = [0, 1, 5, 9, 20, 30];
const TRACKS: Track[] = ['lecturer', 'specialist'];
/** Start-date presets, as offsets from today (start = today + offset). */
const START_PRESETS: { label: string; offset: number }[] = [
  { label: 'Hôm nay', offset: 0 },
  { label: 'Ngày mai', offset: 1 },
  { label: '1 tuần nữa', offset: 7 },
  { label: '9 ngày trước', offset: -9 },
];

export default function DemoScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useLayout();
  const { profile, currentDay, isDemoDay, currentPhase, progress, health, tasks, actions } = useJourney();
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);

  const setDay = (d: number) => actions.setDemoDay(d);

  const switchTrack = (track: Track) => {
    if (!profile || profile.track === track) return;
    actions.setProfile({ ...profile, track });
    toast.show(`Đã chuyển sang vị trí ${TRACK_LABELS[track]}`, 'info');
  };

  const today = startOfDay(new Date());
  const startOffset = profile ? daysBetween(today, parseLocalDate(profile.startDate)) : 1;
  const realDay = profile ? getCurrentDay(profile, today) : 0;

  const setStartOffset = (offset: number) => {
    if (!profile) return;
    actions.setProfile({ ...profile, startDate: toDateKey(addDays(today, offset)) });
    // A new start date only shows up when the real date drives the journey.
    if (isDemoDay) actions.setDemoDay(null);
    toast.show('Đã đổi ngày đầu đi làm – tiến độ được giữ nguyên', 'info');
  };

  const fullReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    // Clearing the profile flips the root Stack.Protected guard → onboarding.
    actions.reset();
  };

  const stepBtn = (delta: number, icon: 'minus' | 'plus', label: string) => {
    const disabled = delta < 0 ? currentDay <= DEMO_MIN_DAY : currentDay >= DEMO_MAX_DAY;
    return (
      <Pressable
        onPress={() => setDay(currentDay + delta)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[styles.stepBtn, { borderColor: colors.primary, borderRadius: radius.pill, opacity: disabled ? 0.4 : 1 }]}
      >
        <Feather name={icon} size={22} color={colors.primary} />
      </Pressable>
    );
  };

  return (
    <Screen
      back
      title="Chế độ trình diễn"
      subtitle="Dành cho buổi demo: nhảy ngày, đổi vị trí, đặt lại dữ liệu."
      contentContainerStyle={isCompact ? undefined : { width: '100%', maxWidth: FORM_MAX_WIDTH, alignSelf: 'center' }}
    >
      <View style={{ gap: spacing.lg }}>
        <Banner
          variant="info"
          message="Các thay đổi ở đây chỉ dùng để trình diễn và lưu trên máy này."
        />

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="h2" accessibilityRole="header">
              Ngày trong hành trình
            </AppText>
            <View style={[styles.row, { gap: spacing.md }]}>
              {stepBtn(-1, 'minus', 'Lùi một ngày')}
              <View style={[styles.flex, styles.center]}>
                <AppText variant="title" align="center" accessibilityLiveRegion="polite">
                  {`Ngày ${currentDay}`}
                </AppText>
                <AppText variant="caption" color="textMuted" align="center">
                  {`${dayCounterLabel(currentDay)} · ${currentPhase.title}`}
                </AppText>
              </View>
              {stepBtn(1, 'plus', 'Tiến một ngày')}
            </View>
            <View style={[styles.wrap, { gap: spacing.sm }]}>
              {QUICK_DAYS.map((d) => (
                <Chip
                  key={d}
                  label={`Ngày ${d}`}
                  selected={isDemoDay && currentDay === d}
                  onPress={() => setDay(d)}
                  accessibilityLabel={`Nhảy tới ngày ${d}`}
                />
              ))}
            </View>
            <Button
              label={isDemoDay ? 'Dùng ngày thực tế' : 'Đang dùng ngày thực tế'}
              icon="calendar"
              variant="ghost"
              disabled={!isDemoDay}
              onPress={() => actions.setDemoDay(null)}
              accessibilityLabel="Bỏ ngày trình diễn, dùng ngày thực tế"
            />
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="h2" accessibilityRole="header">
              Vị trí (lộ trình)
            </AppText>
            <View style={[styles.wrap, { gap: spacing.sm }]}>
              {TRACKS.map((t) => (
                <Chip
                  key={t}
                  label={TRACK_LABELS[t]}
                  selected={profile?.track === t}
                  onPress={() => switchTrack(t)}
                  accessibilityLabel={`Chuyển vị trí sang ${TRACK_LABELS[t]}`}
                />
              ))}
            </View>
            <AppText variant="caption" color="textMuted">
              Việc chung đã hoàn thành được giữ nguyên khi đổi vị trí.
            </AppText>
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="h2" accessibilityRole="header">
              Ngày đầu đi làm
            </AppText>
            <View style={[styles.row, { gap: spacing.md }]}>
              <Pressable
                onPress={() => setStartOffset(startOffset - 1)}
                accessibilityRole="button"
                accessibilityLabel="Lùi ngày đầu đi làm một ngày"
                style={[styles.stepBtn, { borderColor: colors.primary, borderRadius: radius.pill }]}
              >
                <Feather name="minus" size={22} color={colors.primary} />
              </Pressable>
              <View style={[styles.flex, styles.center]}>
                <AppText variant="bodyStrong" align="center" accessibilityLiveRegion="polite">
                  {profile ? formatDateVi(profile.startDate) : ''}
                </AppText>
                <AppText variant="caption" color="textMuted" align="center">
                  {`Theo ngày thực tế: ${realDay >= 1 ? dayCounterLabel(realDay) : `ngày ${realDay} (trước ngày đầu)`}`}
                </AppText>
              </View>
              <Pressable
                onPress={() => setStartOffset(startOffset + 1)}
                accessibilityRole="button"
                accessibilityLabel="Tiến ngày đầu đi làm một ngày"
                style={[styles.stepBtn, { borderColor: colors.primary, borderRadius: radius.pill }]}
              >
                <Feather name="plus" size={22} color={colors.primary} />
              </Pressable>
            </View>
            <View style={[styles.wrap, { gap: spacing.sm }]}>
              {START_PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  selected={startOffset === p.offset}
                  onPress={() => setStartOffset(p.offset)}
                  accessibilityLabel={`Đặt ngày đầu đi làm: ${p.label}`}
                />
              ))}
            </View>
            <AppText variant="caption" color="textMuted">
              Đổi ngày đầu sẽ tắt ngày trình diễn và tính lại hành trình theo ngày thực tế; việc đã hoàn thành được giữ nguyên.
            </AppText>
          </View>
        </Card>

        <Card tone="muted">
          <AppText variant="caption" color="textMuted">
            {`${profile?.name ?? ''} · ${tasks.length} việc trong lộ trình · ${progress.done}/${progress.total} việc bắt buộc (${progress.pct}%) · ${HEALTH_LABELS[health]}`}
          </AppText>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button
            label="Hoàn thành ngẫu nhiên 50%"
            icon="shuffle"
            variant="secondary"
            onPress={() => {
              actions.completeRandomHalf();
              toast.show('Đã đánh dấu ngẫu nhiên một nửa số việc còn lại', 'info');
            }}
          />
          <Button
            label="Đặt lại tiến độ (giữ hồ sơ)"
            icon="rotate-ccw"
            variant="secondary"
            onPress={() => {
              actions.resetProgress();
              toast.show('Đã đặt lại tiến độ', 'info');
            }}
          />
          <Button
            label={confirmReset ? 'Nhấn lần nữa để xác nhận đặt lại' : 'Đặt lại toàn bộ'}
            icon="trash-2"
            variant="danger"
            onPress={fullReset}
            accessibilityHint="Xóa hồ sơ và tiến độ, quay về màn hình bắt đầu"
          />
          <Button label="Về Hôm nay" icon="sun" variant="ghost" onPress={() => router.navigate('/')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  stepBtn: { width: 48, height: 48, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
