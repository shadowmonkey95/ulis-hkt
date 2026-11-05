import { router, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { getContact, getGuide, getResource } from '@/content';
import { CONTENT_IMAGE_ASPECT, getContentImage, isContentImageKey } from '@/content/assets';
import type { GuideImage, Resource } from '@/types';
import {
  AppText,
  Button,
  Card,
  Chip,
  ContactCard,
  EmptyState,
  ImageViewer,
  GUIDE_CATEGORY_LABELS,
  ResourceRow,
  SectionHeader,
  Screen,
  SourceFooter,
  focusRing,
  openUrlSafe,
  pointer,
  pressState,
  useLayout,
  useOpenResource,
  useTheme,
} from '@/ui';

const READING_WIDTH = 760;
const PANEL_WIDTH = 320;
// react-native-web supports `position: sticky`; RN's types don't list it.
const sticky = { position: 'sticky', top: 24 } as unknown as ViewStyle;

export default function GuideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const openResource = useOpenResource();
  const { isWide } = useLayout();
  const [viewing, setViewing] = useState<GuideImage | null>(null);
  const guide = id ? getGuide(id) : undefined;

  if (!guide) {
    return (
      <Screen back>
        <EmptyState icon="alert-circle" title="Không tìm thấy hướng dẫn" message="Hướng dẫn này có thể đã được gỡ hoặc đổi tên." actionLabel="Về Cẩm nang" onAction={() => router.replace('/guide')} />
      </Screen>
    );
  }

  const contact = getContact(guide.contactId);
  const images = (guide.images ?? []).filter((img) => getContentImage(img.asset) !== undefined);
  const forms = guide.formIds.map(getResource).filter((r): r is Resource => r !== undefined);

  const mainContent = (
    <>
      <AppText variant="small" color="primary" weight="700">
        {`CẨM NANG · ${GUIDE_CATEGORY_LABELS[guide.category].toUpperCase()}`}
      </AppText>
      <AppText variant="title" accessibilityRole="header" style={{ marginTop: spacing.xs }}>
        {guide.title}
      </AppText>

      <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
        Dùng hướng dẫn này khi:
      </AppText>
      <View style={[styles.wrap, { gap: spacing.sm }]}>
        {guide.situations.map((s) => (
          <Chip key={s} label={s} icon="message-square" />
        ))}
      </View>

      <SectionHeader index={1} title="Mục đích" />
      <AppText>{guide.purpose}</AppText>

      <SectionHeader index={2} title="Ai thực hiện" />
      <AppText>{guide.whoDoes}</AppText>

      <SectionHeader index={3} title="Cần chuẩn bị" />
      <View style={{ gap: spacing.sm }}>
        {guide.prepare.map((p) => (
          <AppText key={p}>{guide.prepare.length > 1 ? `• ${p}` : p}</AppText>
        ))}
      </View>

      <SectionHeader index={4} title="Các bước" />
      <View style={{ gap: spacing.md }}>
        {guide.steps.map((s, i) => (
          <View key={s} style={styles.item}>
            <View style={[styles.step, { backgroundColor: colors.primarySoft }]}>
              <AppText variant="caption" color="primary" weight="700" maxFontSizeMultiplier={1.3}>
                {String(i + 1)}
              </AppText>
            </View>
            <AppText style={styles.flex}>{s}</AppText>
          </View>
        ))}
      </View>

      {images.length > 0 ? (
        <>
          <SectionHeader title="Tài liệu trực quan" />
          <View style={{ gap: spacing.md }}>
            {images.map((img) => (
              <GuideImageCard key={img.asset} image={img} onOpen={() => setViewing(img)} />
            ))}
          </View>
        </>
      ) : null}
    </>
  );

  const sideContent = (
    <>
      <SectionHeader index={5} title="Biểu mẫu" style={isWide ? { marginTop: 0 } : undefined} />
      {forms.length > 0 ? (
        <Card padding={spacing.md}>
          {forms.map((r, i) => (
            <ResourceRow key={r.id} resource={r} onPress={() => openResource(r)} divider={i < forms.length - 1} />
          ))}
        </Card>
      ) : (
        <AppText color="textMuted">Thủ tục này không cần biểu mẫu riêng.</AppText>
      )}

      <SectionHeader index={6} title="Liên hệ" />
      {contact ? (
        <ContactCard contact={contact} onPress={() => router.push({ pathname: '/contacts/[id]', params: { id: contact.id } })} />
      ) : null}

      <Button
        label="Hỏi trợ lý về việc này"
        icon="message-circle"
        variant="secondary"
        onPress={() => router.push({ pathname: '/assistant', params: { q: guide.situations[0] ?? guide.title, guideId: guide.id } })}
        style={{ marginTop: spacing.xl }}
      />
    </>
  );

  const viewerSource = viewing ? getContentImage(viewing.asset) : undefined;
  const viewer =
    viewing && viewerSource ? (
      <ImageViewer
        visible
        source={viewerSource}
        aspect={imageAspect(viewing.asset)}
        alt={viewing.alt}
        caption={viewing.caption}
        onClose={() => setViewing(null)}
      />
    ) : null;

  if (isWide) {
    // Desktop: reading column (≤ 760) + sticky "Biểu mẫu / Liên hệ" panel on the right.
    return (
      <Screen back maxWidth={READING_WIDTH + PANEL_WIDTH + 40}>
        <View style={[styles.split, { gap: 40 }]}>
          <View style={[styles.flex, { maxWidth: READING_WIDTH }]}>{mainContent}</View>
          <View style={[{ width: PANEL_WIDTH }, sticky]}>
            {sideContent}
          </View>
        </View>
        <SourceFooter meta={guide} />
        {viewer}
      </Screen>
    );
  }

  return (
    <Screen back>
      {mainContent}
      {sideContent}
      <SourceFooter meta={guide} />
      {viewer}
    </Screen>
  );
}

