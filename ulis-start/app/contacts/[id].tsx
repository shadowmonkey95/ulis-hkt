import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getContact, guides } from '@/content';
import { useJourney } from '@/journey';
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  GUIDE_CATEGORY_LABELS,
  SectionHeader,
  Screen,
  SourceFooter,
  openUrlSafe,
  useLayout,
  useTheme,
  useToast,
  type FeatherName,
} from '@/ui';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { isWide } = useLayout();
  const toast = useToast();
  const { actions } = useJourney();
  const contact = id ? getContact(id) : undefined;

  // Counts toward the "Kết nối" badge (≥3 contacts viewed). Reducer ignores repeats.
  useEffect(() => {
    if (contact) actions.viewContact(contact.id);
  }, [contact, actions]);

  if (!contact) {
    return (
      <Screen back>
        <EmptyState icon="user-x" title="Không tìm thấy liên hệ" actionLabel="Về Danh bạ" onAction={() => router.replace('/contacts')} />
      </Screen>
    );
  }

  const related = guides.filter((g) => g.contactId === contact.id);
  const open = async (url: string, fail: string) => {
    if (!(await openUrlSafe(url))) toast.show(fail, 'warning');
  };
  const call = contact.phone ? () => void open(`tel:${contact.phone?.replace(/\s/g, '')}`, 'Thiết bị này không gọi điện được') : undefined;
  const email = contact.email ? () => void open(`mailto:${contact.email}`, 'Không mở được ứng dụng email') : undefined;

  const leftContent = (
    <>
      <View style={[styles.head, { gap: spacing.md }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Feather name="users" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header">
            {contact.unit}
          </AppText>
          <AppText color="textMuted">{contact.role}</AppText>
        </View>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {call ? <Button label="Gọi điện" icon="phone" onPress={call} accessibilityLabel={`Gọi ${contact.unit}: ${contact.phone}`} /> : null}
        {email ? <Button label="Gửi email" icon="mail" variant="secondary" onPress={email} accessibilityLabel={`Gửi email cho ${contact.unit}`} /> : null}
      </View>

      <SectionHeader title="Thông tin liên hệ" />
      <Card padding={spacing.md}>
        <InfoRow icon="phone" label="Điện thoại" value={contact.phone} onPress={call} />
        <InfoRow icon="mail" label="Email" value={contact.email} onPress={email} />
        <InfoRow icon="map-pin" label="Địa điểm" value={contact.location} />
        <InfoRow icon="clock" label="Giờ làm việc" value={contact.hours} last />
      </Card>

    </>
  );

  const rightContent = (
    <>
      <SectionHeader title="Phụ trách" style={isWide ? { marginTop: 0 } : undefined} />
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {contact.handles.map((h) => (
          <Chip key={h} label={h} />
        ))}
      </View>

      {related.length > 0 ? (
        <>
          <SectionHeader title="Hướng dẫn liên quan" />
          <View style={{ gap: spacing.sm }}>
            {related.map((g) => (
              <Card
                key={g.id}
                onPress={() => router.push({ pathname: '/guide/[id]', params: { id: g.id } })}
                accessibilityLabel={`Hướng dẫn: ${g.title}`}
              >
                <View style={styles.row}>
                  <Feather name="book-open" size={18} color={colors.primary} />
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{g.title}</AppText>
                    <AppText variant="small" color="textMuted">
                      {GUIDE_CATEGORY_LABELS[g.category]}
                    </AppText>
                  </View>
                  <Feather name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

    </>
  );

  return (
    <Screen back maxWidth={isWide ? 1100 : undefined}>
      {isWide ? (
        // Desktop: identity + contact info on the left, topics + related guides on the right.
        <View style={[styles.split, { gap: spacing.xxl + 8 }]}>
          <View style={styles.flex}>{leftContent}</View>
          <View style={styles.flex}>{rightContent}</View>
        </View>
      ) : (
        <>
          {leftContent}
          {rightContent}
        </>
      )}
      <SourceFooter meta={contact} />
    </Screen>
  );
}

function InfoRow({ icon, label, value, onPress, last }: { icon: FeatherName; label: string; value?: string; onPress?: () => void; last?: boolean }) {
  const { colors, spacing } = useTheme();
  if (!value) return null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        styles.info,
        {
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.6 : 1,
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Feather name={icon} size={16} color={colors.textMuted} style={styles.infoIcon} />
      <View style={styles.flex}>
        <AppText variant="small" color="textMuted">
          {label}
        </AppText>
        <AppText color={onPress ? 'primary' : 'text'}>{value}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  split: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  infoIcon: { marginTop: 3 },
});
