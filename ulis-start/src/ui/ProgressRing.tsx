import { useEffect, useId, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Solid stroke; default is the rose→lavender progress gradient. */
  color?: string;
  trackColor?: string;
  /** Center text; defaults to the percentage. Pass `null` to hide. */
  label?: string | null;
  sublabel?: string;
  /** Color of label text (e.g. white on the blue header). */
  labelColor?: string;
  /** Custom center content (overrides label/sublabel). */
  children?: ReactNode;
  /** Animation duration in ms (0 = no animation). */
  duration?: number;
  accessibilityLabel?: string;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 10,
  color,
  trackColor,
  label,
  sublabel,
  labelColor,
  children,
  duration = 700,
  accessibilityLabel,
}: ProgressRingProps) {
  const { colors, gradients } = useTheme();
  const gradId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const value = clamp01(progress);
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, value, duration]);

  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = anim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });
  const pct = Math.round(value * 100);
  const text = label === undefined ? `${pct}%` : label;
  const fg = labelColor ?? colors.text;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `Tiến độ ${pct}%`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            {gradients.progress.map((c, i) => (
              <Stop key={c} offset={i / (gradients.progress.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor ?? colors.chipBorder}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? `url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children ?? (
          <>
            {text !== null ? (
              <AppText
                variant={size >= 88 ? 'h2' : 'caption'}
                color={fg}
                weight="700"
                maxFontSizeMultiplier={1.3}
                numberOfLines={1}
              >
                {text}
              </AppText>
            ) : null}
            {sublabel ? (
              <AppText variant="small" color={labelColor ?? colors.textMuted} maxFontSizeMultiplier={1.2} numberOfLines={1}>
                {sublabel}
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
