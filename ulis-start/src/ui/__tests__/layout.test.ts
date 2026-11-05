import { columnsFor } from '../Columns';
import { BREAKPOINTS, resolveLayout } from '../useLayout';

describe('resolveLayout', () => {
  it('native is always compact, whatever the width', () => {
    for (const os of ['ios', 'android'] as const) {
      for (const w of [320, 800, 1440]) {
        expect(resolveLayout(w, os)).toMatchObject({ size: 'compact', isCompact: true, hasSidebar: false, isWide: false });
      }
    }
  });

  it('web below 768 is compact (phone column)', () => {
    expect(resolveLayout(430, 'web').size).toBe('compact');
    expect(resolveLayout(BREAKPOINTS.medium - 1, 'web').hasSidebar).toBe(false);
  });

  it('web 768–1023 is medium: sidebar, not wide', () => {
    expect(resolveLayout(BREAKPOINTS.medium, 'web')).toMatchObject({ size: 'medium', hasSidebar: true, isWide: false, isCompact: false });
    expect(resolveLayout(1023, 'web').size).toBe('medium');
  });

  it('web ≥1024 is wide', () => {
    expect(resolveLayout(BREAKPOINTS.wide, 'web')).toMatchObject({ size: 'wide', hasSidebar: true, isWide: true });
    expect(resolveLayout(1440, 'web').width).toBe(1440);
  });
});

describe('columnsFor', () => {
  it('fits as many min-width columns as possible, capped', () => {
    expect(columnsFor(0, 280, 16)).toBe(1);
    expect(columnsFor(500, 280, 16)).toBe(1);
    expect(columnsFor(576, 280, 16)).toBe(2);
    expect(columnsFor(1200, 280, 16)).toBe(4);
    expect(columnsFor(1200, 280, 16, 3)).toBe(3);
  });
});
