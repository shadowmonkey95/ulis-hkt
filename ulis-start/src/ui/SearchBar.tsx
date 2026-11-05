import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from './ThemeProvider';
import { focusRing, pointer } from './interaction';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Tìm kiếm',
  onSubmit,
  autoFocus,
  accessibilityLabel,
  style,
  testID,
}: SearchBarProps) {
  const { colors, spacing, type, isDark } = useTheme();
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: colors.surface, borderColor: colors.chipBorder, borderRadius: 15, paddingHorizontal: spacing.md },
        isDark ? null : styles.shadow,
        style,
      ]}
    >
      <Feather name="search" size={18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={accessibilityLabel ?? placeholder}
        testID={testID}
        style={[styles.input, type.body, { color: colors.text }]}
      />
      {value ? (
        <Pressable
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel="Xóa nội dung tìm kiếm"
          hitSlop={10}
          style={(state) => [styles.clear, pointer, focusRing(state, colors.primary)]}
        >
          <Feather name="x-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, minHeight: 48, gap: 8 },
  // `.searchbox` box-shadow: 0 8px 26px #9c77931a
  shadow: { shadowColor: '#3A4E7A', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 1 },
  input: { flex: 1, paddingVertical: 10, minHeight: 44 },
  clear: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
});
