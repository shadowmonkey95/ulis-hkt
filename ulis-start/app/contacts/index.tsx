import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { contacts, getContact } from '@/content';
import { normalize, searchContent } from '@/search/match';
import type { Contact } from '@/types';
import { AppText, Card, Chip, Columns, ContactCard, EmptyState, SearchBar, SectionHeader, Screen, SourceFooter, aggregateMeta, useLayout, useTheme } from '@/ui';

const MAX_TOPICS = 10;

/** Most common topics across contacts' `handles`: shared topics first, then each unit's primary topic. */
function commonTopics(list: Contact[]): string[] {
  const stats = new Map<string, { label: string; count: number; index: number }>();
  for (const c of list) {
    c.handles.forEach((h, index) => {
      const key = normalize(h);
      const s = stats.get(key);
      if (s) {
        s.count += 1;
        s.index = Math.min(s.index, index);
      } else stats.set(key, { label: h, count: 1, index });
    });
  }
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, MAX_TOPICS)
    .map((s) => s.label);
}

export default function ContactsScreen() {
  const { spacing } = useTheme();
  const { isCompact } = useLayout();
  const gap = isCompact ? spacing.md : spacing.lg;
  const [query, setQuery] = useState('');
  const topics = useMemo(() => commonTopics(contacts), []);
  const searching = query.trim().length > 0;
  const hits = useMemo(
    () => (searching ? searchContent(query, { kinds: ['contact'], minScore: 1, limit: 8, relativeCutoff: 0.5 }) : []),
    [query, searching],
  );
  const open = (id: string) => router.push({ pathname: '/contacts/[id]', params: { id } });

  return (
    <Screen back topLevel title="Danh bạ" subtitle="Đầu mối hỗ trợ cán bộ mới – không cần nhớ ai phụ trách việc gì.">
      <Card tone="muted">
        <AppText variant="h2" accessibilityRole="header">
          Tôi cần gặp ai?
        </AppText>
        <AppText variant="caption" color="textMuted" style={{ marginTop: 2, marginBottom: spacing.md }}>
          Chọn chủ đề hoặc gõ việc bạn cần hỏi.
        </AppText>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Ví dụ: Tôi cần hỏi về công tác phí"
          accessibilityLabel="Tìm người phụ trách theo chủ đề"
        />
        <View style={[styles.wrap, { gap: spacing.sm, marginTop: spacing.md }]}>
          {topics.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={normalize(query) === normalize(t)}
              onPress={() => setQuery(normalize(query) === normalize(t) ? '' : t)}
              accessibilityLabel={`Chủ đề: ${t}`}
            />
          ))}
        </View>
      </Card>

      {searching ? (
        <>
          <SectionHeader title={hits.length ? 'Người phụ trách phù hợp' : 'Kết quả'} />
          {hits.length === 0 ? (
            <EmptyState
              icon="search"
              title="Chưa tìm thấy đầu mối phù hợp"
              message="Bạn có thể hỏi Người đồng hành, hoặc gửi câu hỏi tới Phòng TCTT."
              actionLabel="Gửi câu hỏi"
              onAction={() => router.push('/feedback')}
            />
          ) : (
            <Columns min={300} gap={gap} maxColumns={3}>
              {hits.map((h) => {
                const c = getContact(h.id);
                return c ? <ContactCard key={c.id} contact={c} highlight={h.matchedText} onPress={() => open(c.id)} /> : null;
              })}
            </Columns>
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Tất cả đầu mối" />
          <Columns min={300} gap={gap} maxColumns={3}>
            {contacts.map((c) => (
              <ContactCard key={c.id} contact={c} onPress={() => open(c.id)} />
            ))}
          </Columns>
        </>
      )}

      <SourceFooter meta={aggregateMeta(contacts)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
