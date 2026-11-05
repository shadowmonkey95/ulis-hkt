import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { getContact } from '@/content';
import { CHECKIN_SCALE, CHECKINS, FORM_MAX_WIDTH, LOW_SCORE_THRESHOLD, isCheckinDay, successHaptic, useJourney } from '@/journey';
import type { CheckinScore } from '@/types';
import { AppText, Button, Card, ContactCard, EmptyState, Screen, useLayout, useTheme, useToast } from '@/ui';

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

interface FrameProps {
  children: ReactNode;
  footer?: ReactNode;
  keyboard?: boolean;
}

/**
 * Phones / narrow web: full-screen modal sheet (unchanged).
 * Desktop web (≥ 768): the route is presented as `transparentModal` (see app/_layout.tsx), so we draw a
 * dimmed backdrop and a centered dialog; Esc or a click on the backdrop closes it.
 */
function CheckinFrame({ children, footer, keyboard }: FrameProps) {
  const { colors, spacing, radius } = useTheme();
  const { isCompact } = useLayout();
  const dialog = !isCompact;

  useEffect(() => {
    if (!dialog || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog]);

  if (!dialog) {
    return (
      <Screen back onBack={close} keyboard={keyboard} footer={footer}>
        {children}
      </Screen>
    );
  }
  return (
    <View style={styles.backdropWrap}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Đóng khảo sát"
      />
      <View
        accessibilityViewIsModal
        accessibilityRole="none"
        style={[
          styles.dialog,
          { maxWidth: FORM_MAX_WIDTH - 80, backgroundColor: colors.surface, borderRadius: radius.card + 4, borderColor: colors.border },
        ]}
      >
        <View style={[styles.dialogBar, { paddingHorizontal: spacing.md, borderBottomColor: colors.border }]}>
          <View style={styles.flex} />
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Đóng khảo sát"
            hitSlop={8}
            style={styles.closeBtn}
          >
            <Feather name="x" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.md }} keyboardShouldPersistTaps="handled">
          {children}
          {footer ? <View style={{ marginTop: spacing.xl }}>{footer}</View> : null}
        </ScrollView>
      </View>
    </View>
  );
}

export default function CheckinScreen() {
  const { day: dayParam } = useLocalSearchParams<{ day: string }>();
  const { colors, spacing, radius } = useTheme();
  const { state, actions, helpContactId } = useJourney();
  const toast = useToast();
  const day = Number(dayParam);
  const previous = isCheckinDay(day) ? state.checkins[day] : undefined;
  const [score, setScore] = useState<CheckinScore | null>(previous?.score ?? null);
  const [note, setNote] = useState(previous?.note ?? '');
  const [submittedLow, setSubmittedLow] = useState(false);

  if (!isCheckinDay(day)) {
    return (
      <CheckinFrame>
        <EmptyState icon="alert-circle" title="Không có khảo sát cho ngày này" />
      </CheckinFrame>
    );
  }

  const meta = CHECKINS[day];
  const contact = getContact(helpContactId);

  const submit = () => {
    if (score === null) return;
    actions.checkin(day, score, note);
    successHaptic();
    if (score <= LOW_SCORE_THRESHOLD) {
      setSubmittedLow(true);
      return;
    }
    toast.show('Cảm ơn bạn đã chia sẻ!', 'success');
    close();
  };

  if (submittedLow) {
    return (
      <CheckinFrame footer={<Button label="Đóng" variant="secondary" onPress={close} />}>
        <View style={{ gap: spacing.lg }}>
          <AppText variant="title" accessibilityRole="header">
            Cảm ơn bạn đã chia sẻ
          </AppText>
          <AppText>
            Có vẻ mọi việc chưa thật suôn sẻ. Bạn không cần tự xoay xở một mình – đầu mối dưới đây sẵn sàng hỗ trợ bạn.
          </AppText>
          {contact ? (
            <ContactCard
              contact={contact}
              onPress={() => {
                router.back();
                router.push({ pathname: '/contacts/[id]', params: { id: contact.id } });
              }}
            />
          ) : null}
          <AppText variant="caption" color="textMuted">
            Câu trả lời được lưu trên máy của bạn và chỉ dùng để tổng hợp ẩn danh cho Phòng TCTT.
          </AppText>
        </View>
      </CheckinFrame>
    );
  }

  return (
    <CheckinFrame
      keyboard
      footer={
        <Button
          label={previous ? 'Cập nhật câu trả lời' : 'Gửi'}
          icon="send"
          disabled={score === null}
          onPress={submit}
          accessibilityLabel="Gửi khảo sát nhanh"
          accessibilityHint={score === null ? 'Vui lòng chọn một mức cảm nhận trước' : undefined}
        />
      }
    >
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="small" color="primary" weight="700">
            {`KHẢO SÁT NHANH · NGÀY ${day}`}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {meta.question}
          </AppText>
        </View>

        <View style={styles.scale} accessibilityRole="radiogroup">
          {CHECKIN_SCALE.map((s) => {
            const selected = score === s.score;
            return (
              <Pressable
                key={s.score}
                onPress={() => setScore(s.score)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Chọn mức ${s.score}: ${s.label}`}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primarySoft : colors.surface,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <AppText style={styles.emoji}>{s.emoji}</AppText>
                <AppText variant="small" align="center" color={selected ? 'primary' : 'textMuted'}>
                  {s.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">{meta.notePrompt}</AppText>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Viết vài dòng…"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={meta.notePrompt}
            style={[
              styles.input,
              { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, borderRadius: radius.input },
            ]}
          />
        </View>

        <Card tone="muted">
          <View style={[styles.row, { gap: spacing.sm }]}>
            <Feather name="lock" size={16} color={colors.textMuted} />
            <AppText variant="caption" color="textMuted" style={styles.flex}>
              Câu trả lời lưu trên máy của bạn; (khi triển khai) chỉ được tổng hợp ẩn danh cho Phòng TCTT.
            </AppText>
          </View>
        </Card>
      </View>
    </CheckinFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdropWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxHeight: '90%', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  dialogBar: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  scale: { flexDirection: 'row', gap: 6 },
  option: { flex: 1, alignItems: 'center', gap: 4, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 2, minHeight: 84 },
  emoji: { fontSize: 28, lineHeight: 40 },
  input: { borderWidth: 1, minHeight: 96, padding: 12, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
});
