import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { about } from '@/content';
import {
  ONBOARDING_CARD_MAX_WIDTH,
  startOfDay,
  toDateKey,
  useJourney,
} from '@/journey';
import type { Track } from '@/types';
import { AppText, Button, Chip, Gradient, Screen, Select, TRACK_LABELS, useLayout, useTheme } from '@/ui';

// Only two tracks are offered at onboarding; 'staff' stays in the data model for old profiles.
const TRACKS: { id: Track; sub?: string; desc: string }[] = [
  { id: 'lecturer', sub: '(Giảng viên / GVTH)', desc: 'Giảng dạy, đề cương, lịch giảng, coi thi' },
  { id: 'specialist', desc: 'Văn bản, trình ký, phần mềm nghiệp vụ' },
];

const BRAND_POINTS: { icon: 'map' | 'users' | 'message-circle'; text: string }[] = [
  { icon: 'map', text: 'Lộ trình theo vị trí: khối đào tạo và khối phục vụ đào tạo' },
  { icon: 'users', text: 'Biết đúng đầu mối cho từng thủ tục' },
  { icon: 'message-circle', text: 'Trợ lý trả lời kèm nguồn văn bản' },
];

const UNITS: readonly string[] = about.staffUnits ?? [];
/** Chips shown before "Xem thêm" so the form keeps its layout. */
const UNIT_CHIPS_COLLAPSED = 6;

