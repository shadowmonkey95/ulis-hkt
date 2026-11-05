import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getContact, getGuide, getTask, guides } from '@/content';
import { useJourney } from '@/journey';
import { searchContent, type SearchHit } from '@/search/match';
import type { Guide, GuideCategory, Task } from '@/types';
import {
  AppText,
  Card,
  Chip,
  Columns,
  ContactCard,
  EmptyState,
  GUIDE_CATEGORY_LABELS,
  OwnerChip,
  SearchBar,
  SectionHeader,
  Screen,
  SourceFooter,
  aggregateMeta,
  focusRing,
  pointer,
  pressState,
  useLayout,
  useTheme,
} from '@/ui';

const CATEGORIES = Object.keys(GUIDE_CATEGORY_LABELS) as GuideCategory[];

export default function GuideListScreen() {
  const { spacing } = useTheme();
  const { isCompact, isWide, hasSidebar } = useLayout();
  const sidePad = hasSidebar ? spacing.xxl : spacing.lg;
  const { profile } = useJourney();
  // `/guide?q=…` (Khám phá hero search, assistant links) pre-fills the situation search.
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof q === 'string' ? q : '');
  // Adopt a new `q` when the route param changes (adjust-state-during-render pattern, no effect).
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    if (typeof q === 'string') setQuery(q);
  }
  const [category, setCategory] = useState<GuideCategory | null>(null);

  const hits = useMemo(
    () => (query.trim() ? searchContent(query, { kinds: ['guide', 'task', 'contact'], track: profile?.track, limit: 30 }) : []),
    [query, profile?.track],
  );
  const searching = query.trim().length > 0;
  const guideHits = hits.filter((h) => h.kind === 'guide' && (!category || getGuide(h.id)?.category === category));
  const taskHits = hits.filter((h) => h.kind === 'task').slice(0, 4);
  const contactHits = hits.filter((h) => h.kind === 'contact').slice(0, 2);
  const listed = guides.filter((g) => !category || g.category === category);
  const suggestions = guides.slice(0, 6).map((g) => g.situations[0]);

  const searchBar = (
    <SearchBar
      value={query}
      onChangeText={setQuery}
      placeholder="Bạn đang gặp tình huống gì?"
      accessibilityLabel="Tìm theo tình huống, ví dụ: Tôi muốn xin nghỉ phép"
    />
  );

  const suggestionBlock = (
    <>
      <AppText variant="caption" color="textMuted" style={{ marginTop: isWide ? 0 : spacing.md, marginBottom: spacing.sm }}>
        Tình huống thường gặp
      </AppText>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {suggestions.map((s) => (
          <Chip key={s} label={s} icon="message-square" onPress={() => setQuery(s)} accessibilityLabel={`Tìm: ${s}`} style={styles.sideChip} />
        ))}
      </View>
    </>
  );

  const categoryChips = [
    <Chip key="all" label="Tất cả" selected={category === null} onPress={() => setCategory(null)} />,
    ...CATEGORIES.map((c) => (
      <Chip key={c} label={GUIDE_CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />
    )),
  ];

  const cardGap = isCompact ? spacing.sm : spacing.md;
  const results = searching ? (
    <>
      {guideHits.length + taskHits.length + contactHits.length === 0 ? (
        <EmptyState
          icon="search"
          title="Chưa tìm thấy hướng dẫn phù hợp"
          message="Thử diễn đạt khác, hoặc hỏi trợ lý để được gợi ý người liên hệ."
          actionLabel="Hỏi trợ lý"
          onAction={() => router.push({ pathname: '/assistant', params: { q: query } })}
        />
      ) : null}

      {guideHits.length > 0 ? (
        <>
          <SectionHeader title="Hướng dẫn" />
          <Columns min={300} gap={cardGap} maxColumns={3}>
            {guideHits.map((h) => {
              const g = getGuide(h.id);
              return g ? <GuideCard key={h.id} guide={g} situation={pickSituation(g, h)} /> : null;
            })}
          </Columns>
        </>
      ) : null}

      {taskHits.length > 0 ? (
        <>
          <SectionHeader title="Việc trong hành trình của bạn" />
          <Card padding={spacing.xs}>
            {taskHits.map((h, i) => {
              const t = getTask(h.id);
              return t ? <TaskHitRow key={h.id} task={t} divider={i < taskHits.length - 1} /> : null;
            })}
          </Card>
        </>
      ) : null}

      {contactHits.length > 0 ? (
        <>
          <SectionHeader title="Người có thể giúp bạn" />
          <Columns min={300} gap={cardGap} maxColumns={2}>
            {contactHits.map((h) => {
              const c = getContact(h.id);
              return c ? (
                <ContactCard
                  key={h.id}
                  contact={c}
                  highlight={h.matchedText}
                  onPress={() => router.push({ pathname: '/contacts/[id]', params: { id: c.id } })}
                />
              ) : null;
            })}
          </Columns>
        </>
      ) : null}
    </>
  ) : (
    <>
      <SectionHeader title={category ? GUIDE_CATEGORY_LABELS[category] : 'Tất cả hướng dẫn'} />
      <Columns min={300} gap={cardGap} maxColumns={3}>
        {listed.map((g) => (
          <GuideCard key={g.id} guide={g} situation={g.situations[0]} />
        ))}
      </Columns>
    </>
  );

  if (isWide) {
    // Desktop: filters in a left column, search + results grid on the right.
    return (
      <Screen back topLevel title="Cẩm nang" subtitle="Tìm hướng dẫn theo đúng tình huống bạn đang gặp.">
        <View style={[styles.split, { gap: spacing.xl }]}>
          <View style={[styles.side, { gap: spacing.sm }]}>
            <AppText variant="caption" color="textMuted" weight="700">
              LĨNH VỰC
            </AppText>
            <View style={[styles.wrap, { gap: spacing.sm }]}>{categoryChips}</View>
            {!searching ? <View style={{ marginTop: spacing.lg }}>{suggestionBlock}</View> : null}
          </View>
          <View style={styles.flex}>
            {searchBar}
            {results}
          </View>
        </View>
        <SourceFooter meta={aggregateMeta(guides)} />
      </Screen>
    );
  }

  return (
    <Screen back topLevel title="Cẩm nang" subtitle="Tìm hướng dẫn theo đúng tình huống bạn đang gặp.">
      {searchBar}
      {!searching ? suggestionBlock : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.lg, marginHorizontal: -sidePad }}
        contentContainerStyle={{ paddingHorizontal: sidePad, gap: spacing.sm }}
      >
        {categoryChips}
      </ScrollView>
      {results}
      <SourceFooter meta={aggregateMeta(guides)} />
    </Screen>
  );
}

