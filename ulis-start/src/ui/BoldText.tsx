import { Text } from 'react-native';

import { AppText, type AppTextProps } from './AppText';

const BOLD = /\*\*(.+?)\*\*/g;

/** Removes **bold** markers (for accessibility labels, copy, history previews). */
export const stripBold = (text: string) => text.replace(BOLD, '$1');

/**
 * AppText that renders **…** spans in bold — the only markup the assistant server is allowed to send.
 * Unmatched asterisks are shown as-is.
 */
export function BoldText({ children, ...rest }: Omit<AppTextProps, 'children'> & { children: string }) {
  const parts = children.split(BOLD);
  return (
    <AppText {...rest}>
      {/* split() with one capture group alternates plain text (even) and bold text (odd). */}
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={{ fontWeight: '700' }}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </AppText>
  );
}
