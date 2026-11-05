import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { AppText, useTheme } from '../../ui';

/** Three pulsing dots in an assistant-style bubble (remote mode while waiting). */
export function TypingIndicator() {
  const { colors, radius, spacing } = useTheme();
  // react-native-web 0.21 has no useAnimatedValue.
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const dot = (i: number) => ({
    opacity: progress.interpolate({
      inputRange: [0, 0.2 + i * 0.2, 0.4 + i * 0.2, 1],
      outputRange: [0.3, 1, 0.3, 0.3],
      extrapolate: 'clamp',
    }),
  });

  return (
    <View
      style={[styles.row, { marginVertical: spacing.xs }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Trợ lý đang soạn câu trả lời"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, padding: spacing.md }]}>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={[styles.dot, { backgroundColor: colors.primary }, dot(i)]} />
        ))}
        <AppText variant="small" color="textMuted" style={{ marginLeft: spacing.sm }}>
          Đang soạn câu trả lời…
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingLeft: 38 },
  bubble: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: StyleSheet.hairlineWidth, borderBottomLeftRadius: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