function imageAspect(asset: string): number {
  return isContentImageKey(asset) ? CONTENT_IMAGE_ASPECT[asset] : 4 / 3;
}

function GuideImageCard({ image, onOpen }: { image: GuideImage; onOpen: () => void }) {
  const { colors, spacing, radius } = useTheme();
  const source = getContentImage(image.asset);
  if (!source) return null;
  return (
    <Card padding={spacing.md}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${image.alt}. Nhấn để phóng to`}
        style={(state) => [
          { borderRadius: radius.tile, overflow: 'hidden', borderWidth: 1, borderColor: pressState(state).hovered ? colors.cardHoverBorder : colors.border },
          pointer,
          focusRing(state, colors.primary),
        ]}
      >
        {/* Aspect ratio lives on the wrapper: on web an <Image> would otherwise take the file's natural height. */}
        <View style={[styles.image, { aspectRatio: imageAspect(image.asset), backgroundColor: colors.surfaceAlt }]}>
          <ExpoImage source={source} contentFit="contain" style={StyleSheet.absoluteFill} accessible={false} />
        </View>
      </Pressable>
      <AppText style={{ marginTop: spacing.sm }}>{image.caption}</AppText>
      <View style={[styles.imageMeta, { marginTop: spacing.xs, gap: spacing.sm }]}>
        <AppText variant="small" color="textMuted" style={styles.flex}>
          {`Nguồn: ${image.source}`}
        </AppText>
        {image.sourceUrl ? (
          <Pressable
            onPress={() => void openUrlSafe(image.sourceUrl ?? '')}
            accessibilityRole="link"
            accessibilityLabel={`Mở nguồn: ${image.source}`}
            hitSlop={8}
            style={(state) => [styles.inlineLink, pointer, focusRing(state, colors.primary)]}
          >
            <Feather name="external-link" size={13} color={colors.primary} />
            <AppText variant="small" color="primary" weight="700">
              Mở nguồn
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.inlineLink, { marginTop: spacing.xs }]}>
        <Feather name="maximize-2" size={13} color={colors.textMuted} />
        <AppText variant="small" color="textMuted">
          Nhấn để phóng to
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  imageMeta: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap' },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  split: { flexDirection: 'row', alignItems: 'flex-start' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
  step: { minWidth: 28, minHeight: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
