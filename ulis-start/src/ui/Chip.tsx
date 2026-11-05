import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import type { FeatherName } from './Button';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';

export interface ChipProps {
  label: string;
  selected?: boolean;
  /** When set the chip is a toggle/filter button; otherwise a static tag. */
  onPress?: () => void;
  icon?: FeatherName;
  /** Custom tint (e.g. owner color). Defaults to primary. */
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Chip({ label, selected, onPress, icon, color, accessibilityLabel, style, testID }: ChipProps) {
  const { colors, radius, spacing } = useTheme();
  const tint = color ?? colors.primary;
  // Reference `.chip`: white pill, #EAD8E1 border, rose text; selected = rose fill, white text.
  const bg = selected ? tint : colors.surface;
  const fg = selected ? colors.primaryFg : onPress ? tint : color ?? colors.pillText;
  const border = selected ? tint : colors.chipBorder;

  const content = (
    <View style={styles.row}>
      {icon ? <Feather name={icon} size={14} color={fg} /> : null}
      <AppText variant="caption" color={fg} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
  const base: ViewStyle = {
    backgroundColor: bg,
    borderColor: border,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
  };

  if (!onPress) {
    return <View style={[styles.base, base, style]} testID={testID}>{content}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      testID={testID}
      style={(state) => [
        styles.base,
        styles.touchable,
        base,
        { opacity: state.pressed ? 0.75 : 1 },
        pressState(state).hovered && !selected ? { borderColor: colors.cardHoverBorder, backgroundColor: colors.navActiveBg } : null,
        pointer,
        focusRing(state, tint),
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, paddingVertical: 4, alignSelf: 'flex-start', justifyContent: 'center' },
  touchable: { minHeight: 36, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  label: { flexShrink: 1 },
});
