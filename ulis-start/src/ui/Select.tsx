import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';

export interface SelectProps {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Title of the picker sheet and accessibility label of the field. */
  label: string;
  testID?: string;
}

/**
 * Dropdown field: a pressable box showing the current value; opens a modal list of options.
 * Pure RN (Modal + ScrollView), so it works the same in Expo Go and on web.
 */
export function Select({ value, options, onChange, placeholder = 'Chọn…', label, testID }: SelectProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'chưa chọn'}`}
        accessibilityHint="Mở danh sách để chọn"
        style={(state) => [
          styles.field,
          { borderColor: open ? colors.primary : colors.border, backgroundColor: colors.surface, borderRadius: radius.input },
          pointer,
          focusRing(state, colors.primary),
        ]}
      >
        <AppText style={styles.flex} color={value ? 'text' : 'textMuted'} numberOfLines={1}>
          {value || placeholder}
        </AppText>
        <Feather name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Đóng danh sách">
          {/* Inner Pressable swallows taps so they don't close the sheet. */}
          <Pressable
            onPress={() => undefined}
            style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: radius.card, borderColor: colors.border }]}
          >
            <View style={[styles.header, { paddingHorizontal: spacing.lg, borderBottomColor: colors.border }]}>
              <AppText variant="h2" accessibilityRole="header" style={styles.flex}>
                {label}
              </AppText>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={8} style={pointer}>
                <Feather name="x" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingVertical: spacing.xs }}>
              {options.map((o) => {
                const selected = o === value;
                return (
                  <Pressable
                    key={o}
                    onPress={() => pick(o)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={o}
                    style={(state) => [
                      styles.option,
                      { paddingHorizontal: spacing.lg },
                      { backgroundColor: selected ? colors.primarySoft : pressState(state).pressed || pressState(state).hovered ? colors.surfaceAlt : 'transparent' },
                      pointer,
                    ]}
                  >
                    <AppText style={styles.flex} color={selected ? 'primary' : 'text'} weight={selected ? '700' : undefined}>
                      {o}
                    </AppText>
                    {selected ? <Feather name="check" size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, paddingHorizontal: 14, minHeight: 48 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20, 20, 40, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '80%', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingVertical: 10 },
});
