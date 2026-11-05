import Feather from '@expo/vector-icons/Feather';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Resource, ResourceType } from '../types';
import { AppText } from './AppText';
import type { FeatherName } from './Button';
import { openUrlSafe } from './ContactCard';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';
import { useToast } from './Toast';
import { RESOURCE_TYPE_LABELS } from './labels';

export const RESOURCE_TYPE_ICONS: Record<ResourceType, FeatherName> = {
  form: 'file-text',
  regulation: 'book',
  manual: 'help-circle',
  video: 'play-circle',
  training: 'award',
};

/** Opens a resource link; placeholder links ("#") show a toast instead. */
export function useOpenResource(): (resource: Resource) => void {
  const toast = useToast();
  return useCallback(
    (resource: Resource) => {
      if (!resource.url || resource.url === '#') {
        toast.show('Tài liệu mẫu – Trường sẽ bổ sung đường dẫn chính thức', 'info');
        return;
      }
      void openUrlSafe(resource.url).then((ok) => {
        if (!ok) toast.show('Không mở được liên kết', 'warning');
      });
    },
    [toast],
  );
}

export interface ResourceRowProps {
  resource: Resource;
  /** Title of the replacing document (for superseded items). */
  supersededByTitle?: string;
  onPress?: () => void;
  divider?: boolean;
}

/** Document row: type icon · title · field/type · "Đã được thay thế bởi …" when superseded. */
export function ResourceRow({ resource, supersededByTitle, onPress, divider = false }: ResourceRowProps) {
  const { colors, spacing, radius } = useTheme();
  const old = resource.status === 'superseded';
  const placeholder = !resource.url || resource.url === '#';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={`${RESOURCE_TYPE_LABELS[resource.type]}: ${resource.title}${old ? `. Đã được thay thế${supersededByTitle ? ` bởi ${supersededByTitle}` : ''}` : ''}`}
      style={(state) => [
        styles.row,
        onPress ? pointer : null,
        focusRing(state, colors.primary),
        pressState(state).hovered ? { backgroundColor: colors.navActiveBg, borderRadius: radius.sm } : null,
        {
          paddingVertical: spacing.md,
          gap: spacing.md,
          opacity: state.pressed ? 0.7 : old ? 0.55 : 1,
          borderBottomColor: colors.border,
          borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: old ? colors.surfaceAlt : colors.tiles[0], borderRadius: radius.tile - 1 }]}>
        <Feather name={RESOURCE_TYPE_ICONS[resource.type]} size={18} color={old ? colors.textMuted : colors.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={old ? 'textMuted' : 'text'} style={old ? styles.strike : undefined}>
          {resource.title}
        </AppText>
        <AppText variant="small" color="textMuted">
          {`${RESOURCE_TYPE_LABELS[resource.type]} · ${resource.field}${placeholder ? ' · chưa có đường dẫn' : ''}`}
        </AppText>
        {old ? (
          <AppText variant="small" color="warning" weight="700" style={{ marginTop: 2 }}>
            {`Đã được thay thế bởi ${supersededByTitle ?? 'văn bản mới'}`}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Feather name={placeholder ? 'info' : 'external-link'} size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  strike: { textDecorationLine: 'line-through' },
});
