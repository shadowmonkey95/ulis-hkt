import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Gradient } from './Gradient';

import { useTheme } from './ThemeProvider';

export interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  /** Solid fill; default is the rose→lavender progress gradient. */
  color?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({ progress, color, trackColor, height = 8, accessibilityLabel, style }: ProgressBarProps) {
  const { colors, gradients, radius } = useTheme();
  const value = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, value]);

  const pct = Math.round(value * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `Tiến độ ${pct}%`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[{ height, borderRadius: radius.pill, backgroundColor: trackColor ?? colors.chipBorder, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          height,
          borderRadius: radius.pill,
          backgroundColor: color,
          overflow: 'hidden',
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      >
        {color ? null : <Gradient colors={gradients.progress} style={StyleSheet.absoluteFill} />}
      </Animated.View>
    </View>
  );
}
