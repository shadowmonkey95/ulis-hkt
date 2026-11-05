import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { Gradient } from './Gradient';
import { useTheme } from './ThemeProvider';
import { useLayout } from './useLayout';

export interface HeroCardProps {
  children: ReactNode;
  /** Small uppercase kicker above the content. */
  eyebrow?: string;
  /** Hide the decorative ✦ glyph. */
  noGlyph?: boolean;
  /** Inner padding (default 22 phone / 40 desktop). */
  padding?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Soft hero block like the reference `.hero`: rose→lavender→blue pastel gradient, 1px border,
 * radius 26, a big ✦ glyph top-right at low opacity, ink text on top.
 */
export function HeroCard({ children, eyebrow, noGlyph, padding, style, testID }: HeroCardProps) {
  const { colors, gradients, radius, spacing, isDark } = useTheme();
  const { hasSidebar } = useLayout();
  const pad = padding ?? (hasSidebar ? 40 : 22);
  return (
    <View
      testID={testID}
      style={[styles.wrap, { borderRadius: radius.hero, borderColor: colors.heroBorder }, style]}
    >
      <Gradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.35 }} style={[styles.fill, { padding: pad }]}>
        {!noGlyph ? (
          <AppText
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.glyph,
              { color: isDark ? colors.secondary : '#D3DDF0', opacity: isDark ? 0.18 : 0.55, fontSize: hasSidebar ? 190 : 140, lineHeight: hasSidebar ? 220 : 170 },
              hasSidebar ? { right: 35, top: -70 } : { right: -40, top: -50 },
            ]}
          >
            ✦
          </AppText>
        ) : null}
        <View style={styles.content}>
          {eyebrow ? (
            <AppText variant="eyebrow" style={{ marginBottom: spacing.sm }}>
              {eyebrow}
            </AppText>
          ) : null}
          {children}
        </View>
      </Gradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, overflow: 'hidden' },
  fill: { position: 'relative' },
  glyph: { position: 'absolute', opacity: 0.55 },
  content: { position: 'relative', zIndex: 1 },
});
