import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { benefits, getContact, getGuide } from '@/content';
import type { BenefitCategory } from '@/types';
import {
  AppText,
  BENEFIT_CATEGORY_LABELS,
  Banner,
  Card,
  Chip,
  Columns,
  Screen,
  SourceFooter,
  aggregateMeta,
  useLayout,
  useTheme,
  type FeatherName,
} from '@/ui';

const ICONS: Record<BenefitCategory, FeatherName> = {
  insurance: 'shield',
  leave: 'sun',
  health: 'heart',
  union: 'users',
  development: 'trending-up',
  recognition: 'award',
  facility: 'coffee',
};

export default function BenefitsScreen() {
  const { colors, spacing } = useTheme();
  const { isCompact } = useLayout();
  return (
    <Screen back topLevel title="Phúc lợi" subtitle="Những quyền lợi bạn được hưởng khi làm việc tại ULIS.">
      <Banner
        variant="info"
        message="Mức hưởng cụ thể theo quy định hiện hành của Trường. Khi cần con số chính xác, hãy liên hệ đơn vị phụ trách."
      />
      <Columns min={320} maxColumns={3} gap={isCompact ? spacing.md : spacing.lg} style={{ marginTop: spacing.lg }}>
        {benefits.map((b) => {
          const guide = b.guideId ? getGuide(b.guideId) : undefined;
          const contact = b.contactId ? getContact(b.contactId) : undefined;
          return (
            <Card key={b.id}>
              <View style={[styles.head, { gap: spacing.md }]}>
                <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                  <Feather name={ICONS[b.category]} size={20} color={colors.accent} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="small" color="textMuted" weight="700">
                    {BENEFIT_CATEGORY_LABELS[b.category].toUpperCase()}
                  </AppText>
                  <AppText variant="bodyStrong" accessibilityRole="header">
                    {b.title}
                  </AppText>
                </View>
              </View>
              <AppText style={{ marginTop: spacing.sm }}>{b.summary}</AppText>
              {b.details.map((d) => (
                <View key={d} style={[styles.bullet, { marginTop: spacing.xs }]}>
                  <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
                  <AppText variant="caption" color="textMuted" style={styles.flex}>
                    {d}
                  </AppText>
                </View>
              ))}
              {guide || contact ? (
                <View style={[styles.wrap, { gap: spacing.sm, marginTop: spacing.md }]}>
                  {guide ? (
                    <Chip
                      icon="book-open"
                      label="Xem hướng dẫn"
                      onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })}
                      accessibilityLabel={`Xem hướng dẫn: ${guide.title}`}
                    />
                  ) : null}
                  {contact ? (
                    <Chip
                      icon="phone"
                      label={contact.unit}
                      onPress={() => router.push({ pathname: '/contacts/[id]', params: { id: contact.id } })}
                      accessibilityLabel={`Liên hệ ${contact.unit}`}
                    />
                  ) : null}
                </View>
              ) : null}
              <SourceFooter meta={b} compact style={{ marginTop: spacing.md }} />
            </Card>
          );
        })}
      </Columns>
      <SourceFooter meta={aggregateMeta(benefits)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
