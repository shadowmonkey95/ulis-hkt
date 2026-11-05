import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Card, Columns, HeroCard, Screen, useLayout, useTheme, type FeatherName } from '@/ui';

interface Entry {
  title: string;
  description: string;
  icon: FeatherName;
  href: Href;
}

// Navigation entries (app structure, not content).
const ENTRIES: Entry[] = [
  { title: 'Về ULIS', description: 'Sứ mệnh, giá trị và các đơn vị', icon: 'info', href: '/about' },
  { title: 'Cẩm nang', description: 'Tìm thủ tục theo tình huống', icon: 'book-open', href: '/guide' },
  { title: 'Danh bạ', description: 'Tôi cần gặp ai?', icon: 'users', href: '/contacts' },
  { title: 'Tài liệu', description: 'Biểu mẫu, quy định, hướng dẫn', icon: 'folder', href: '/library' },
  { title: 'Phúc lợi', description: 'Quyền lợi của cán bộ', icon: 'gift', href: '/benefits' },
  { title: 'Góp ý', description: 'Gửi câu hỏi, góp ý cho Trường', icon: 'edit-3', href: '/feedback' },
  { title: 'Cài đặt demo', description: 'Đổi ngày, vai trò, đặt lại', icon: 'sliders', href: '/demo' },
];

export default function MoreScreen() {
  const { colors, spacing, type, radius, isDark } = useTheme();
  const { isCompact, hasSidebar } = useLayout();
  const [query, setQuery] = useState('');

  const search = () => {
    const q = query.trim();
    router.push(q ? { pathname: '/guide', params: { q } } : '/guide');
  };

  const renderCard = (e: Entry, i: number) => (
    <Card onPress={() => router.push(e.href)} accessibilityLabel={`${e.title}. ${e.description}`} style={styles.card}>
      {/* Icon tiles cycle pink / lavender / blue like `.card:nth-child`. */}
      <View style={[styles.icon, { backgroundColor: colors.tiles[i % colors.tiles.length], borderRadius: radius.tile }]}>
        <Feather name={e.icon} size={22} color={colors.primary} />
      </View>
      <AppText variant="bodyStrong" style={[styles.cardTitle, { marginTop: spacing.md }]}>
        {e.title}
      </AppText>
      <AppText variant="caption" color="textMuted" style={styles.flex}>
        {e.description}
      </AppText>
      <AppText variant="caption" color="primary" weight="800" style={{ marginTop: spacing.md }}>
        Khám phá chuyên mục →
      </AppText>
    </Card>
  );

  return (
    <Screen>
      <HeroCard eyebrow="Sổ tay điện tử dành cho nhân sự mới">
        <AppText
          variant="title"
          accessibilityRole="header"
          style={hasSidebar ? styles.heroTitleWide : styles.heroTitle}
        >
          {'BẮT ĐẦU HÀNH TRÌNH – '}
          <AppText variant="title" color="primary" style={hasSidebar ? styles.heroTitleWide : styles.heroTitle}>
            VỮNG BƯỚC CÙNG ULIS
          </AppText>
        </AppText>
        <AppText color="navText" style={{ marginTop: spacing.sm, maxWidth: 650 }}>
          Chào mừng bạn! Mọi thông tin để BIẾT – LÀM – HỎI trong những ngày đầu ở ULIS đều ở đây.
        </AppText>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surface, borderColor: colors.chipBorder, marginTop: spacing.xl, gap: spacing.sm },
            isDark ? null : styles.searchShadow,
          ]}
        >
          <Feather name="search" size={18} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder="Bạn cần tìm thủ tục gì? Ví dụ: nghỉ phép"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Tìm trong Cẩm nang"
            style={[type.body, styles.input, { color: colors.text }]}
          />
          <Button label="Tìm kiếm" onPress={search} fullWidth={false} />
        </View>
      </HeroCard>

      <View style={[styles.sectionTitle, { marginTop: spacing.xl + 4, marginBottom: spacing.md }]}>
        <AppText variant="h2" accessibilityRole="header" style={hasSidebar ? styles.h2Wide : undefined}>
          Khám phá
        </AppText>
        <AppText variant="caption" color="textMuted">
          Một nơi để BIẾT – LÀM – HỎI
        </AppText>
      </View>

      {isCompact ? (
        <View style={[styles.grid, { gap: spacing.md }]}>
          {ENTRIES.map((e, i) => (
            <View key={e.title} style={styles.cell}>
              {renderCard(e, i)}
            </View>
          ))}
        </View>
      ) : (
        // Desktop: 3–4 columns depending on width.
        <Columns min={240} gap={spacing.lg} maxColumns={3}>
          {ENTRIES.map((e, i) => (
            <View key={e.title}>{renderCard(e, i)}</View>
          ))}
        </Columns>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  // Two columns: (100% - one 12pt gap) / 2.
  cell: { flexBasis: '47%', flexGrow: 1 },
  card: { flexGrow: 1, minHeight: 172 },
  cardTitle: { fontSize: 17, lineHeight: 24 },
  icon: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 27, lineHeight: 36, fontWeight: '800' },
  heroTitleWide: { fontSize: 40, lineHeight: 50, fontWeight: '800', letterSpacing: -0.6 },
  h2Wide: { fontSize: 22, lineHeight: 30 },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 15,
    padding: 8,
    maxWidth: 760,
  },
  searchShadow: { shadowColor: '#9C7793', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 1 },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 8 },
});
