import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { useTheme } from './ThemeProvider';
import { useLayout } from './useLayout';

export const WEB_FRAME_MAX_WIDTH = 430;

/**
 * Web, narrow window (< 768px): centers the app in a phone-shaped column (max 430px, DESIGN_SYSTEM).
 * Web, medium/wide: full-width desktop layout (sidebar + content, see AppShell).
 * Native: renders children unchanged.
 */
export function WebFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { isCompact } = useLayout();
  if (Platform.OS !== 'web') return <>{children}</>;
  if (!isCompact) return <View style={[styles.full, { backgroundColor: colors.bg }]}>{children}</View>;
  return (
    <View style={[styles.outer, { backgroundColor: colors.frameBg }]}>
      <View style={[styles.inner, { backgroundColor: colors.bg, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  outer: { flex: 1, alignItems: 'center' },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_FRAME_MAX_WIDTH,
    overflow: 'hidden',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
});
