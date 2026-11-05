import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { getResource, resources } from '@/content';
import { textMatches } from '@/search/match';
import type { ResourceType } from '@/types';
import {
  AppText,
  Card,
  Chip,
  EmptyState,
  RESOURCE_TYPE_ICONS,
  RESOURCE_TYPE_LABELS,
  ResourceRow,
  SearchBar,
  Screen,
  SourceFooter,
  aggregateMeta,
  useLayout,
  useOpenResource,
  useTheme,
} from '@/ui';

const TYPES = Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[];

export default function LibraryScreen() {
  const { spacing } = useTheme();
  const { isWide, hasSidebar } = useLayout();
  const sidePad = hasSidebar ? spacing.xxl : spacing.lg;
  const openResource = useOpenResource();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ResourceType | null>(null);
  const [field, setField] = useState<string | null>(null);

  const fields = useMemo(() => [...new Set(resources.map((r) => r.field))], []);
  const types = useMemo(() => TYPES.filter((t) => resources.some((r) => r.type === t)), []);

  const items = resources
    .filter((r) => (!type || r.type === type) && (!field || r.field === field) && textMatches(query, r.title, r.field, RESOURCE_TYPE_LABELS[r.type]))
    // Active documents first; superseded ones stay visible (greyed) so people recognise old versions.
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'active' ? -1 : 1));

  const chipRow = (children: ReactNode) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -sidePad, marginTop: spacing.sm }}
      contentContainerStyle={{ paddingHorizontal: sidePad, gap: spacing.sm }}
    >
      {children}
    </ScrollView>
  );

  const searchBar = (
    <SearchBar value={query} onChangeText={setQuery} placeholder="Tìm tài liệu, ví dụ: nghỉ phép" accessibilityLabel="Tìm tài liệu" />
  );
  const typeChips = (
    <>
      <Chip label="Tất cả" selected={type === null} onPress={() => setType(null)} accessibilityLabel="Tất cả loại tài liệu" />
      {types.map((t) => (
        <Chip
          key={t}
          icon={RESOURCE_TYPE_ICONS[t]}
          label={RESOURCE_TYPE_LABELS[t]}
          selected={type === t}
          onPress={() => setType(type === t ? null : t)}
        />
      ))}
    </>
  );
  const fieldChips = (
    <>
      <Chip label="Tất cả" selected={field === null} onPress={() => setField(null)} accessibilityLabel="Tất cả lĩnh vực" />
      {fields.map((f) => (
        <Chip key={f} label={f} selected={field === f} onPress={() => setField(field === f ? null : f)} />
      ))}
    </>
  );
  const list = (
    <>
      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }} accessibilityLiveRegion="polite">
        {`${items.length} tài liệu`}
      </AppText>

      {items.length === 0 ? (
        <EmptyState
          icon="folder"
          title="Không có tài liệu phù hợp"
          message="Thử bỏ bớt bộ lọc hoặc hỏi trợ lý."
          actionLabel="Hỏi trợ lý"
          onAction={() => router.push({ pathname: '/assistant', params: { q: query } })}
        />
      ) : (
        <Card padding={spacing.md}>
          <View>
            {items.map((r, i) => (
              <ResourceRow
                key={r.id}
                resource={r}
                supersededByTitle={r.supersededBy ? getResource(r.supersededBy)?.title : undefined}
                onPress={() => openResource(r)}
                divider={i < items.length - 1}
              />
            ))}
          </View>
        </Card>
      )}
    </>
  );

  if (isWide) {
    // Desktop: filters in a left column, search + document list on the right.
    return (
      <Screen back topLevel title="Tài liệu" subtitle="Biểu mẫu, quy định, hướng dẫn sử dụng – luôn dùng bản mới nhất.">
        <View style={[styles.split, { gap: spacing.xl }]}>
          <View style={[styles.side, { gap: spacing.sm }]}>
            <AppText variant="caption" color="textMuted" weight="700">
              LOẠI TÀI LIỆU
            </AppText>
            <View style={[styles.wrap, { gap: spacing.sm }]}>{typeChips}</View>
            <AppText variant="caption" color="textMuted" weight="700" style={{ marginTop: spacing.lg }}>
              LĨNH VỰC
            </AppText>
            <View style={[styles.wrap, { gap: spacing.sm }]}>{fieldChips}</View>
          </View>
          <View style={styles.flex}>
            {searchBar}
            {list}
          </View>
        </View>
        <SourceFooter meta={aggregateMeta(resources)} />
      </Screen>
    );
  }

  return (
    <Screen back topLevel title="Tài liệu" subtitle="Biểu mẫu, quy định, hướng dẫn sử dụng – luôn dùng bản mới nhất.">
      {searchBar}
      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.md }}>
        Loại tài liệu
      </AppText>
      {chipRow(typeChips)}
      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.md }}>
        Lĩnh vực
      </AppText>
      {chipRow(fieldChips)}
      {list}
      <SourceFooter meta={aggregateMeta(resources)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', alignItems: 'flex-start' },
  side: { width: 260 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