export default function OnboardingScreen() {
  const { colors, gradients, radius, spacing } = useTheme();
  const { actions } = useJourney();
  const { isCompact, isWide } = useLayout();
  const [name, setName] = useState('');
  const [track, setTrack] = useState<Track | null>(null);
  const [unit, setUnit] = useState('');
  const [showAllUnits, setShowAllUnits] = useState(false);

  // Everyone starts today (Day 1); the start date can still be changed in Cài đặt demo.
  const startDate = startOfDay(new Date());
  const canSubmit = name.trim().length > 0 && track !== null;
  const visibleUnits = showAllUnits ? UNITS : UNITS.slice(0, UNIT_CHIPS_COLLAPSED);

  const submit = () => {
    if (!canSubmit || track === null) return;
    actions.setProfile({
      name: name.trim(),
      track,
      unit: unit.trim(),
      startDate: toDateKey(startDate),
      createdAt: new Date().toISOString(),
    });
    // Stack.Protected in the root layout switches to the tabs once a profile exists.
  };

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, borderRadius: radius.input },
  ];

  const submitButton = (
    <Button
      label="Bắt đầu hành trình"
      icon="arrow-right"
      iconRight
      fullWidth
      disabled={!canSubmit}
      onPress={submit}
      accessibilityLabel="Bắt đầu hành trình"
      accessibilityHint={canSubmit ? undefined : 'Vui lòng nhập họ tên và chọn vị trí trước'}
    />
  );

  const form = (
      <View style={{ gap: spacing.xl }}>
        <View style={styles.field}>
          <AppText variant="bodyStrong">Họ và tên</AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ví dụ: Nguyễn Minh An"
            placeholderTextColor={colors.textMuted}
            style={inputStyle}
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Họ và tên"
          />
        </View>

        <View style={styles.field}>
          <AppText variant="bodyStrong">Vị trí của bạn</AppText>
          {/* Both start neutral (no default); the tapped one turns rose filled like the reference `.role-tab`. */}
          <View style={[styles.wrap, { gap: spacing.md - 1 }]} accessibilityRole="radiogroup">
            {TRACKS.map((t) => {
              const selected = track === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTrack(t.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Chọn vị trí: ${TRACK_LABELS[t.id]}`}
                  style={[
                    styles.roleTab,
                    {
                      borderColor: selected ? colors.primary : colors.chipBorder,
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderRadius: radius.button + 1,
                      shadowColor: colors.primary,
                    },
                    selected ? styles.roleTabShadow : null,
                  ]}
                >
                  <View style={styles.roleText}>
                    <AppText variant="bodyStrong" weight="800" align="center" color={selected ? 'primaryFg' : 'navText'}>
                      {TRACK_LABELS[t.id]}
                    </AppText>
                    {t.sub ? (
                      <AppText variant="caption" align="center" color={selected ? 'primaryFg' : 'navText'}>
                        {t.sub}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <AppText variant="caption" color="textMuted">
            {TRACKS.find((t) => t.id === track)?.desc ?? 'Chọn khối của bạn để nhận lộ trình phù hợp.'}
          </AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="bodyStrong">Đơn vị công tác</AppText>
          <Select value={unit} options={UNITS} onChange={setUnit} label="Đơn vị công tác" placeholder="Chọn đơn vị của bạn" />
          <View style={styles.wrap}>
            {visibleUnits.map((u) => (
              <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} accessibilityLabel={`Chọn đơn vị: ${u}`} />
            ))}
            {UNITS.length > UNIT_CHIPS_COLLAPSED ? (
              <Chip
                label={showAllUnits ? 'Thu gọn' : `Xem thêm (${UNITS.length - UNIT_CHIPS_COLLAPSED})`}
                icon={showAllUnits ? 'chevron-up' : 'chevron-down'}
                onPress={() => setShowAllUnits((v) => !v)}
                accessibilityLabel={showAllUnits ? 'Thu gọn danh sách đơn vị' : 'Xem thêm đơn vị'}
              />
            ) : null}
          </View>
        </View>

        <AppText variant="caption" color="textMuted">
          Thông tin chỉ lưu trên máy của bạn. Bạn có thể đổi vị trí sau trong Khám phá → Cài đặt demo.
        </AppText>
      </View>
  );

  // Wide desktop (web ≥ 1024): brand panel on the left, centered form card on the right.
  if (isWide) {
    return (
      <View style={[styles.wideRoot, { backgroundColor: colors.bg }]}>
        <Gradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.brandPanel, { padding: spacing.xxl }]}
        >
          <View style={[styles.brandIcon, { backgroundColor: colors.surface, borderRadius: radius.card }]}>
            <Feather name="compass" size={36} color={colors.primary} />
          </View>
          <AppText variant="title" color="primaryFg" style={styles.brandTitle}>
            ULIS START
          </AppText>
          <AppText variant="h2" color="primaryFg" weight="500">
            Một nơi để BIẾT – một nơi để LÀM – một nơi để HỎI
          </AppText>
          <AppText color="primaryFg" style={{ opacity: 0.85, marginTop: spacing.lg }}>
            Hành trình 30 ngày đồng hành cùng cán bộ mới của Trường Đại học Ngoại ngữ – ĐHQGHN: biết cần làm gì, làm ở
            đâu và hỏi ai.
          </AppText>
          <View style={{ gap: spacing.md, marginTop: spacing.xl }}>
            {BRAND_POINTS.map((p) => (
              <View key={p.text} style={styles.brandPoint}>
                <Feather name={p.icon} size={18} color={colors.accent} />
                <AppText color="primaryFg" style={styles.flex}>
                  {p.text}
                </AppText>
              </View>
            ))}
          </View>
        </Gradient>
        <ScrollView style={styles.flex} contentContainerStyle={[styles.formScroll, { padding: spacing.xxl }]} keyboardShouldPersistTaps="handled">
          <View
            style={[
              styles.formCard,
              {
                maxWidth: ONBOARDING_CARD_MAX_WIDTH,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.card + 4,
                padding: spacing.xl,
                gap: spacing.xl,
              },
            ]}
          >
            <View style={{ gap: spacing.xs }}>
              <AppText variant="title" accessibilityRole="header">
                Chào mừng đến ULIS START
              </AppText>
              <AppText color="textMuted">Chỉ mất 30 giây để bắt đầu hành trình của bạn.</AppText>
            </View>
            {form}
            {submitButton}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <Screen
      keyboard
      title="Chào mừng đến ULIS START"
      subtitle="Hành trình 30 ngày đồng hành cùng cán bộ mới. Chỉ mất 30 giây để bắt đầu."
      footer={submitButton}
      contentContainerStyle={isCompact ? undefined : { width: '100%', maxWidth: ONBOARDING_CARD_MAX_WIDTH, alignSelf: 'center' }}
    >
      {form}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wideRoot: { flex: 1, flexDirection: 'row' },
  brandPanel: { width: '42%', maxWidth: 560, justifyContent: 'center' },
  brandIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  brandTitle: { marginBottom: 8 },
  brandPoint: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  formCard: { width: '100%', borderWidth: StyleSheet.hairlineWidth },
  field: { gap: 8 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, lineHeight: 22, minHeight: 48 },
  roleTab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 20, minWidth: 150, minHeight: 48, flexGrow: 1 },
  roleText: { alignItems: 'center', flexShrink: 1 },
  roleTabShadow: { shadowOpacity: 0.19, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
});
