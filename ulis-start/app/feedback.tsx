import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { addFeedback, listFeedback, type FeedbackKind } from '@/feedback/storage';
import { useJourney } from '@/journey';
import { AppText, Button, Card, Chip, Screen, useTheme } from '@/ui';

const KINDS: { id: FeedbackKind; label: string; placeholder: string }[] = [
  { id: 'feedback', label: 'Góp ý', placeholder: 'Điều gì nên cải thiện cho người mới sau bạn?' },
  { id: 'question', label: 'Câu hỏi', placeholder: 'Bạn chưa tìm thấy câu trả lời cho điều gì?' },
  { id: 'content-error', label: 'Báo nội dung sai', placeholder: 'Thông tin nào trong ứng dụng chưa đúng hoặc đã cũ?' },
];

const MIN_LENGTH = 5;

export default function FeedbackScreen() {
  const { colors, spacing, radius, type } = useTheme();
  const { profile } = useJourney();
  const [kind, setKind] = useState<FeedbackKind>('feedback');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    void listFeedback().then((all) => {
      if (alive) setCount(all.length);
    });
    return () => {
      alive = false;
    };
  }, [sent]);

  const current = KINDS.find((k) => k.id === kind) ?? KINDS[0];
  const valid = message.trim().length >= MIN_LENGTH;

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    try {
      await addFeedback({ kind, message: message.trim(), anonymous, origin: 'feedback', name: profile?.name });
      setSent(true);
      setMessage('');
    } catch {
      setError('Chưa lưu được góp ý. Vui lòng thử lại.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen back topLevel maxWidth={640}>
        <View style={[styles.success, { gap: spacing.md, paddingTop: spacing.xxl }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.successSoft }]}>
            <Feather name="check-circle" size={40} color={colors.success} />
          </View>
          <AppText variant="title" align="center" accessibilityRole="header">
            Cảm ơn bạn!
          </AppText>
          <AppText color="textMuted" align="center">
            Góp ý của bạn đã được lưu. Phòng Tổ chức và Thanh tra sẽ tổng hợp để hoàn thiện hành trình cho cán bộ mới.
          </AppText>
          <AppText variant="caption" color="textMuted" align="center">
            {`Bạn đã gửi ${count} góp ý/ câu hỏi trên thiết bị này.`}
          </AppText>
          <View style={{ gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.md }}>
            <Button label="Gửi góp ý khác" icon="edit-3" onPress={() => setSent(false)} />
            <Button label="Về Khám phá" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      back
      topLevel
      maxWidth={640}
      keyboard
      title="Góp ý"
      subtitle="Ý kiến của bạn giúp người đến sau hội nhập dễ dàng hơn."
      footer={
        <Button label="Gửi góp ý" icon="send" onPress={() => void submit()} disabled={!valid} loading={sending} />
      }
    >
      <AppText variant="caption" color="textMuted" style={{ marginBottom: spacing.sm }}>
        Bạn muốn gửi
      </AppText>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {KINDS.map((k) => (
          <Chip key={k.id} label={k.label} selected={kind === k.id} onPress={() => setKind(k.id)} />
        ))}
      </View>

      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
        Nội dung
      </AppText>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder={current.placeholder}
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        maxLength={1000}
        accessibilityLabel={`Nội dung ${current.label.toLowerCase()}`}
        style={[
          type.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.card,
            padding: spacing.md,
          },
        ]}
      />
      <AppText variant="small" color="textMuted" align="right" style={{ marginTop: spacing.xs }}>
        {`${message.length}/1000`}
      </AppText>

      <Card tone="muted" style={{ marginTop: spacing.md }}>
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Gửi ẩn danh</AppText>
            <AppText variant="caption" color="textMuted">
              {anonymous || !profile ? 'Tên của bạn sẽ không được gửi kèm.' : `Gửi kèm tên: ${profile.name}`}
            </AppText>
          </View>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            accessibilityLabel="Gửi ẩn danh"
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>
      </Card>

      {error ? (
        <AppText color="danger" style={{ marginTop: spacing.md }} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}

      <AppText variant="small" color="textMuted" style={{ marginTop: spacing.lg }}>
        Bản demo lưu góp ý trên thiết bị. Khi triển khai, góp ý được gửi tới Phòng Tổ chức và Thanh tra.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  input: { minHeight: 140, borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  success: { alignItems: 'center' },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
