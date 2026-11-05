// "Tiến độ hội nhập" block (reference `.progress-card`): caption, "x / y việc bắt buộc đã hoàn thành",
// big rose percentage and a 13px gradient track. Used on Hôm nay and the Hành trình header.
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Track } from '../types';
import { AppText, Gradient, TRACK_LABELS, useTheme } from '../ui';
import type { ProgressStat } from './engine';

export interface ProgressSummaryProps {
  progress: ProgressStat;
  track?: Track;
  style?: StyleProp<ViewStyle>;
}

const TRACK_HEIGHT = 13;

export function ProgressSummary({ progress, track, style }: ProgressSummaryProps) {
  const { colors, gradients, radius, spacing } = useTheme();
  const ratio = progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;
  const caption = `TIẾN ĐỘ HỘI NHẬP${track ? ` · ${TRACK_LABELS[track].toUpperCase()}` : ''}`;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Tiến độ hội nhập: ${progress.done} trên ${progress.total} việc bắt buộc đã hoàn thành, ${progress.pct}%`}
      accessibilityValue={{ min: 0, max: 100, now: progress.pct }}
      style={[
        styles.card,
        { backgroundColor: colors.completedBg, borderColor: colors.heroBorder, borderRadius: radius.card, padding: spacing.xl - 2 },
        style,
      ]}
    >
      <View style={[styles.head, { gap: spacing.md, marginBottom: spacing.lg }]}>
        <View style={styles.flex}>
          <AppText variant="eyebrow" style={styles.caption}>
            {caption}
          </AppText>
          <AppText variant="bodyStrong" style={styles.headline}>
            {`${progress.done} / ${progress.total} việc bắt buộc đã hoàn thành`}
          </AppText>
        </View>
        <AppText color="primary" style={styles.number} maxFontSizeMultiplier={1.4}>
          {`${progress.pct}%`}
        </AppText>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        {ratio > 0 ? (
          <Gradient colors={gradients.progress} style={[styles.fill, { width: `${ratio * 100}%` }]} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  caption: { fontSize: 11, letterSpacing: 1.3, fontWeight: '900', lineHeight: 16, marginBottom: 4 },
  headline: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  number: { fontSize: 30, lineHeight: 40, fontWeight: '900', fontVariant: ['tabular-nums'] },
  track: { width: '100%', height: TRACK_HEIGHT, borderRadius: 40, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 40 },
});
