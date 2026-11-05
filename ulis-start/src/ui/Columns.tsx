import { Children, isValidElement, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useLayout } from './useLayout';

export interface ColumnsProps {
  children: ReactNode;
  /** Minimum column width in px; the number of columns follows the container width. */
  min?: number;
  /** Gap between items (both directions). */
  gap?: number;
  /** Upper bound on columns. */
  maxColumns?: number;
  /** Force N columns on compact (default 1 = today's phone layout). */
  compactColumns?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pure: how many columns of at least `min` fit in `width`. */
export function columnsFor(width: number, min: number, gap: number, maxColumns = 6): number {
  if (width <= 0) return 1;
  return Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (min + gap))));
}

/**
 * Responsive grid: 1 column on compact (phones, narrow web), N equal columns of ≥ `min` px on medium/wide.
 * Items keep their natural height (rows align to the top).
 */
export function Columns({ children, min = 280, gap = 16, maxColumns = 4, compactColumns = 1, style }: ColumnsProps) {
  const { isCompact } = useLayout();
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(Boolean);
  const cols = isCompact ? compactColumns : columnsFor(width, min, gap, maxColumns);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  if (cols <= 1) {
    return (
      <View style={[{ gap }, style]} onLayout={isCompact ? undefined : onLayout}>
        {items}
      </View>
    );
  }
  const itemWidth = width > 0 ? (width - gap * (cols - 1)) / cols : undefined;
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'flex-start' }, style]} onLayout={onLayout}>
      {items.map((child, i) => (
        <View key={isValidElement(child) && child.key !== null ? child.key : i} style={itemWidth ? { width: itemWidth } : { flexBasis: min, flexGrow: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}
