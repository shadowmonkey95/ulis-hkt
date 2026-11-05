import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';
import { HIT_MIN } from './theme';
import { CONTENT_MAX_WIDTH, useLayout } from './useLayout';

export interface ScreenProps {
  children: ReactNode;
  /** Large page title rendered at the top of the content. */
  title?: string;
  subtitle?: string;
  /** Show a top bar with a back button ("Quay lại"). */
  back?: boolean;
  /** Custom back handler; defaults to router.back() or the Khám phá tab. */
  onBack?: () => void;
  /** Element on the right of the back bar / title row. */
  headerRight?: ReactNode;
  /** Replace the default title block entirely (e.g. coloured hero header). */
  header?: ReactNode;
  /** Defaults to true. When false, children fill the remaining space (e.g. chat). */
  scroll?: boolean;
  /** Sticky element below the scroll area (e.g. a primary action button). */
  footer?: ReactNode;
  /** Wrap in KeyboardAvoidingView (forms, chat). */
  keyboard?: boolean;
  /** Extra keyboard offset (e.g. a header above the Screen). Default 0. */
  keyboardOffset?: number;
  /** Remove horizontal padding from content. */
  noPadding?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Desktop web: max width of the content column (default CONTENT_MAX_WIDTH; e.g. 760 for reading pages). */
  maxWidth?: number;
  /**
   * Page is reachable from the desktop sidebar (list screens like Cẩm nang, Danh bạ):
   * the "Quay lại" bar is hidden on medium/wide web. Detail pages leave this off and keep back.
   */
  topLevel?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
  testID?: string;
}

/** Safe area + background + optional scroll + optional back bar. */
export function Screen({
  children,
  title,
  subtitle,
  back,
  onBack,
  headerRight,
  header,
  scroll = true,
  footer,
  keyboard,
  keyboardOffset = 0,
  noPadding,
  contentContainerStyle,
  maxWidth,
  topLevel,
  refreshControl,
  testID,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { hasSidebar: desktop } = useLayout();
  const showBack = !!back && !(desktop && topLevel);
  const sidePad = desktop ? spacing.xxl : spacing.lg;
  // Desktop: center everything in a column; phone: passthrough.
  const constrain = (node: ReactNode, fill = false) =>
    desktop ? (
      <View style={[styles.column, { maxWidth: maxWidth ?? CONTENT_MAX_WIDTH }, fill ? styles.flex : null]}>{node}</View>
    ) : (
      node
    );

  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  const titleBlock =
    header ??
    (title ? (
      <View style={[styles.titleBlock, { marginBottom: desktop ? spacing.xl : spacing.lg }]}>
        <View style={styles.titleRow}>
          <AppText variant="title" accessibilityRole="header" style={[styles.flex, desktop ? styles.desktopTitle : null]}>
            {title}
          </AppText>
          {!showBack && headerRight}
        </View>
        {subtitle ? (
          <AppText color="textMuted" style={{ marginTop: spacing.xs }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    ) : null);

  const padding: ViewStyle = noPadding ? {} : { paddingHorizontal: sidePad };
  const padTop = showBack ? spacing.sm : desktop ? spacing.xl : spacing.lg;

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        padding,
        { paddingTop: padTop, paddingBottom: spacing.xxl + (footer ? 0 : insets.bottom) },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {constrain(
        <>
          {titleBlock}
          {children}
        </>,
      )}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, { paddingTop: padTop }, contentContainerStyle]}>
      {constrain(
        <>
          {titleBlock}
          {children}
        </>,
        true,
      )}
    </View>
  );

  const inner = (
    <>
      {showBack ? (
        <View style={[styles.backBarWrap, { paddingHorizontal: desktop ? sidePad - spacing.sm : spacing.sm, borderBottomColor: colors.border }]}>
          {constrain(
            <View style={styles.backBar}>
              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={8}
                style={(state) => [
                  styles.backBtn,
                  { opacity: state.pressed ? 0.6 : 1, borderRadius: 8 },
                  pressState(state).hovered ? { backgroundColor: colors.primarySoft } : null,
                  pointer,
                  focusRing(state, colors.primary),
                ]}
              >
                <Feather name="chevron-left" size={24} color={colors.primary} />
                <AppText variant="bodyStrong" color="primary">
                  Quay lại
                </AppText>
              </Pressable>
              <View style={styles.flex} />
              {headerRight}
            </View>,
          )}
        </View>
      ) : null}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: sidePad,
              paddingTop: spacing.md,
              paddingBottom: spacing.md + insets.bottom,
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          ]}
        >
          {constrain(footer)}
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.flex, { backgroundColor: colors.bg }]} testID={testID}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          // SDK 58 is edge-to-edge: Android's adjustResize no longer shrinks the window, so pad on both platforms.
          behavior={Platform.OS === 'web' ? undefined : 'padding'}
          keyboardVerticalOffset={keyboardOffset}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleBlock: {},
  column: { width: '100%', alignSelf: 'center' },
  desktopTitle: { fontSize: 28, lineHeight: 38, fontWeight: '700' },
  backBarWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBar: { flexDirection: 'row', alignItems: 'center', minHeight: HIT_MIN + 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', minHeight: HIT_MIN, paddingRight: 12, gap: 2 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
