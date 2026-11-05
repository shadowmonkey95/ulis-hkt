// Design tokens – ULIS brand navy #223C77 (zalo/logo_design.jpg, "Hệ màu quy chuẩn").
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
  primary: '#223C77',
  primaryHover: '#1A2F5E',
  primaryFg: '#FFFFFF',
  primarySoft: '#E9EEF8',
  secondary: '#4A6CB3',
  secondarySoft: '#EDF1FA',
  accent: '#D9A013',
  accentSoft: '#FDF3D6',
  success: '#2E8B62',
  successSoft: '#E3F3EB',
  warning: '#D97706',
  warningSoft: '#FDF0DF',
  danger: '#C2410C',
  dangerSoft: '#FCE9E0',
  info: '#4A6CB3',
  infoSoft: '#EDF1FA',
  infoCalloutBg: '#F2F5FB',
  infoCalloutBorder: '#6F8CC7',
  infoCalloutText: '#3E4E72',
  bg: '#F7F8FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F8',
  border: '#E3E7EF',
  text: '#1E2A44',
  textMuted: '#66728A',
  eyebrow: '#2E4F96',
  overlay: 'rgba(20, 30, 55, 0.55)',
  frameBg: '#EEF1F7',
  cardHoverBorder: '#B4C3E2',
  chipBorder: '#D6DEEE',
  outlineBorder: '#C9D4EA',
  heroBorder: '#DDE4F2',
  navText: '#56627C',
  navActiveBg: '#E9EEF8',
  navActiveText: '#223C77',
  pillBg: '#EDF1FA',
  pillText: '#223C77',
  completedBg: '#F3F6FB',
  completedBorder: '#CFD9EC',
  chatUser: '#223C77',
  chatAssistant: '#F1F3F8',
  tiles: ['#E9EEF8', '#EFEEFA', '#E8F3F8'],
  ownerChips: { me: '#223C77', unit: '#6756A7', hr: '#0E7490', it: '#4D7C0F', buddy: '#B45309' },
};

const darkColors: ThemeColors = {
  primary: '#7E9BE0',
  primaryHover: '#A3B8EC',
  primaryFg: '#FFFFFF',
  primarySoft: '#1C2640',
  secondary: '#9DB1E8',
  secondarySoft: '#1E2740',
  accent: '#F2B92E',
  accentSoft: '#3A2F12',
  success: '#4CC08C',
  successSoft: '#13301F',
  warning: '#F0A03C',
  warningSoft: '#3A2A12',
  danger: '#F07A4A',
  dangerSoft: '#3D1F14',
  info: '#9DB1E8',
  infoSoft: '#1E2740',
  infoCalloutBg: '#1A2133',
  infoCalloutBorder: '#7088C8',
  infoCalloutText: '#C9D3EA',
  bg: '#10131A',
  surface: '#171B25',
  surfaceAlt: '#1E2330',
  border: '#2B3245',
  text: '#ECEFF6',
  textMuted: '#9CA5BA',
  eyebrow: '#8FA9E6',
  overlay: 'rgba(0, 0, 0, 0.7)',
  frameBg: '#0B0D12',
  cardHoverBorder: '#3E5185',
  chipBorder: '#2F3A55',
  outlineBorder: '#3A4A70',
  heroBorder: '#26304A',
  navText: '#C3CADB',
  navActiveBg: '#1C2640',
  navActiveText: '#A9BEEE',
  pillBg: '#1C2640',
  pillText: '#A9BEEE',
  completedBg: '#172034',
  completedBorder: '#2B3A5C',
  chatUser: '#2F4F96',
  chatAssistant: '#1E2330',
  tiles: ['#1C2640', '#22243F', '#18282F'],
  ownerChips: { me: '#8FA9E6', unit: '#A595E0', hr: '#22B8CF', it: '#86B33A', buddy: '#F59E0B' },
};

export const palettes: Record<ColorScheme, ThemeColors> = { light: lightColors, dark: darkColors };

export const gradients: Record<ColorScheme, ThemeGradients> = {
  light: {
    brand: ['#2E4C91', '#1A2F5E'],
    progress: ['#4A6CB3', '#223C77'],
    hero: ['#EEF2FA', '#F4F6FB', '#F1F6FB'],
  },
  dark: {
    brand: ['#2E4C91', '#1A2F5E'],
    progress: ['#7E9BE0', '#4F6DB8'],
    hero: ['#18213A', '#141A2A'],
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
