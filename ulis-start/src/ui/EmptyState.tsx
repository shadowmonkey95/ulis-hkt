import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from './AppText';
import { Button, type FeatherName } from './Button';
import { useTheme } from './ThemeProvider';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: FeatherName;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ title, message, icon = 'inbox', actionLabel, onAction, style }: EmptyStateProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.box, { padding: spacing.xl, gap: spacing.sm }, style]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Feather name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="h2" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color="textMuted" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} style={{ marginTop: spacing.sm, alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
