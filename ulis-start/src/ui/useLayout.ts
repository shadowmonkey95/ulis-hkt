import { Platform, useWindowDimensions } from 'react-native';

/** Width breakpoints for the responsive web layout. Native phones always resolve to 'compact'. */
export const BREAKPOINTS = { medium: 768, wide: 1024 } as const;

/** Max width of the main content column on wide screens (sidebar excluded). */
export const CONTENT_MAX_WIDTH = 1200;

/** Width of the left sidebar navigation on medium/wide web. */
export const SIDEBAR_WIDTH = 248;

export type LayoutSize = 'compact' | 'medium' | 'wide';

export interface Layout {
  width: number;
  size: LayoutSize;
  /** true on phones / narrow windows: bottom tabs, single column (today's mobile layout). */
  isCompact: boolean;
  /** true when the sidebar replaces the bottom tabs (web, width ≥ 768). */
  hasSidebar: boolean;
  /** true when screens should use 2–3 columns (web, width ≥ 1024). */
  isWide: boolean;
}

/** Pure resolver – exported for tests. */
export function resolveLayout(width: number, os: typeof Platform.OS): Layout {
  const size: LayoutSize =
    os !== 'web' || width < BREAKPOINTS.medium ? 'compact' : width < BREAKPOINTS.wide ? 'medium' : 'wide';
  return {
    width,
    size,
    isCompact: size === 'compact',
    hasSidebar: size !== 'compact',
    isWide: size === 'wide',
  };
}

/**
 * Responsive layout hook. Native (Expo Go) is always 'compact', so the phone app is unchanged.
 * On web it follows the window width and re-renders on resize.
 */
export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  return resolveLayout(width, Platform.OS);
}