function TaskHitRow({ task, divider }: { task: Task; divider: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/task/[id]', params: { id: task.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Việc: ${task.title}`}
      style={(state) => [
        styles.taskRow,
        pointer,
        focusRing(state, colors.primary),
        pressState(state).hovered ? { backgroundColor: colors.surfaceAlt } : null,
        {
          padding: spacing.md,
          opacity: state.pressed ? 0.7 : 1,
          borderBottomColor: colors.border,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <View style={[styles.flex, { gap: spacing.xs }]}>
        <AppText variant="bodyStrong">{task.title}</AppText>
        <View style={[styles.wrap, { gap: spacing.sm, alignItems: 'center' }]}>
          <OwnerChip owner={task.owner} />
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

function pickSituation(g: Guide, hit: SearchHit): string {
  return hit.matchedText && g.situations.includes(hit.matchedText) ? hit.matchedText : g.situations[0];
}

function GuideCard({ guide, situation }: { guide: Guide; situation?: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Card
      onPress={() => router.push({ pathname: '/guide/[id]', params: { id: guide.id } })}
      accessibilityLabel={`Hướng dẫn: ${guide.title}. ${GUIDE_CATEGORY_LABELS[guide.category]}`}
    >
      <View style={styles.row}>
        <View style={[styles.flex, { gap: spacing.xs }]}>
          <AppText variant="small" color="primary" weight="700">
            {GUIDE_CATEGORY_LABELS[guide.category].toUpperCase()}
          </AppText>
          <AppText variant="bodyStrong">{guide.title}</AppText>
          {situation ? (
            <AppText variant="caption" color="textMuted" style={styles.italic}>
              {`“${situation}”`}
            </AppText>
          ) : null}
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  flex: { flex: 1 },
  italic: { fontStyle: 'italic' },
  split: { flexDirection: 'row', alignItems: 'flex-start' },
  side: { width: 240, flexShrink: 0 },
  sideChip: { maxWidth: '100%' },
});
