import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  /** Extra content under the text: steps, source footer, action chips. */
  children?: ReactNode;
  /** Small caption below the bubble, e.g. time. */
  meta?: string;
  /** Show the assistant avatar (default true for assistant). */
  showAvatar?: boolean;
}

export function ChatBubble({ role, text, children, meta, showAvatar = true }: ChatBubbleProps) {
  const { colors, spacing } = useTheme();
  const mine = role === 'user';
  return (
    <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start', marginVertical: spacing.xs }]}>
      {!mine && showAvatar ? (
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]} accessibilityElementsHidden importantForAccessibility="no">
          <Feather name="compass" size={16} color={colors.primary} />
        </View>
      ) : null}
      <View style={[styles.col, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
        <View
          accessible={!children}
          accessibilityLabel={`${mine ? 'Bạn' : 'Trợ lý'}: ${text}`}
          style={[
            styles.bubble,
            {
              backgroundColor: mine ? colors.chatUser : colors.chatAssistant,
              borderRadius: 15,
              borderBottomRightRadius: mine ? 4 : 15,
              borderBottomLeftRadius: mine ? 15 : 4,
              padding: spacing.md,
              gap: spacing.sm,
            },
          ]}
        >
          <AppText color={mine ? '#FFFFFF' : colors.text} selectable>
            {text}
          </AppText>
          {children}
        </View>
        {meta ? (
          <AppText variant="small" color="textMuted" style={{ marginTop: 2 }}>
            {meta}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { maxWidth: '85%', flexShrink: 1 },
  bubble: {},
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
