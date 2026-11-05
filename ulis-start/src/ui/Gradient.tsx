import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import type { GradientColors } from './theme';

export interface GradientPoint {
  x: number;
  y: number;
}

export interface GradientProps {
  colors: GradientColors;
  /** Default: left → right. */
  start?: GradientPoint;
  end?: GradientPoint;
  locations?: readonly [number, number, ...number[]];
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

/** Thin wrapper over expo-linear-gradient (Expo Go compatible). */
export function Gradient({ colors, start = { x: 0, y: 0 }, end = { x: 1, y: 0 }, locations, style, children, pointerEvents }: GradientProps) {
  return (
    <LinearGradient colors={colors} start={start} end={end} locations={locations} style={style} pointerEvents={pointerEvents}>
      {children}
    </LinearGradient>
  );
}
