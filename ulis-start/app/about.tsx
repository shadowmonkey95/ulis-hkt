import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { about } from '@/content';
import type { AboutUnitKind } from '@/types';
import { AppText, Card, Chip, Columns, SectionHeader, Screen, SourceFooter, openUrlSafe, useLayout, useTheme, type FeatherName } from '@/ui';

const UNIT_KIND: Record<AboutUnitKind, { label: string; icon: FeatherName }> = {
  office: { label: 'Phòng chức năng', icon: 'briefcase' },
  center: { label: 'Trung tâm', icon: 'cpu' },
  faculty: { label: 'Khoa/ đơn vị đào tạo', icon: 'book' },
  organization: { label: 'Đoàn thể', icon: 'heart' },
};

export default function AboutScreen() {
  const { colors, spacing } = useTheme();
  const { isCompact } = useLayout();
  const gap = isCompact ? spacing.md : spacing.lg;
  const data = about;
  const day = data.dayAtUlis ?? [];

  return (
    <Screen
      back
      topLevel
      header={
        <Card tone="primary" style={{ marginBottom: spacing.sm }}>
          <AppText variant="caption" color="primaryFg" style={styles.faded}>
            {`${data.shortName} · Thành lập ${data.foundedYear}`}
          </AppText>
          <AppText variant="title" color="primaryFg" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
            {data.name}
          </AppText>
          <AppText variant="caption" color="primaryFg" style={[styles.faded, { marginTop: spacing.xs }]}>
            {data.englishName}
          </AppText>
          <View style={[styles.infoRow, { marginTop: spacing.md }]}>
            <Feather name="map-pin" size={14} color={colors.primaryFg} style={styles.infoIcon} />
            <AppText variant="caption" color="primaryFg" style={styles.flex}>
              {data.address}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <Feather name="layers" size={14} color={colors.primaryFg} style={styles.infoIcon} />
            <AppText variant="caption" color="primaryFg" style={styles.flex}>
              {`Trực thuộc ${data.parentOrg}`}
            </AppText>
          </View>
        </Card>
      }
    >
      <Chip icon="globe" label="Trang thông tin chính thức" onPress={() => void openUrlSafe(data.website)} accessibilityLabel={`Mở website ${data.website}`} />

      <SectionHeader title="Sứ mệnh · Tầm nhìn" />
      <Columns min={320} maxColumns={2} gap={gap}>
        <StatementCard icon="target" title="Sứ mệnh" text={data.mission} />
        <StatementCard icon="eye" title="Tầm nhìn" text={data.vision} />
      </Columns>

      <SectionHeader title="Giá trị cốt lõi" />
      {isCompact ? (
        <View style={[styles.valuesGrid, { gap: spacing.md }]}>
        {data.values.map((v) => (
          <Card key={v.title} tone="accent" style={styles.valueCard}>
            <Feather name="star" size={18} color={colors.accent} />
            <AppText variant="bodyStrong" style={{ marginTop: spacing.xs }}>
              {v.title}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {v.description}
            </AppText>
          </Card>
        ))}
        </View>
      ) : (
        <Columns min={200} maxColumns={4} gap={gap}>
        {data.values.map((v) => (
          <Card key={v.title} tone="accent">
            <Feather name="star" size={18} color={colors.accent} />
            <AppText variant="bodyStrong" style={{ marginTop: spacing.xs }}>
              {v.title}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {v.description}
            </AppText>
          </Card>
        ))}
        </Columns>
      )}

      <SectionHeader title="Lịch sử" />
      <Card>
        {data.history.map((h, i) => (
          <View key={h} style={[styles.bullet, { marginTop: i ? spacing.sm : 0 }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <AppText style={styles.flex}>{h}</AppText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Các đơn vị bạn sẽ làm việc cùng" />
      <Columns min={300} maxColumns={3} gap={isCompact ? spacing.sm : spacing.md}>
        {data.units.map((u) => {
          const kind = UNIT_KIND[u.kind];
          return (
            <Card
              key={u.id}
              onPress={u.contactId ? () => router.push({ pathname: '/contacts/[id]', params: { id: u.contactId ?? '' } }) : undefined}
              accessibilityLabel={`${u.name}. ${kind.label}. ${u.description}`}
              accessibilityHint={u.contactId ? 'Mở thông tin liên hệ' : undefined}
            >
              <View style={styles.unitRow}>
                <View style={[styles.unitIcon, { backgroundColor: colors.primarySoft }]}>
                  <Feather name={kind.icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="small" color="textMuted">
                    {kind.label}
                  </AppText>
                  <AppText variant="bodyStrong">{u.name}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {u.description}
                  </AppText>
                </View>
                {u.contactId ? <Feather name="chevron-right" size={20} color={colors.textMuted} /> : null}
              </View>
            </Card>
          );
        })}
      </Columns>

      <SectionHeader title="Một ngày tại ULIS" />
      {day.length > 0 ? (
        <Card>
          {day.map((d, i) => (
            <View key={`${d.time}-${d.title}`} style={[styles.dayRow, { paddingTop: i ? spacing.md : 0 }]}>
              <AppText variant="caption" color="primary" weight="700" style={styles.dayTime}>
                {d.time}
              </AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{d.title}</AppText>
                {d.description ? (
                  <AppText variant="caption" color="textMuted">
                    {d.description}
                  </AppText>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card tone="muted">
          <View style={styles.infoRow}>
            <Feather name="clock" size={16} color={colors.textMuted} style={styles.infoIcon} />
            <AppText color="textMuted" style={styles.flex}>
              Nội dung “Một ngày tại ULIS” đang được Trường bổ sung. Trong lúc chờ, hãy hỏi Người đồng hành của bạn về nhịp làm việc của đơn vị.
            </AppText>
          </View>
        </Card>
      )}

      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.xl }}>
        {data.note}
      </AppText>
      <SourceFooter meta={data} />
    </Screen>
  );
}

function StatementCard({ icon, title, text }: { icon: FeatherName; title: string; text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Card>
      <View style={styles.infoRow}>
        <Feather name={icon} size={18} color={colors.primary} style={styles.infoIcon} />
        <AppText variant="bodyStrong" color="primary">
          {title}
        </AppText>
      </View>
      <AppText style={{ marginTop: spacing.xs }}>{text}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  faded: { opacity: 0.85 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  infoIcon: { marginTop: 3 },
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  valueCard: { flexBasis: '46%', flexGrow: 1 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unitIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dayRow: { flexDirection: 'row', gap: 12 },
  dayTime: { width: 56 },
});
