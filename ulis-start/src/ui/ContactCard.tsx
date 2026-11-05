import Feather from '@expo/vector-icons/Feather';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { Contact } from '../types';
import { AppText } from './AppText';
import { Card } from './Card';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';

export interface ContactCardProps {
  contact: Contact;
  /** Open contact detail. */
  onPress?: () => void;
  /** Override call action (defaults to tel: link). */
  onCall?: () => void;
  /** Override email action (defaults to mailto: link). */
  onEmail?: () => void;
  /** Topic that matched the user's question, shown as "Phụ trách: …". */
  highlight?: string;
  /** Hide call/email buttons. */
  hideActions?: boolean;
  /** Max handles shown as text (default 4). */
  maxHandles?: number;
}

export async function openUrlSafe(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function ContactCard({ contact, onPress, onCall, onEmail, highlight, hideActions, maxHandles = 4 }: ContactCardProps) {
  const { colors, spacing, radius } = useTheme();
  const handles = contact.handles.slice(0, maxHandles).join(', ') + (contact.handles.length > maxHandles ? '…' : '');
  const call = onCall ?? (contact.phone ? () => void openUrlSafe(`tel:${contact.phone?.replace(/\s/g, '')}`) : undefined);
  const email = onEmail ?? (contact.email ? () => void openUrlSafe(`mailto:${contact.email}`) : undefined);

  return (
    <Card onPress={onPress} accessibilityLabel={`${contact.unit}. ${contact.role}`} accessibilityHint={onPress ? 'Mở thông tin liên hệ' : undefined}>
      <View style={styles.top}>
        <View style={[styles.avatar, { backgroundColor: colors.tiles[0], borderRadius: radius.tile }]}>
          <Feather name="users" size={20} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{contact.unit}</AppText>
          <AppText variant="caption" color="textMuted">
            {contact.role}
          </AppText>
        </View>
        {onPress ? <Feather name="chevron-right" size={20} color={colors.textMuted} /> : null}
      </View>

      {highlight ? (
        <View style={[styles.highlight, { backgroundColor: colors.successSoft, borderRadius: radius.sm, marginTop: spacing.sm }]}>
          <Feather name="check" size={14} color={colors.success} />
          <AppText variant="caption" color="success" weight="700" style={styles.flex}>
            {`Phụ trách: ${highlight}`}
          </AppText>
        </View>
      ) : (
        <AppText variant="caption" color="textMuted" style={{ marginTop: spacing.sm }}>
          {`Phụ trách: ${handles}`}
        </AppText>
      )}

      {contact.hours ? (
        <View style={[styles.info, { marginTop: spacing.xs }]}>
          <Feather name="clock" size={13} color={colors.textMuted} style={styles.infoIcon} />
          <AppText variant="small" color="textMuted" style={styles.flex}>
            {contact.hours}
          </AppText>
        </View>
      ) : null}

      {!hideActions && (call || email) ? (
        <View style={[styles.actions, { marginTop: spacing.md, gap: spacing.sm }]}>
          {call ? <ActionButton icon="phone" label="Gọi điện" onPress={call} a11y={`Gọi ${contact.unit}`} /> : null}
          {email ? <ActionButton icon="mail" label="Gửi email" onPress={email} a11y={`Gửi email cho ${contact.unit}`} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

function ActionButton({ icon, label, onPress, a11y }: { icon: 'phone' | 'mail'; label: string; onPress: () => void; a11y: string }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={(state) => [
        styles.action,
        {
          borderColor: colors.outlineBorder,
          borderRadius: radius.button - 2,
          backgroundColor: pressState(state).hovered ? colors.navActiveBg : colors.surface,
          opacity: state.pressed ? 0.7 : 1,
        },
        pointer,
        focusRing(state, colors.primary),
      ]}
    >
      <Feather name={icon} size={16} color={colors.primary} />
      <AppText variant="caption" color="primary" weight="700">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  infoIcon: { marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
  },
});
