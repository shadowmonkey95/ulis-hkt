// Design tokens – palette from the team reference (zalo/ulis_start_demo_cap_nhat.html), rose × lavender.
import type { TextStyle } from 'react-native';

import type { Owner } from '../types';

export type ColorScheme = 'light' | 'dark';

/** A gradient color list (≥ 2 stops), compatible with expo-linear-gradient. */
export type GradientColors = readonly [string, string, ...string[]];

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryFg: string;
  primarySoft: string;
  secondary: string;
  secondarySoft: string;
  /** Badges / celebration only. */
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** Kept for compatibility: info tone = secondary (lavender). */
  info: string;
  infoSoft: string;
  /** `.info` callout. */
  infoCalloutBg: string;
  infoCalloutBorder: string;
  infoCalloutText: string;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  /** Eyebrow / caption accent text. */
  eyebrow: string;
  overlay: string;
  /** Background around the phone-shaped frame on web. */
  frameBg: string;
  /** Card hover border, chip border, secondary button border. */
  cardHoverBorder: string;
  chipBorder: string;
  outlineBorder: string;
  heroBorder: string;
  /** Sidebar nav. */
  navText: string;
  navActiveBg: string;
  navActiveText: string;
  /** "✦ BẢN DEMO" pill. */
  pillBg: string;
  pillText: string;
  /** Completed task row. */
  completedBg: string;
  completedBorder: string;
  /** Chat bubbles. */
  chatUser: string;
  chatAssistant: string;
  /** Icon tile backgrounds that cycle pink / lavender / blue. */
  tiles: readonly [string, string, string];
  ownerChips: Record<Owner, string>;
}

export interface ThemeGradients {
  /** Logo mark. */
  brand: GradientColors;
  /** Progress bar / ring fill. */
  progress: GradientColors;
  /** Soft hero background. */
  hero: GradientColors;
}

const lightColors: ThemeColors = {
  primary: '#B94E79',
  primaryHover: '#96335F',
  primaryFg: '#FFFFFF',
  primarySoft: '#FCECF2',
  secondary: '#6756A7',
  secondarySoft: '#F0EDFF',
  accent: '#E0A100',
  accentSoft: '#FDF3D6',
  success: '#2E8B62',
  successSoft: '#E3F3EB',
  warning: '#D97706',
  warningSoft: '#FDF0DF',
  danger: '#C2410C',
  dangerSoft: '#FCE9E0',
  info: '#6756A7',
  infoSoft: '#F0EDFF',
  infoCalloutBg: '#F9F4FF',
  infoCalloutBorder: '#9986CA',
  infoCalloutText: '#60567A',
  bg: '#FAF9FC',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F2F7',
  border: '#E9E5EB',
  text: '#24314E',
  textMuted: '#6F7890',
  eyebrow: '#AC5682',
  overlay: 'rgba(36, 49, 78, 0.55)',
  frameBg: '#F3EEF5',
  cardHoverBorder: '#D8B0C5',
  chipBorder: '#EAD8E1',
  outlineBorder: '#ECCBDA',
  heroBorder: '#F1E1EB',
  navText: '#58617B',
  navActiveBg: '#FCEEF4',
  navActiveText: '#AB446F',
  pillBg: '#FAF0F6',
  pillText: '#A04570',
  completedBg: '#FDF4F8',
  completedBorder: '#EACBDA',
  chatUser: '#B84F7A',
  chatAssistant: '#F2F0F6',
  tiles: ['#FAEAF1', '#F0EDFF', '#EAF4FA'],
  ownerChips: { me: '#B94E79', unit: '#6756A7', hr: '#0E7490', it: '#4D7C0F', buddy: '#B45309' },
};

const darkColors: ThemeColors = {
  primary: '#E07AA3',
  primaryHover: '#EA97B8',
  primaryFg: '#FFFFFF',
  primarySoft: '#3A2230',
  secondary: '#A595E0',
  secondarySoft: '#2A2440',
  accent: '#F2B92E',
  accentSoft: '#3A2F12',
  success: '#4CC08C',
  successSoft: '#13301F',
  warning: '#F0A03C',
  warningSoft: '#3A2A12',
  danger: '#F07A4A',
  dangerSoft: '#3D1F14',
  info: '#A595E0',
  infoSoft: '#2A2440',
  infoCalloutBg: '#241F33',
  infoCalloutBorder: '#7E6AC4',
  infoCalloutText: '#CFC6E6',
  bg: '#14111A',
  surface: '#1E1A26',
  surfaceAlt: '#262130',
  border: '#352E40',
  text: '#F1ECF4',
  textMuted: '#A79FB3',
  eyebrow: '#E07AA3',
  overlay: 'rgba(0, 0, 0, 0.7)',
  frameBg: '#0E0C12',
  cardHoverBorder: '#7A4A62',
  chipBorder: '#4A3644',
  outlineBorder: '#5A3A4C',
  heroBorder: '#3A2A38',
  navText: '#C9C0D3',
  navActiveBg: '#3A2230',
  navActiveText: '#F0A3C2',
  pillBg: '#3A2230',
  pillText: '#F0A3C2',
  completedBg: '#2A1D25',
  completedBorder: '#4A3040',
  chatUser: '#B84F7A',
  chatAssistant: '#2A2533',
  tiles: ['#3A2230', '#2A2440', '#1D2A33'],
  ownerChips: { me: '#E07AA3', unit: '#A595E0', hr: '#22B8CF', it: '#86B33A', buddy: '#F59E0B' },
};

export const palettes: Record<ColorScheme, ThemeColors> = { light: lightColors, dark: darkColors };

export const gradients: Record<ColorScheme, ThemeGradients> = {
  light: {
    brand: ['#D76491', '#6E62B3'],
    progress: ['#D86B96', '#7E6AC4'],
    hero: ['#FFF1F6', '#F5F2FF', '#F3F7FF'],
  },
  dark: {
    brand: ['#D76491', '#6E62B3'],
    progress: ['#D86B96', '#7E6AC4'],
    hero: ['#2A1824', '#211C33'],
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** chip = pill. Use `sm`/`input` for small rounded boxes (checkboxes, text inputs, icon tiles). */
export const radius = { sm: 8, input: 11, button: 11, tile: 13, card: 18, hero: 26, chip: 999, pill: 999 } as const;

// lineHeight >= 1.4x fontSize everywhere so Vietnamese stacked diacritics never clip.
export const typography = {
  title: { fontSize: 24, fontWeight: '700', lineHeight: 34 },
  h2: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  small: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  /** Uppercase kicker above titles (color: colors.eyebrow by default in AppText). */
  eyebrow: { fontSize: 12, fontWeight: '800', lineHeight: 18, letterSpacing: 1.4, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Minimum touch target (pt). */
export const HIT_MIN = 44;

/** Very soft card shadow (`box-shadow: 0 7px 21px #17203606`). */
export const cardShadow = {
  shadowColor: '#172036',
  shadowOpacity: 0.05,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 1,
} as const;

export interface Theme {
  scheme: ColorScheme;
  isDark: boolean;
  colors: ThemeColors;
  gradients: ThemeGradients;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof typography;
}

export function makeTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    isDark: scheme === 'dark',
    colors: palettes[scheme],
    gradients: gradients[scheme],
    spacing,
    radius,
    type: typography,
  };
}

export const lightTheme = makeTheme('light');
export const darkTheme = makeTheme('dark');
