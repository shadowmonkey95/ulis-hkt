import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Button, type FeatherName } from './Button';
import { useTheme } from './ThemeProvider';

export interface BadgeModalProps {
  visible: boolean;
  /** Badge name, e.g. "Khởi động". */
  title: string;
  description?: string;
  icon?: FeatherName;
  /** Heading above the badge name. */
  heading?: string;
  closeLabel?: string;
  onClose: () => void;
}

const CONFETTI = Array.from({ length: 14 }, (_, i) => i);

/** Celebration modal for a newly unlocked milestone badge (Animated API only). */
export function BadgeModal({
  visible,
  title,
  description,
  icon = 'award',
  heading = 'Bạn vừa đạt huy hiệu mới!',
  closeLabel = 'Tuyệt vời!',
  onClose,
}: BadgeModalProps) {
  const { colors, radius, spacing } = useTheme();
  const pop = useState(() => new Animated.Value(0))[0];
  const burst = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!visible) return;
    pop.setValue(0);
    burst.setValue(0);
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [visible, pop, burst]);

  const confettiColors = [colors.accent, colors.primary, colors.success, colors.ownerChips.buddy, colors.ownerChips.unit];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: radius.card + 6,
              padding: spacing.xl,
              gap: spacing.sm,
              transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
              opacity: pop,
            },
          ]}
        >
          <View style={styles.badgeArea}>
            {CONFETTI.map((i) => {
              const angle = (i / CONFETTI.length) * Math.PI * 2;
              const dist = 70 + (i % 3) * 14;
              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.confetti,
                    {
                      backgroundColor: confettiColors[i % confettiColors.length],
                      borderRadius: i % 2 ? 4 : 1,
                      opacity: burst.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                      transform: [
                        { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * dist] }) },
                        { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * dist] }) },
                        { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${180 + i * 30}deg`] }) },
                      ],
                    },
                  ]}
                />
              );
            })}
            <View style={[styles.medal, { backgroundColor: colors.accent, borderColor: colors.accentSoft }]}>
              <Feather name={icon} size={44} color="#FFFFFF" />
            </View>
          </View>
          <AppText variant="caption" color="textMuted" align="center">
            {heading}
          </AppText>
          <AppText variant="title" align="center" accessibilityRole="header">
            {title}
          </AppText>
          {description ? (
            <AppText color="textMuted" align="center">
              {description}
            </AppText>
          ) : null}
          <Button label={closeLabel} onPress={onClose} style={{ marginTop: spacing.md }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, alignItems: 'stretch' },
  badgeArea: { height: 140, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', width: 8, height: 12 },
  medal: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
});
