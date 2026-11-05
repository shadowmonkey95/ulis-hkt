import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Owner } from '../types';
import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';
import { OWNER_LABELS, OWNER_LONG_LABELS } from './labels';

export interface OwnerChipProps {
  owner: Owner;
  /** Use the long label ("Phòng Tổ chức và Thanh tra") instead of the short one. */
  long?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Colored pill showing who is responsible for a task. */
export function OwnerChip({ owner, long, style }: OwnerChipProps) {
  const { colors, radius } = useTheme();
  const tint = colors.ownerChips[owner];
  const label = (long ? OWNER_LONG_LABELS : OWNER_LABELS)[owner];
  return (
    <View
      accessible
      accessibilityLabel={`Người thực hiện: ${OWNER_LONG_LABELS[owner]}`}
      style={[styles.chip, { borderColor: tint, borderRadius: radius.pill }, style]}
    >
      <View style={[styles.dot, { backgroundColor: tint }]} />
      <AppText variant="small" color={tint} weight="600">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
